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

        const qrScanner = new Html5Qrcode(elementId);
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await qrScanner.start(
          { facingMode: 'environment' }, // Prefer rear mobile camera
          config,
          (decodedText) => {
            if (isMounted && scanning) {
              onScanSuccess(decodedText);
            }
          },
          (errorMessage) => {
            // Frame search error (normal)
          }
        );

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
      if (html5QrCodeRef.current && isRunningRef.current) {
        html5QrCodeRef.current
          .stop()
          .catch((err) => console.warn('Error stopping scanner:', err))
          .finally(() => {
            isRunningRef.current = false;
          });
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
      <div id="qr-file-decoder-target" style={{ display: 'none' }}></div>

      {/* Scanner Viewport Box */}
      <div className="relative w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
        <div id="reader-viewport" className="w-full h-full"></div>

        {/* Targeting Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-56 h-56 border-2 border-indigo-400/80 rounded-2xl relative">
            {/* Animated scanning beam */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse"></div>
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white space-y-2 z-10">
            <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium">Accessing mobile camera...</p>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white z-20">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
            <p className="text-xs font-semibold text-slate-200 mb-4">{cameraError}</p>
            <div className="flex flex-col gap-2 w-full max-w-[220px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR from Gallery</span>
              </button>
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-medium transition"
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
          className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
        >
          <Upload className="w-4 h-4 text-emerald-600" />
          <span>{fileScanning ? 'Scanning Image...' : 'Upload QR from Gallery / WhatsApp'}</span>
        </button>

        {fileError && (
          <div className="w-full p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] text-center">
            {fileError}
          </div>
        )}

        {/* Manual Token Fallback */}
        {!showManualInput ? (
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            className="text-[11px] text-slate-500 hover:text-indigo-600 font-medium flex items-center justify-center space-x-1 mt-1"
          >
            <KeyRound className="w-3 h-3" />
            <span>Have a text token? Click for manual entry</span>
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 mt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter 3-Minute QR Token
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste active token..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition"
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
