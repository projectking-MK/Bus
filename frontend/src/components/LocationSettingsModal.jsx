import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Settings,
  Smartphone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { openDeviceLocationSettings } from '../utils/geolocation';

export const LocationSettingsModal = ({
  isOpen,
  onClose,
  onValidate,
  isValidating,
  validationError,
}) => {
  const [deviceType, setDeviceType] = useState('android');
  const [autoCheckCount, setAutoCheckCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/iphone|ipad|ipod/i.test(ua)) {
        setDeviceType('ios');
      } else if (/android/i.test(ua)) {
        setDeviceType('android');
      } else {
        setDeviceType('other');
      }
    }
  }, []);

  // Automatic verification when the student returns from phone settings / quick settings
  useEffect(() => {
    if (!isOpen) return;

    const handleReturnToTab = () => {
      if (!document.hidden) {
        setAutoCheckCount((prev) => prev + 1);
        if (onValidate && !isValidating) {
          onValidate();
        }
      }
    };

    window.addEventListener('focus', handleReturnToTab);
    document.addEventListener('visibilitychange', handleReturnToTab);

    return () => {
      window.removeEventListener('focus', handleReturnToTab);
      document.removeEventListener('visibilitychange', handleReturnToTab);
    };
  }, [isOpen, onValidate, isValidating]);

  if (!isOpen) return null;

  const handleOpenSettingsClick = () => {
    openDeviceLocationSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Navigation className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  GPS Configuration
                </span>
                <span className="text-[10px] bg-rose-800/80 px-2 py-0.5 rounded-full font-bold">
                  {deviceType === 'android' ? 'Android' : deviceType === 'ios' ? 'iPhone / iOS' : 'Browser'}
                </span>
              </div>
              <h3 className="text-base font-bold mt-0.5">Turn On Phone Location & GPS</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-600">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950">Location is Currently Turned OFF</p>
              <p className="text-rose-800 mt-0.5 leading-relaxed">
                College bus security mandates real-time GPS coordinates to verify your physical presence inside the bus. Follow the steps below to turn on device location.
              </p>
            </div>
          </div>

          {/* Device Specific Step-by-Step Instructions */}
          {deviceType === 'android' ? (
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Quick Instructions for Android Phones:</span>
              </h4>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-800">Swipe down twice</strong> from the top of your phone screen to expand your <strong>Quick Settings</strong> panel.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Find the <strong>Location / GPS icon</strong> (📍) and tap it to turn it <strong>ON</strong> (icon turns blue or highlighted).
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Or go to <strong>Settings ⚙️ &rarr; Location</strong> and toggle <strong>Use location</strong> to <strong>ON</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    If Chrome asks for location permission, tap <strong>"While using the app"</strong> or tap the <strong>Tune / Lock icon 🔒</strong> in the browser address bar.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 bg-indigo-50/60 p-2 rounded-xl border border-indigo-100">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-emerald-900">For Low GPS Accuracy fix:</strong> Go to <strong>Settings ⚙️ &rarr; Location &rarr; Location Services</strong> and toggle <strong>Google Location Accuracy</strong> (or Wi-Fi scanning) to <strong>ON</strong>.
                  </div>
                </div>
              </div>
            </div>
          ) : deviceType === 'ios' ? (
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Instructions for iPhone / iPad (iOS):</span>
              </h4>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Open your iPhone <strong>Settings ⚙️</strong> app.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Tap <strong>Privacy & Security</strong> &rarr; <strong>Location Services</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Toggle <strong>Location Services</strong> to <strong>ON</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    Scroll down to <strong>Safari Websites</strong> and select <strong>"While Using the App"</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 bg-indigo-50/60 p-2 rounded-xl border border-indigo-100">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-emerald-900">For Low GPS Accuracy fix:</strong> Under Safari Websites, ensure the <strong>"Precise Location"</strong> toggle switch is <strong>ON (green)</strong>.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
              <p className="font-semibold text-slate-800">To enable location in your browser:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Click the <strong>Lock 🔒 / Settings</strong> icon beside the URL in the address bar.</li>
                <li>Set <strong>Location</strong> permission to <strong>Allow</strong>.</li>
                <li>Ensure device location services are enabled in your operating system.</li>
              </ul>
            </div>
          )}

          {/* Auto-detect notification */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 flex items-center space-x-2 text-indigo-900 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0"></span>
            <span>
              <strong>Auto-Validation Active:</strong> When you switch back to this tab after enabling Location, we will automatically check and validate your GPS.
            </span>
          </div>

          {/* Validation error display */}
          {validationError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            onClick={handleOpenSettingsClick}
            type="button"
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Open Phone Settings</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition cursor-pointer text-center"
            >
              Close
            </button>
            <button
              onClick={onValidate}
              disabled={isValidating}
              type="button"
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md shadow-indigo-200 cursor-pointer"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validate Location Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
