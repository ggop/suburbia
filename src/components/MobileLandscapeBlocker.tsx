import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const MobileLandscapeBlocker: React.FC = () => {
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    // Attempt screen orientation lock on mobile devices supporting the API
    if (typeof window !== 'undefined' && window.screen?.orientation) {
      try {
        const orientation = window.screen.orientation as unknown as {
          lock?: (orientation: string) => Promise<void>;
        };
        if (typeof orientation.lock === 'function') {
          orientation.lock('portrait-primary')
            .catch(() => {
              orientation.lock?.('portrait').catch(() => {});
            });
        }
      } catch {
        // Ignored if not permitted by browser context
      }
    }

    const checkOrientation = () => {
      if (typeof window === 'undefined') return;

      const isLandscape = window.innerWidth > window.innerHeight;
      const isShortHeight = window.innerHeight <= 550;
      const isTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      const isMobileUA = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent);

      // Phone in landscape mode
      const phoneLandscape =
        isLandscape && (isShortHeight || (isTouch && window.innerHeight <= 620) || isMobileUA);

      setIsMobileLandscape(phoneLandscape);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia('(orientation: landscape)');
      mql.addEventListener('change', checkOrientation);
    } catch {
      // Fallback for older browsers
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (mql) {
        try {
          mql.removeEventListener('change', checkOrientation);
        } catch {}
      }
    };
  }, []);

  return (
    <div
      id="mobile-landscape-blocker-root"
      className={`${
        isMobileLandscape ? 'flex' : 'hidden'
      } fixed inset-0 z-500 bg-neutral-950/95 backdrop-blur-md flex-col items-center justify-center p-6 text-white text-center select-none animate-fade-in`}
      style={{
        // Ensure it always covers the full visual viewport on mobile with dynamic toolbars
        width: '100vw',
        height: '100dvh',
      }}
    >
      <div className="relative mb-5 flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-700/80 flex items-center justify-center shadow-xl">
          <Smartphone className="w-8 h-8 text-neutral-300" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md animate-bounce">
          <RotateCw className="w-4 h-4" />
        </div>
      </div>

      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2">
        Portrait Mode Only
      </h2>

      <p className="text-xs sm:text-sm text-neutral-300 max-w-xs leading-relaxed mb-4">
        Please rotate your phone back to portrait to continue playing Suburbia.
      </p>

      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-3 py-1.5 rounded-full">
        <span>Map layout locked to portrait</span>
      </div>
    </div>
  );
};
