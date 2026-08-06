import React from 'react';
import { createPortal } from 'react-dom';

interface BookLoaderProps {}

/**
 * Full-screen loading page with a custom pure CSS/SVG orbiting balls animation.
 * Replaces external Lottie dependencies with local, performant SVG shapes.
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Morphing & Orbiting Balls SVG */}
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%',
            height: '100%',
            animation: 'ph-rotate 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        >
          {/* Top/Large Blue Ball */}
          <g transform="translate(50, 50) rotate(0)">
            <circle
              cx="0"
              cy="-26"
              r="12"
              fill="#0095D9"
              opacity="0.9"
              style={{
                animation: 'ph-contract 2.2s ease-in-out infinite',
              }}
            />
          </g>

          {/* Left/Small Teal Ball */}
          <g transform="translate(50, 50) rotate(120)">
            <circle
              cx="0"
              cy="-26"
              r="8"
              fill="#00B5B8"
              opacity="0.9"
              style={{
                animation: 'ph-contract 2.2s ease-in-out infinite',
              }}
            />
          </g>

          {/* Right/Medium Light Blue Ball */}
          <g transform="translate(50, 50) rotate(240)">
            <circle
              cx="0"
              cy="-26"
              r="10"
              fill="#45D0F9"
              opacity="0.9"
              style={{
                animation: 'ph-contract 2.2s ease-in-out infinite',
              }}
            />
          </g>
        </svg>
      </div>

      <style>{`
        @keyframes ph-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ph-contract {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(21px); /* Move towards center to overlap */
          }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
};

export default BookLoader;
