import React from 'react';
import { AlertDialog } from '../../../components/ui/Modal';
import type { AlertDialogType } from '../../../components/ui/Modal';

interface PopupState {
  show: boolean;
  type: string;
  title: string;
  message: string;
}

interface PopupModalProps {
  popup: PopupState;
  onClose: () => void;
}

const VALID_TYPES: AlertDialogType[] = ['success', 'error', 'warning', 'info'];

const PopupModal: React.FC<PopupModalProps> = ({ popup, onClose }) => {
  const type = (VALID_TYPES as string[]).includes(popup.type) ? (popup.type as AlertDialogType) : 'info';

  return (
    <AlertDialog
      isOpen={popup.show}
      type={type}
      title={popup.title}
      message={popup.message}
      autoCloseMs={3000}
      onClose={onClose}
    />
  );
};

export default PopupModal;
