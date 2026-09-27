import React, { Suspense } from 'react';
import EvaluationTab from '../employee/tabs/EvaluationTab';
import { BookLoader } from '../../components/ui/Spinner';

export const EvaluationRootPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <Suspense fallback={<BookLoader />}>
        <EvaluationTab />
      </Suspense>
    </div>
  );
};

export default EvaluationRootPage;
