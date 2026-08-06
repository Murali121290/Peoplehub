import React from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Modal } from './Modal';
import { Button } from '../Button/Button';
import { cn } from '../utils/cn';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  description?: string;
  variant?: ConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const variantMeta: Record<ConfirmDialogVariant, { icon: React.ElementType; iconClass: string; bgClass: string; buttonVariant: 'danger' | 'primary' }> = {
  danger: { icon: ExclamationTriangleIcon, iconClass: 'text-danger-600', bgClass: 'bg-danger-50', buttonVariant: 'danger' },
  warning: { icon: ExclamationTriangleIcon, iconClass: 'text-warning-600', bgClass: 'bg-warning-50', buttonVariant: 'danger' },
  info: { icon: InformationCircleIcon, iconClass: 'text-primary-600', bgClass: 'bg-primary-50', buttonVariant: 'primary' },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  description,
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { icon: Icon, iconClass, bgClass, buttonVariant } = variantMeta[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={buttonVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', bgClass)}>
          <Icon className={cn('h-5 w-5', iconClass)} />
        </div>
        <div>
          <h3 className="text-base font-bold text-black">{title}</h3>
          <p className="mt-1.5 text-sm text-neutral-900">{message}</p>
          {description && <p className="mt-1 text-xs text-neutral-700">{description}</p>}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
