import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  workerName: string;
  onClose: () => void;
  onSaveCrop: (croppedBase64: string) => void;
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  isOpen,
  imageSrc,
  workerName,
  onClose,
  onSaveCrop,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset offset and zoom when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Mouse / Touch Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for Mobile Devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset to center
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Generate cropped base64 image (400x400 px)
  const handleApplyCrop = () => {
    if (!imageRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const container = containerRef.current;
      const targetSize = 400; // Output dimension: 400x400 px

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Container viewport dimensions (CSS px)
      const rect = container.getBoundingClientRect();
      const viewportSize = rect.width; // Square container

      // The image element size rendered inside container
      const renderedWidth = img.width;
      const renderedHeight = img.height;

      // Scale ratio between output canvas and viewport
      const scaleToCanvas = targetSize / viewportSize;

      // Fill canvas background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetSize, targetSize);

      ctx.save();

      // Transform context to mirror the CSS zoom and offset
      // Center of canvas
      ctx.translate(targetSize / 2, targetSize / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(offset.x * scaleToCanvas, offset.y * scaleToCanvas);

      // Draw the image centered
      const drawW = renderedWidth * scaleToCanvas;
      const drawH = renderedHeight * scaleToCanvas;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      ctx.restore();

      // Output as high quality compressed JPEG (under 120KB)
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.88);
      onSaveCrop(croppedBase64);
      onClose();
    } catch (err) {
      console.error('Gagal memotong foto:', err);
      alert('Terjadi kesalahan saat memproses posisi foto.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 flex flex-col max-h-[95vh] overflow-y-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <span>✂️</span>
              <span>Sesuaikan Posisi Foto Profil</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pekerja: <strong className="text-sky-800 font-bold">{workerName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tip Instruction */}
        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-[11px] sm:text-xs text-sky-900 flex items-start gap-2 shadow-2xs">
          <span className="text-base select-none shrink-0">💡</span>
          <span className="leading-relaxed">
            <strong>Tarik/geser foto</strong> ke kiri, kanan, atas, atau bawah untuk mengatur fokus wajah. Gunakan <strong>slider pembesar</strong> di bawah untuk memperbesar/memperkecil.
          </span>
        </div>

        {/* Cropping Viewport Container */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] relative rounded-3xl bg-slate-950 overflow-hidden shadow-inner select-none flex items-center justify-center ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* The Image being moved and zoomed */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Preview Crop"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              className="pointer-events-none select-none"
            />

            {/* Circular Avatar Guide Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer dimmed border with circular hole */}
              <div className="w-[210px] h-[210px] sm:w-[230px] sm:h-[230px] rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] ring-1 ring-sky-400">
                {/* Crosshair guide center */}
                <div className="w-full h-full relative opacity-30">
                  <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-white"></div>
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-white"></div>
                </div>
              </div>
            </div>

            {/* Tag Badge */}
            <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono pointer-events-none backdrop-blur-xs">
              Area Lingkaran = Tampilan Beranda
            </div>
          </div>
        </div>

        {/* Controls: Zoom & Quick Actions */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>🔍</span>
                <span>Ukuran Pembesaran (Zoom):</span>
              </span>
              <span className="font-mono text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 text-[11px]">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Perkecil"
              >
                －
              </button>

              <input
                type="range"
                min="0.6"
                max="3"
                step="0.02"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 focus:outline-hidden"
              />

              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3, Number((prev + 0.1).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Perbesar"
              >
                ＋
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Geser foto untuk posisi pas</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-sky-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>↺</span>
              <span>Reset Posisi Awal</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-700 to-sky-600 hover:from-sky-600 hover:to-sky-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <span>⏳ Memproses...</span>
            ) : (
              <>
                <span>✓</span>
                <span>Simpan & Terapkan Foto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
