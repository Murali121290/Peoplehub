import React from 'react';
import { Toaster, ToastIcon, toast, resolveValue } from 'react-hot-toast';

export const AppToaster: React.FC = () => (
  <Toaster
    position="top-right"
    containerStyle={{ zIndex: 99999 }}
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
        style: {
          background: '#ECFDF5', // light green fill
          border: '1px solid #10B981', // green outline
          color: '#065F46', // dark green text
        },
        iconTheme: { primary: '#10B981', secondary: '#FFFFFF' },
      },
      error: {
        style: {
          background: '#FEF2F2', // light red fill
          border: '1px solid #EF4444', // red outline
          color: '#991B1B', // dark red text
        },
        iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
      },
      blank: { // In case we use toast("...") directly (often used for warnings/orange)
        style: {
          background: '#FFF7ED', // light orange fill
          border: '1px solid #F97316', // orange outline
          color: '#9A3412', // dark orange text
        }
      }
    }}
  >
    {(t) => (
      <div
        style={{
          ...t.style,
          opacity: t.visible ? 1 : 0,
          transition: 'all 0.2s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
        }}
      >
        <ToastIcon toast={t} />
        <span style={{ flex: 1 }}>{resolveValue(t.message, t)}</span>
        {t.type !== 'loading' && (
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              opacity: 0.6,
              fontSize: '14px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
          >
            ✕
          </button>
        )}
      </div>
    )}
  </Toaster>
);

export default AppToaster;
