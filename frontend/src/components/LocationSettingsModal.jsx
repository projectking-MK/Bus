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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#071911] rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.2)] max-w-lg w-full overflow-hidden border-2 border-emerald-500/50 flex flex-col max-h-[90vh] relative">
        {/* Top Glowing Laser Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-lime-300 to-emerald-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]"></div>

        {/* Header */}
        <div className="bg-[#040E0A] p-5 text-white flex items-center justify-between border-b border-emerald-500/25">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#071911] border-2 border-yellow-400/80 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              <Navigation className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded-full">
                  GPS Configuration
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                  {deviceType === 'android' ? 'Android' : deviceType === 'ios' ? 'iPhone / iOS' : 'Browser'}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">Turn On Phone Location & GPS</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          <div className="bg-[#2D0B14] border-2 border-rose-500/70 rounded-2xl p-3.5 flex items-start space-x-3 text-rose-200 shadow-md">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Location is Currently Turned OFF</p>
              <p className="text-rose-300 mt-0.5 leading-relaxed">
                College bus security mandates real-time GPS coordinates to verify your physical presence inside the bus. Follow the steps below to turn on device location.
              </p>
            </div>
          </div>

          {/* Device Specific Step-by-Step Instructions */}
          {deviceType === 'android' ? (
            <div className="space-y-2.5">
              <h4 className="font-bold text-yellow-400 uppercase tracking-wider text-[11px] flex items-center space-x-1.5 font-mono">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Quick Instructions for Android Phones:</span>
              </h4>

              <div className="bg-[#020B07] border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5 text-slate-300">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white">Swipe down twice</strong> from the top of your phone screen to expand your <strong className="text-yellow-300">Quick Settings</strong> panel.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Find the <strong className="text-yellow-300">Location / GPS icon</strong> (📍) and tap it to turn it <strong className="text-emerald-400">ON</strong> (icon turns highlighted).
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Or go to <strong className="text-white">Settings ⚙️ &rarr; Location</strong> and toggle <strong className="text-emerald-400">Use location</strong> to <strong className="text-emerald-400">ON</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    If Chrome asks for location permission, tap <strong className="text-white">"While using the app"</strong> or tap the <strong className="text-white">Tune / Lock icon 🔒</strong> in the browser address bar.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 bg-[#03150D] p-2.5 rounded-xl border border-emerald-500/40">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-emerald-300">For Low GPS Accuracy fix:</strong> Go to <strong className="text-white">Settings ⚙️ &rarr; Location &rarr; Location Services</strong> and toggle <strong className="text-yellow-300">Google Location Accuracy</strong> (or Wi-Fi scanning) to <strong className="text-emerald-300">ON</strong>.
                  </div>
                </div>
              </div>
            </div>
          ) : deviceType === 'ios' ? (
            <div className="space-y-2.5">
              <h4 className="font-bold text-yellow-400 uppercase tracking-wider text-[11px] flex items-center space-x-1.5 font-mono">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Instructions for iPhone / iPad (iOS):</span>
              </h4>

              <div className="bg-[#020B07] border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5 text-slate-300">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Open your iPhone <strong className="text-white">Settings ⚙️</strong> app.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Tap <strong className="text-white">Privacy & Security</strong> &rarr; <strong className="text-yellow-300">Location Services</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Toggle <strong className="text-emerald-400">Location Services</strong> to <strong className="text-emerald-400">ON</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-lime-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    Scroll down to <strong className="text-white">Safari Websites</strong> and select <strong className="text-emerald-400">"While Using the App"</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 bg-[#03150D] p-2.5 rounded-xl border border-emerald-500/40">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-emerald-300">For Low GPS Accuracy fix:</strong> Under Safari Websites, ensure the <strong className="text-yellow-300">"Precise Location"</strong> toggle switch is <strong className="text-emerald-300">ON (green)</strong>.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#020B07] border border-emerald-500/30 rounded-2xl p-3.5 space-y-2 text-slate-300">
              <p className="font-semibold text-white">To enable location in your browser:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Click the <strong className="text-white">Lock 🔒 / Settings</strong> icon beside the URL in the address bar.</li>
                <li>Set <strong className="text-emerald-400">Location</strong> permission to <strong className="text-emerald-400">Allow</strong>.</li>
                <li>Ensure device location services are enabled in your operating system.</li>
              </ul>
            </div>
          )}

          {/* Auto-detect notification */}
          <div className="bg-[#03150D] border border-emerald-500/40 rounded-2xl p-3 flex items-center space-x-2 text-emerald-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></span>
            <span>
              <strong className="text-yellow-300">Auto-Validation Active:</strong> When you switch back to this tab after enabling Location, we will automatically check and validate your GPS.
            </span>
          </div>

          {/* Validation error display */}
          {validationError && (
            <div className="p-3 bg-[#2D0B14] border border-rose-500/60 rounded-2xl text-[11px] text-rose-200 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#040E0A] border-t border-emerald-500/25 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            onClick={handleOpenSettingsClick}
            type="button"
            className="px-4 py-2.5 bg-[#020B07] hover:bg-[#061B12] border border-emerald-500/40 hover:border-yellow-400 text-yellow-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-yellow-400" />
            <span>Open Phone Settings</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-emerald-500/30 hover:bg-[#071911] text-slate-400 hover:text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer text-center"
            >
              Close
            </button>
            <button
              onClick={onValidate}
              disabled={isValidating}
              type="button"
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-yellow-400 via-lime-300 to-yellow-400 hover:from-yellow-300 hover:to-lime-200 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-[0_0_20px_rgba(250,204,21,0.4)] cursor-pointer"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
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
