import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all duration-200">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'relative z-10 w-full bg-white rounded-[18px] shadow-2xl border border-neutral-200 flex flex-col overflow-hidden',
              sizeClasses[size],
              size !== 'full' && 'max-h-[90vh]',
              className
            )}
          >
            {(title || eyebrow) && (
              <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-4 flex-shrink-0 bg-white">
                <div>
                  {eyebrow && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary-600 mb-1">
                      {EyebrowIcon && <EyebrowIcon className="h-3.5 w-3.5" />}
                      {eyebrow.label}
                    </div>
                  )}
                  {title && <h2 className="text-lg font-bold text-black">{title}</h2>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors border border-transparent hover:border-neutral-200"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            {tabs && <div className="border-b border-neutral-100 px-6 flex-shrink-0">{tabs}</div>}
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4 flex-shrink-0 bg-neutral-50/50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default Modal;
