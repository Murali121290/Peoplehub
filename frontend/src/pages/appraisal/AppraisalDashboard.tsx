import React from "react";

const AppraisalDashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-850">Performance Appraisal</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Track achievements, submit appraisals, and review team performance.
          </p>
        </div>
      </div>

      {/* In Processing Banner */}
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-white rounded-2xl border border-neutral-200 shadow-sm px-8 py-16 text-center">

        {/* Animated gear / spinner icon */}
        <div className="relative flex items-center justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-primary-50 border-2 border-primary-200 flex items-center justify-center shadow-sm">
            <svg
              className="w-12 h-12 text-primary-600 animate-spin"
              style={{ animationDuration: "3s" }}
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.33-1.82c.21-.16.27-.45.13-.68l-2.2-3.82a.5.5 0 0 0-.65-.22l-2.75 1.1c-.57-.44-1.18-.8-1.86-1.07L14.06 2.1A.49.49 0 0 0 13.58 2h-3.17c-.24 0-.44.17-.49.4l-.41 2.93c-.68.27-1.29.63-1.86 1.07l-2.75-1.1a.5.5 0 0 0-.65.22L2.04 9.34a.49.49 0 0 0 .13.68l2.33 1.82c-.04.34-.07.69-.07 1.08 0 .39.03.74.07 1.08L2.17 15.82a.49.49 0 0 0-.13.68l2.2 3.82c.13.23.42.3.65.22l2.75-1.1c.57.44 1.18.8 1.86 1.07l.41 2.93c.05.23.25.4.49.4h3.17c.24 0 .44-.17.49-.4l.41-2.93c.68-.27 1.29-.63 1.86-1.07l2.75 1.1c.23.08.52.01.65-.22l2.2-3.82a.49.49 0 0 0-.13-.68l-2.33-1.82Z"
                fill="currentColor"
              />
            </svg>
          </div>
          {/* Pulsing outer ring */}
          <span className="absolute w-28 h-28 rounded-full border-2 border-primary-300 animate-ping opacity-30" />
        </div>

        {/* Label */}
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-5 py-2 mb-5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-extrabold text-amber-700 uppercase tracking-widest">
            In Processing
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-neutral-850 mb-3">
          Appraisal System is Being Set Up
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-neutral-500 leading-relaxed max-w-md">
          Our HR team is currently configuring the Performance Appraisal module.
          Once it's live, you'll be able to track achievements, submit appraisals,
          and review team performance right here.
        </p>

        {/* Divider */}
        <div className="h-px w-32 bg-neutral-200 my-7" />

        {/* Info note */}
        <p className="text-xs text-neutral-400 font-semibold">
          For appraisal-related queries, please reach out to your HR team directly.
        </p>
      </div>
    </div>
  );
};

export default AppraisalDashboard;