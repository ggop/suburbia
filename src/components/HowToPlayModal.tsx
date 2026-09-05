import React from 'react';
import { X, Flag, Navigation, CheckCircle2, Touchpad, HelpCircle, Calendar } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="how-to-play-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-neutral-900 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-neutral-800" />
            <h3 className="text-lg font-bold text-neutral-900">How to Play</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs sm:text-sm text-neutral-600">
          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">1. Start and Target Suburbs</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                The <strong className="text-red-600">Red suburb</strong> is your start point, and the{' '}
                <strong className="text-blue-600">Blue suburb</strong> is your target. Problems require between <strong>5 and 8 steps</strong>:
                <span className="block mt-1 text-[11px] text-neutral-600">
                  • <strong>Easy</strong>: 5 steps &nbsp;|&nbsp; <strong>Medium</strong>: 6–7 steps &nbsp;|&nbsp; <strong>Hard</strong>: 8 steps
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">2. Flexible Guessing & Navigation</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                At each turn, you can guess <strong>any suburb anywhere across Melbourne</strong>. If a guess happens to be on the optimal shortest path, it is shaded in{' '}
                <strong className="text-emerald-600">Green</strong> (even if not neighbouring yet!). Bordering suburbs connect and advance your route. Guesses off the optimal route show distance feedback in{' '}
                <strong className="text-amber-600">Amber</strong>. While playing, suburb names appear on hover or tap.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">3. Typing-Only Navigation & Hints</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                All path suburbs must be selected by typing their name in the input box. Map clicking is disabled.
                After <strong>two consecutive incorrect guesses</strong>, a hint will offer all neighboring suburbs for only that step.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
              <Touchpad className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">4. Suburb Stats & Post-Game Tooltips</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                During play, path suburbs show details on hover. After the game ends, tooltips are unlocked for <strong>all suburbs</strong> across Melbourne, showing estimated population, area (km²), established period/decade, and notable historical facts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">5. Daily Challenge & Compare Routes</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Every day, all players worldwide receive the <strong>exact same puzzle</strong>. Upon finishing, share your scorecard (Wordle-style) or copy your route code to compare path lengths and turn counts directly with friends!
              </p>
            </div>
          </div>

          <div className="bg-neutral-100 border border-neutral-200 p-3 rounded-xl text-xs text-neutral-800">
            <strong className="text-neutral-900">Rule:</strong> Each puzzle can be solved in <strong>5 to 8 steps</strong>. You have an allowance of <strong>9 to 13 steps</strong> before the game ends on its own. Try to match the optimal shortest path!
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-black hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-colors active:scale-95"
        >
          Got It, Let's Play
        </button>
      </div>
    </div>
  );
};
