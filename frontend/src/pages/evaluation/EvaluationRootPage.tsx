import React from 'react';
import EvaluationTab from '../employee/tabs/EvaluationTab';

export const EvaluationRootPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <EvaluationTab />
    </div>
  );
};

export default EvaluationRootPage;
