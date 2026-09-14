import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  SparklesIcon, 
  XMarkIcon, 
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon
} from "@heroicons/react/24/outline";

interface EvaluationCheckOutPromptModalProps {
  isOpen: boolean;
  periodName: string;
  dueDateText?: string;
  isPreWeekoff?: boolean;
  onCompleteNow: () => void;
  onCheckOutAnyway: () => void;
  onClose: () => void;
}

export const EvaluationCheckOutPromptModal: React.FC<EvaluationCheckOutPromptModalProps> = ({
  isOpen,
  periodName,
  dueDateText = "Today",
  isPreWeekoff = false,
  onCompleteNow,
  onCheckOutAnyway,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-900/20 w-full max-w-lg overflow-hidden flex flex-col relative"
        >
          {/* Top Amber Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500" />

          {/* Header Section */}
          <div className="p-6 pb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs flex-shrink-0">
                  <ClipboardDocumentCheckIcon className="w-6 h-6" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-600">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                  <span>Action Required Before Checkout</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Pending Self-Assessment
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {isPreWeekoff
                    ? "Your weekly evaluation is due prior to the upcoming weekend."
                    : "Your deliverable self-evaluation is due for submission today."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body Section */}
          <div className="px-6 pb-6 space-y-4">
            {/* Details Box */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                  Evaluation Cycle:
                </span>
                <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs truncate max-w-[240px]">
                  {periodName}
                </span>
              </div>

              <div className="h-px bg-slate-200/60" />

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 text-slate-400" />
                  Deadline Status:
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {isPreWeekoff ? "Pre-Weekoff Workday Checkout" : `Due ${dueDateText}`}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Submitting your self-actuals before checking out ensures your reporting manager receives your deliverable performance scores on schedule.
            </p>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={onCompleteNow}
                className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-100" />
                <span>Complete Assessment Now</span>
                <ArrowRightIcon className="w-3.5 h-3.5 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onCheckOutAnyway}
                className="w-full sm:w-auto py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
              >
                Check Out Anyway
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
