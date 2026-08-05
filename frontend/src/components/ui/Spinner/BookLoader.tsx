import React from 'react';
import { createPortal } from 'react-dom';

interface BookLoaderProps {
  label?: string;
}

/**
 * Full-screen grey loading page.
 * Renders via React Portal directly on document.body so it covers everything.
 * Removed when isPageLoading becomes false after all data is fetched.
 */
export const BookLoader: React.FC<BookLoaderProps> = () => {
  const content = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Spinner */}
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        {/* Track */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '4px solid #B0D7DB',
          }}
        />
        {/* Spinning arc */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '4px solid transparent',
            borderTopColor: '#1F7A8C',
            animation: 'ph-spin 0.8s linear infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes ph-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
};

export default BookLoader;
