import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertTriangle, RefreshCw, KeyRound, Image, Upload } from 'lucide-react';

export const QRScanner = ({ onScanSuccess, scanning = true }) => {
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [fileScanning, setFileScanning] = useState(false);
  const [fileError, setFileError] = useState(null);

  const html5QrCodeRef = useRef(null);
  const fileDecoderRef = useRef(null);
  const isRunningRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const elementId = 'reader-viewport';

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsInitializing(true);

        const viewportEl = document.getElementById(elementId);
        if (!viewportEl) {
          console.warn('[QRScanner] reader-viewport element not in DOM');
          return;
        }

        const qrScanner = new Html5Qrcode(elementId);
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Try environment camera first (rear on mobile), fallback to user (webcam/front)
        try {
          await qrScanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (isMounted && scanning) {
                onScanSuccess(decodedText);
              }
            },
            () => {}
          );
        } catch (camErr) {
          console.warn('[QR Scanner: rear camera failed, trying front/default camera]', camErr);
          await qrScanner.start(
            { facingMode: 'user' },
            config,
            (decodedText) => {
              if (isMounted && scanning) {
                onScanSuccess(decodedText);
              }
            },
            () => {}
          );
        }

        if (isMounted) {
          isRunningRef.current = true;
          setIsInitializing(false);
        }
      } catch (err) {
        console.warn('[QR Scanner Init Warning]', err);
        if (isMounted) {
          setIsInitializing(false);
          setCameraError(
            err.name === 'NotAllowedError' || err.message?.includes('Permission')
              ? 'Camera permission denied. Please allow camera access in browser permissions, or select the QR image received from the driver below.'
              : 'Could not access device camera. You can upload the QR image sent by the driver or enter the token manually.'
          );
        }
      }
    };

    if (scanning) {
      startScanner();
    }

    return () => {
      isMounted = false;
      const scanner = html5QrCodeRef.current;
      if (scanner) {
        if (isRunningRef.current) {
          scanner
            .stop()
            .catch((err) => console.warn('Error stopping scanner:', err))
            .finally(() => {
              isRunningRef.current = false;
              try { scanner.clear(); } catch (_) {}
            });
        } else {
          try { scanner.clear(); } catch (_) {}
        }
      }
    };
  }, [scanning]);

  // File upload QR decoding
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanning(true);
    setFileError(null);

    try {
      if (!fileDecoderRef.current) {
        fileDecoderRef.current = new Html5Qrcode('qr-file-decoder-target');
      }

      const decodedText = await fileDecoderRef.current.scanFile(file, false);
      if (decodedText) {
        onScanSuccess(decodedText);
      } else {
        setFileError('Could not find a valid QR code in this image.');
      }
    } catch (err) {
      console.warn('File decode error:', err);
      setFileError('Could not decode QR code from this image. Please ensure the QR is clear and not expired.');
    } finally {
      setFileScanning(false);
      // Reset input value so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      onScanSuccess(manualToken.trim());
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      {/* Hidden container for file decoder */}
      <div id="qr-file-decoder-target" className="sr-only"></div>

      {/* Scanner Viewport Box */}
      {/* Scanner Viewport */}
      <div className="relative w-full aspect-square bg-[#020B07] rounded-3xl overflow-hidden shadow-[0_0_35px_rgba(250,204,21,0.25)] border-2 border-yellow-400/80">
        <div id="reader-viewport" className="w-full h-full"></div>

        {/* Targeting Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-56 h-56 border-2 border-yellow-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(250,204,21,0.3)]">
            {/* Animated scanning beam */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent animate-pulse shadow-[0_0_10px_#a3e635]"></div>
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg shadow-[0_0_10px_#facc15]"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg shadow-[0_0_10px_#facc15]"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg shadow-[0_0_10px_#facc15]"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-lg shadow-[0_0_10px_#facc15]"></div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isInitializing && (
          <div className="absolute inset-0 bg-[#020B07]/95 flex flex-col items-center justify-center text-white space-y-2 z-10">
            <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-yellow-300">Accessing mobile camera sensor...</p>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-[#020B07]/98 flex flex-col items-center justify-center p-6 text-center text-white z-20">
            <AlertTriangle className="w-10 h-10 text-yellow-400 mb-2" />
            <p className="text-xs font-semibold text-slate-300 mb-4">{cameraError}</p>
            <div className="flex flex-col gap-2 w-full max-w-[220px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-gradient-to-r from-yellow-400 via-lime-300 to-yellow-400 hover:from-yellow-300 hover:to-lime-200 text-slate-950 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(250,204,21,0.4)] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR from Gallery</span>
              </button>
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="px-3 py-1.5 bg-[#071911] border border-emerald-500/40 hover:border-yellow-400 text-emerald-300 hover:text-yellow-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Enter Token Manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload QR Image from Gallery / WhatsApp Option */}
      <div className="w-full mt-4 flex flex-col items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={fileScanning}
          className="w-full py-2.5 px-4 bg-[#071911] hover:bg-[#0C2419] text-emerald-300 hover:text-yellow-300 border-2 border-emerald-500/50 hover:border-yellow-400 rounded-2xl text-xs font-black transition flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer"
        >
          <Upload className="w-4 h-4 text-yellow-400" />
          <span>{fileScanning ? 'Decoding Image...' : 'Upload QR from Gallery / WhatsApp'}</span>
        </button>

        {fileError && (
          <div className="w-full p-2.5 bg-[#2D0B14] border border-rose-500/80 rounded-xl text-rose-200 text-[11px] text-center">
            {fileError}
          </div>
        )}

        {/* Manual Token Fallback */}
        {!showManualInput ? (
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            className="text-[11px] text-emerald-400/80 hover:text-yellow-300 font-semibold flex items-center justify-center space-x-1 mt-1 cursor-pointer"
          >
            <KeyRound className="w-3 h-3 text-yellow-400" />
            <span>Have a text token? Click for manual entry</span>
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="w-full bg-[#071911] p-3 rounded-2xl border-2 border-emerald-500/40 mt-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-1">
              Enter Active QR Token
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste active token..."
                className="flex-1 px-3 py-1.5 text-xs bg-[#020B07] border border-emerald-500/40 text-yellow-300 rounded-xl focus:outline-none focus:border-yellow-400 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-lime-300 text-slate-950 text-xs font-black rounded-xl hover:from-yellow-300 hover:to-lime-200 transition cursor-pointer"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
