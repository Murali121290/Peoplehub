import React from 'react';
import { ConfirmDialog } from '../../../components/ui/Modal';

interface ConfirmModalProps {
  isOpen?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen = true, onCancel, onConfirm }) => (
  <ConfirmDialog
    isOpen={isOpen}
    variant="danger"
    title="Confirm Check Out"
    message="Are you sure you want to Check Out?"
    description="After checkout, you cannot check in again today."
    confirmLabel="Yes, Check Out"
    cancelLabel="Cancel"
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

export default ConfirmModal;

