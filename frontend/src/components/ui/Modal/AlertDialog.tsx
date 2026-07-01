import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

export type AlertDialogType = 'success' | 'error' | 'warning' | 'info';

export interface AlertDialogProps {
  isOpen: boolean;
  type: AlertDialogType;
  title: string;
  message?: string;
  autoCloseMs?: number;
  onClose: () => void;
}

const typeMeta: Record<AlertDialogType, { icon: React.ElementType; iconClass: string; bgClass: string }> = {
  success: { icon: CheckCircleIcon, iconClass: 'text-success-600', bgClass: 'bg-success-50' },
  error: { icon: XCircleIcon, iconClass: 'text-danger-600', bgClass: 'bg-danger-50' },
  warning: { icon: ExclamationTriangleIcon, iconClass: 'text-warning-600', bgClass: 'bg-warning-50' },
  info: { icon: InformationCircleIcon, iconClass: 'text-primary-600', bgClass: 'bg-primary-50' },
};

export const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, type, title, message, autoCloseMs, onClose }) => {
  const { icon: Icon, iconClass, bgClass } = typeMeta[type];

  useEffect(() => {
    if (isOpen && autoCloseMs) {
      const timer = setTimeout(onClose, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-popover"
          >
            <div className={cn('mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full', bgClass)}>
              <Icon className={cn('h-7 w-7', iconClass)} />
            </div>
            <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
            {message && <p className="mt-1 text-sm text-neutral-600">{message}</p>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AlertDialog;
