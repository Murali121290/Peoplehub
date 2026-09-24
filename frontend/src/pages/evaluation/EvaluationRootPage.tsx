import React from 'react';
import EvaluationTab from '../employee/tabs/EvaluationTab';

export const EvaluationRootPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <EvaluationTab />
    </div>
  );
};

export default EvaluationRootPage;
