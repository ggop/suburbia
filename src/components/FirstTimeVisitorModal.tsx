import React from 'react';
import { HelpCircle, ArrowRight, Play } from 'lucide-react';

interface FirstTimeVisitorModalProps {
  isOpen: boolean;
  onShowRules: () => void;
  onSkip: () => void;
}

export const FirstTimeVisitorModal: React.FC<FirstTimeVisitorModalProps> = ({
  isOpen,
  onShowRules,
  onSkip,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="first-time-visitor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in text-neutral-900 select-none"
    >
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
          <HelpCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold tracking-tight text-neutral-900">
            First Time Playing?
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
            Welcome to Suburb Connect! Would you like a quick walkthrough of the rules and how to navigate between bordering suburbs?
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-2">
          <button
            id="accept-rules-offer-button"
            onClick={onShowRules}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Show Me the Rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            id="decline-rules-offer-button"
            onClick={onSkip}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Skip & Play</span>
            <Play className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
