import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type ImageViewerProps = {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
};

export const ImageViewer = ({ src, alt, isOpen, onClose }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale((prev) => Math.max(prev / 1.5, 0.1));
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev * 1.1, 5));
    } else {
      setScale((prev) => Math.max(prev / 1.1, 0.1));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (isOpen && container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }
  }, [isOpen, handleWheel]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = src;
    link.download = alt || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none w-screen h-screen p-0 m-0 border-none bg-black/95 rounded-none overflow-hidden flex flex-col items-center justify-center data-[state=open]:duration-300"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>
        
        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/50 p-2 rounded-lg text-white">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/20 rounded-md transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-white/20 rounded-md transition-colors text-sm font-medium min-w-[3rem]"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/20 rounded-md transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/20 rounded-md transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/30 mx-1" />
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/80 rounded-md transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleReset}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-none max-h-none pointer-events-none select-none"
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
