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
                <strong className="text-blue-600">Blue suburb</strong> is your target. You have an allowance of{' '}
                <strong className="text-neutral-900">10 turns</strong> to reach your destination.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">2. Neighbour Selection at Every Turn</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                At every step, unvisited bordering neighbours of your current position are listed as selectable options in the sidebar and highlighted on the map in <strong className="text-emerald-600">soft green</strong>. Suburbs already in your path cannot be chosen again.
              </p>
              <p className="text-neutral-500 text-xs leading-relaxed mt-1.5 bg-blue-50/80 p-2 rounded-lg border border-blue-200/60 text-blue-900">
                <strong>Target Touch Finish:</strong> If a turn directly touches the target suburb, your route connects to finish the game without counting the target as an extra turn!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">3. Undo Last Move</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                If you encounter a dead end or wish to backtrack, tap the <strong>Undo</strong> button to go back one step.
              </p>
              <p className="text-neutral-500 text-xs leading-relaxed mt-1.5 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 text-amber-900">
                <strong>Turns not refunded:</strong> The Undo button steps back your current position, but any turns used remain counted toward your 10-turn limit.
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
              <h4 className="font-bold text-neutral-900 mb-0.5">5. Daily Challenge & Score Sharing</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Every day, all players receive the <strong>exact same daily puzzle</strong>. Upon finishing, share your scorecard (Wordle-style) with your emoji step trail!
              </p>
            </div>
          </div>

          <div className="bg-neutral-100 border border-neutral-200 p-3 rounded-xl text-xs text-neutral-800">
            <strong className="text-neutral-900">Rule:</strong> You are allowed up to <strong>10 turns</strong> to connect the start and target suburbs.
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
