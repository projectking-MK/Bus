import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertTriangle, RefreshCw, KeyRound } from 'lucide-react';

export const QRScanner = ({ onScanSuccess, scanning = true }) => {
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const html5QrCodeRef = useRef(null);
  const isRunningRef = useRef(false);

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
            // Ignore frame parse errors (expected when searching for QR)
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
              ? 'Camera permission denied. Please allow camera access in browser permissions.'
              : 'Could not access device camera (in use, unsupported, or restricted context).'
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

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      onScanSuccess(manualToken.trim());
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
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
            <button
              onClick={() => setShowManualInput(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
            >
              Use Token Input / Test Mode
            </button>
          </div>
        )}
      </div>

      {/* Manual Token Fallback for testing / camera blocked environments */}
      <div className="w-full mt-4">
        {!showManualInput ? (
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center mx-auto space-x-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Trouble scanning? Click for manual token input</span>
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter Current QR Token
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste active token..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
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
