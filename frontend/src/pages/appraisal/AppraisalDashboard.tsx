import React from "react";
import {
  SparklesIcon,
  TrophyIcon,
  ChartBarIcon,
  UserIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const AppraisalDashboard: React.FC = () => {
  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8 bg-white/80 backdrop-blur-xl border border-indigo-100 p-8 md:p-12 rounded-3xl shadow-xl shadow-indigo-100/50">
        
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold uppercase tracking-wider shadow-sm animate-pulse">
          <SparklesIcon className="w-4 h-4 text-indigo-600" />
          <span>Annual Performance Appraisal System</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-300">
            <TrophyIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Coming Soon
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto font-medium">
            We are crafting an elevated, intuitive performance appraisal experience to seamlessly track goals, self-evaluations, and manager reviews.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-indigo-200 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
              <UserIcon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Self Evaluation</h3>
            <p className="text-xs text-slate-500 mt-1">Structured questions to highlight key achievements and growth goals.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-purple-200 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Manager Reviews</h3>
            <p className="text-xs text-slate-500 mt-1">Transparent scorecards, constructive feedback, and progress tracking.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-emerald-200 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <ClockIcon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Cycle Timeline</h3>
            <p className="text-xs text-slate-500 mt-1">Automated deadline tracking and appraisal history archives.</p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-xs font-semibold text-slate-400">
          Expected Launch: Next Appraisal Cycle 🚀
        </div>
      </div>
    </div>
  );
};

export default AppraisalDashboard;