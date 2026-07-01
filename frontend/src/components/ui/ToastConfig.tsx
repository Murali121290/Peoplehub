import React from 'react';
import { Toaster } from 'react-hot-toast';

export const AppToaster: React.FC = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 4000,
      style: {
        background: '#FFFFFF',
        color: '#1E293B',
        border: '1px solid #DCDEF5',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(15,23,42,0.12)',
        fontSize: '13px',
        fontWeight: 500,
      },
      success: {
        iconTheme: { primary: '#10B981', secondary: '#FFFFFF' },
      },
      error: {
        iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
      },
    }}
  />
);

export default AppToaster;
