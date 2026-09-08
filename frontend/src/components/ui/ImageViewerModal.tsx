import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
  title?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  altText = "Image preview",
  title,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when modal opens with a new image or closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, imageUrl]);

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = (title || "downloaded-image").replace(/\s+/g, "_") + ".jpg";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl, title]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0" || e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Dragging logic for panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click to toggle 2x zoom / reset
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale === 1) {
      setScale(2);
    } else {
      handleResetZoom();
    }
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn select-none overflow-hidden"
      onClick={(e) => {
        // Close if clicking outside the image container
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3 max-w-[70%]">
          {title && (
            <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold truncate shadow-sm">
              {title}
            </div>
          )}
          <span className="text-white/60 text-xs hidden sm:inline-block">
            Use scroll wheel or buttons to zoom • Double click to zoom in/out
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/25 active:scale-95 text-white transition-all backdrop-blur-md border border-white/20 shadow-lg cursor-pointer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className={`relative transition-transform duration-100 ease-out ${
            scale > 1
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-zoom-in"
          }`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={altText}
            draggable={false}
            className="max-w-[90vw] max-h-[82vh] object-contain rounded-lg shadow-2xl transition-all duration-200 pointer-events-auto border border-white/10"
            onError={(e) => {
              e.currentTarget.alt = "Failed to load image";
            }}
          />
        </div>
      </div>

      {/* Floating Bottom Toolbar / Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-2 px-4 py-2 rounded-full bg-neutral-900/80 backdrop-blur-xl border border-white/20 shadow-2xl text-white pointer-events-auto transition-all hover:bg-neutral-900/95">
        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          title="Zoom Out (-)"
          className="p-2 rounded-full hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-95"
        >
          <MagnifyingGlassMinusIcon className="w-5 h-5 text-white" />
        </button>

        {/* Zoom Percentage */}
        <button
          type="button"
          onClick={handleResetZoom}
          title="Reset Zoom (0 / r)"
          className="px-2.5 py-1 text-xs font-bold text-white/90 hover:text-white rounded-md hover:bg-white/15 transition-all cursor-pointer min-w-[55px] text-center"
        >
          {Math.round(scale * 100)}%
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          title="Zoom In (+)"
          className="p-2 rounded-full hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-95"
        >
          <MagnifyingGlassPlusIcon className="w-5 h-5 text-white" />
        </button>

        <div className="w-[1px] h-5 bg-white/20 mx-1" />

        {/* Rotate 90° */}
        <button
          type="button"
          onClick={handleRotate}
          title="Rotate (90°)"
          className="p-2 rounded-full hover:bg-white/15 transition-all cursor-pointer active:scale-95 text-white"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={handleDownload}
          title="Download Image"
          className="p-2 rounded-full hover:bg-white/15 transition-all cursor-pointer active:scale-95 text-white"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-2 rounded-full hover:bg-white/15 transition-all cursor-pointer active:scale-95 text-white hidden sm:block"
        >
          {isFullscreen ? (
            <ArrowsPointingInIcon className="w-5 h-5" />
          ) : (
            <ArrowsPointingOutIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};
