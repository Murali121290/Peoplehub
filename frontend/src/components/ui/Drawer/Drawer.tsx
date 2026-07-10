import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

export type DrawerPosition = 'left' | 'right' | 'bottom-right' | 'top-right';
export type DrawerVariant = 'panel' | 'dropdown';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: DrawerPosition;
  variant?: DrawerVariant;
  title?: string;
  width?: number;
  height?: number;
  showBackdrop?: boolean;
  children: React.ReactNode;
}

const positionStyles: Record<DrawerPosition, { className: string; initial: object; animate: object }> = {
  left: { className: 'fixed left-0 top-0 h-screen z-drawer', initial: { x: '-100%' }, animate: { x: 0 } },
  right: { className: 'fixed right-0 top-0 h-screen z-drawer', initial: { x: '100%' }, animate: { x: 0 } },
  'bottom-right': { className: 'fixed bottom-6 right-6 z-drawer rounded-xl', initial: { opacity: 0, y: 20, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 } },
  'top-right': { className: 'fixed top-16 right-6 z-drawer rounded-xl', initial: { opacity: 0, y: -10, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 } },
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  position = 'right',
  variant = 'panel',
  title,
  width,
  height,
  showBackdrop = false,
  children,
}) => {
  const pos = positionStyles[position];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {showBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-drawer bg-neutral-900/30"
              onClick={onClose}
            />
          )}
          <motion.div
            initial={pos.initial}
            animate={pos.animate}
            exit={pos.initial}
            transition={{ type: 'spring', damping: 24, stiffness: 250 }}
            style={{ width: width ?? (variant === 'dropdown' ? 380 : 400), height }}
            className={cn(
              'flex flex-col bg-white border border-neutral-200 shadow-popover',
              variant === 'panel' && position !== 'bottom-right' && position !== 'top-right' ? '' : 'rounded-xl',
              pos.className
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 flex-shrink-0">
                <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
                <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
