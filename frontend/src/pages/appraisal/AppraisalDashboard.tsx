import React from "react";
import {
  ClipboardDocumentCheckIcon,
  UserIcon,
  ChartBarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const AppraisalDashboard: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-neutral-50/50">
      <div className="max-w-2xl w-full text-center space-y-6 bg-white border border-neutral-200 p-8 md:p-12 rounded-2xl shadow-xs">
        
        {/* Simple Minimal Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center border border-primary-500/20">
          <ClipboardDocumentCheckIcon className="w-7 h-7" />
        </div>

        {/* Header Content */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold border border-neutral-200 uppercase tracking-wider">
            Coming Soon
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
            Performance Appraisal System
          </h1>
          <p className="text-sm text-neutral-500 max-w-md mx-auto font-medium leading-relaxed">
            We are building a simple and transparent appraisal module to easily manage self-evaluations, manager reviews, and goal tracking.
          </p>
        </div>

        {/* Feature List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
          <div className="p-4 rounded-xl bg-white border border-neutral-200 text-left">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center mb-2.5">
              <UserIcon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-neutral-800 text-xs">Self Evaluation</h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">Structured questions to record achievements and growth goals.</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-neutral-200 text-left">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center mb-2.5">
              <ChartBarIcon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-neutral-800 text-xs">Manager Reviews</h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">Transparent feedback and objective performance scorecards.</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-neutral-200 text-left">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center mb-2.5">
              <ClockIcon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-neutral-800 text-xs">Timeline & History</h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">Automated deadline tracking and appraisal record archives.</p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-xs font-semibold text-neutral-400 border-t border-neutral-100">
          Scheduled for upcoming appraisal cycle
        </div>
      </div>
    </div>
  );
};

export default AppraisalDashboard;