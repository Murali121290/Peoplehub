import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export interface EvaluationCheckOutPromptModalProps {
  isOpen: boolean;
  type?: 'employee_eval' | 'manager_metrics_setup';
  periodName: string;
  dueDateText?: string;
  isPreWeekoff?: boolean;
  canCheckOutAnyway?: boolean;
  onCompleteNow: () => void;
  onCheckOutAnyway: () => void;
  onClose: () => void;
}

export const EvaluationCheckOutPromptModal: React.FC<EvaluationCheckOutPromptModalProps> = ({
  isOpen,
  type = 'employee_eval',
  periodName,
  dueDateText = 'Today',
  canCheckOutAnyway = true,
  onCompleteNow,
  onCheckOutAnyway,
  onClose,
}) => {
  const isManagerSetup = type === 'manager_metrics_setup';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          {canCheckOutAnyway && (
            <Button variant="outline" onClick={onCheckOutAnyway}>
              Check Out Anyway
            </Button>
          )}
          <Button variant="primary" onClick={onCompleteNow} fullWidth={!canCheckOutAnyway}>
            {isManagerSetup ? 'Assign Team Metrics Now' : 'Complete Assessment Now'}
          </Button>
        </>
      }
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-xl p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
        aria-label="Close"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      <div className="flex gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-warning-50 text-warning-600">
          <ExclamationTriangleIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            {isManagerSetup ? 'Team Metrics Setup Pending' : 'Pending Self-Assessment'}
          </h3>
          <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
            {isManagerSetup
              ? !canCheckOutAnyway
                ? 'Deliverables must be assigned today before checking out.'
                : `Please configure and assign deliverables for your team for ${periodName} before the month ends.`
              : !canCheckOutAnyway
                ? 'Self-assessment must be submitted before checking out.'
                : `Please submit your ${periodName} self-assessment before the deadline.`}
          </p>

          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <span className="font-medium">Evaluation Cycle:</span>
              <span className="font-semibold text-neutral-900">{periodName}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span className="font-medium">Status:</span>
              <span className="font-bold text-amber-700">
                {dueDateText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};


