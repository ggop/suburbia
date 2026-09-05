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
              <h4 className="font-bold text-neutral-900 mb-0.5">2. Neighbour Selection at Every Turn</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                At every step, unvisited bordering neighbours of your current position are listed as selectable options in the sidebar and highlighted on the map in <strong className="text-emerald-600">soft green</strong>. Suburbs already in your path cannot be chosen again.
              </p>
              <p className="text-neutral-500 text-xs leading-relaxed mt-1.5 bg-blue-50/80 p-2 rounded-lg border border-blue-200/60 text-blue-900">
                <strong>Automatic Target Finish:</strong> When your current position borders the target suburb, it is automatically chosen to complete your route and end the game!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-0.5">3. Branching from Earlier Suburbs</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                If you find yourself moving away from the target, you can click any suburb already in your path (either in the sidebar path list or directly on the map) to continue from that point.
              </p>
              <p className="text-neutral-500 text-xs leading-relaxed mt-1.5 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60 text-emerald-900">
                <strong>Turn count preserved:</strong> Branching allows you to explore alternate paths without losing your recorded progress, but no turns are refunded.
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
