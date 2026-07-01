import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalEyebrow {
  icon?: React.ElementType;
  label: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  eyebrow?: ModalEyebrow;
  footer?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-6xl',
  full: 'max-w-[96vw] h-[92vh]',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  title,
  eyebrow,
  footer,
  tabs,
  children,
  closeOnBackdrop = true,
  className,
}) => {
  const EyebrowIcon = eyebrow?.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/40"
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'relative w-full bg-white rounded-xl shadow-popover border border-neutral-200 flex flex-col overflow-hidden',
              sizeClasses[size],
              size !== 'full' && 'max-h-[90vh]',
              className
            )}
          >
            {(title || eyebrow) && (
              <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4 flex-shrink-0">
                <div>
                  {eyebrow && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary-600 mb-1">
                      {EyebrowIcon && <EyebrowIcon className="h-3.5 w-3.5" />}
                      {eyebrow.label}
                    </div>
                  )}
                  {title && <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            {tabs && <div className="border-b border-neutral-200 px-6 flex-shrink-0">{tabs}</div>}
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4 flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
