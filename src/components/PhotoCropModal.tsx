import React, { useState, useRef, useEffect } from 'react';

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
  // Ukuran dasar viewport (280x280 pada layar standar)
  const VIEWPORT_SIZE = 280;
  const OUTPUT_SIZE = 400; // Output JPEG 400x400 px tajam & stabil

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Dimensi natural gambar
  const [imageMeta, setImageMeta] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    baseWidth: number;
    baseHeight: number;
  }>({
    naturalWidth: 0,
    naturalHeight: 0,
    baseWidth: VIEWPORT_SIZE,
    baseHeight: VIEWPORT_SIZE,
  });

  const [touchPinchDist, setTouchPinchDist] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Inisialisasi saat modal dibuka dengan gambar baru
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);

    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || VIEWPORT_SIZE;
      const nh = img.naturalHeight || VIEWPORT_SIZE;
      const aspect = nw / nh;

      let bw = VIEWPORT_SIZE;
      let bh = VIEWPORT_SIZE;

      if (aspect >= 1) {
        // Landscape
        bh = VIEWPORT_SIZE;
        bw = Math.round(VIEWPORT_SIZE * aspect);
      } else {
        // Portrait
        bw = VIEWPORT_SIZE;
        bh = Math.round(VIEWPORT_SIZE / aspect);
      }

      setImageMeta({
        naturalWidth: nw,
        naturalHeight: nh,
        baseWidth: bw,
        baseHeight: bh,
      });
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  // Global window mouse & touch listeners agar drag tidak pernah lepas/macet
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      setOffset({
        x: Math.round(e.clientX - dragStart.x),
        y: Math.round(e.clientY - dragStart.y),
      });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        setOffset({
          x: Math.round(e.touches[0].clientX - dragStart.x),
          y: Math.round(e.touches[0].clientY - dragStart.y),
        });
      } else if (e.touches.length === 2 && touchPinchDist !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const diff = currentDist - touchPinchDist;

        if (Math.abs(diff) > 4) {
          const factor = diff > 0 ? 0.03 : -0.03;
          setZoom(prev => Math.min(4, Math.max(0.5, Number((prev + factor).toFixed(2)))));
          setTouchPinchDist(currentDist);
        }
      }
    };

    const handleWindowTouchEnd = () => {
      setIsDragging(false);
      setTouchPinchDist(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isDragging, dragStart, touchPinchDist]);

  // Handler awal drag mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  // Handler awal drag touch pada ponsel
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
      setTouchPinchDist(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setTouchPinchDist(Math.hypot(dx, dy));
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom(prev => Math.min(4, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  };

  // Preset posisi cepat
  const handleAlignFace = () => {
    setOffset({ x: 0, y: 35 });
  };

  const handleCenter = () => {
    setOffset({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Pemotongan Kanvas Sinkron & 100% Presisi Piksel
  const handleApplyCrop = () => {
    if (!imageSrc || !imageRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Latar belakang putih bersih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // Hitung skala nyata terhadap ukuran fisik viewport saat ini di layar
      const rect = containerRef.current?.getBoundingClientRect();
      const currentViewportW = rect && rect.width > 0 ? rect.width : VIEWPORT_SIZE;
      const scale = OUTPUT_SIZE / currentViewportW;

      ctx.save();

      // 1. Geser titik asal ke pusat kanvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

      // 2. Terapkan pergeseran (offset) yang dikalikan skala kanvas
      ctx.translate(offset.x * scale, offset.y * scale);

      // 3. Terapkan rotasi
      ctx.rotate((rotation * Math.PI) / 180);

      // 4. Terapkan zoom
      ctx.scale(zoom, zoom);

      // 5. Gambar foto di titik tengah
      const drawW = imageMeta.baseWidth * scale;
      const drawH = imageMeta.baseHeight * scale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      ctx.restore();

      // Ekspor hasil akhir JPEG berkualitas tinggi
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);
      onSaveCrop(croppedBase64);
      onClose();
    } catch (err) {
      console.error('Gagal memproses cropping foto:', err);
      alert('Terjadi kesalahan saat memotong foto.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const previewScaleCircle = 64 / VIEWPORT_SIZE;
  const previewScaleSquare = 64 / VIEWPORT_SIZE;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 flex flex-col max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <span>✂️</span>
              <span>Penyesuaian Posisi Foto Profil Presisi</span>
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
            <strong>Tarik/geser foto</strong> atau gunakan tombol cepat di bawah untuk memposisikan wajah. Hasil foto <strong>tersimpan stabil</strong> dan tidak akan bergeser sendiri baik di desktop maupun ponsel.
          </span>
        </div>

        {/* Center: Crop Area + Live Previews */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-1">
          {/* Main 280x280 Interactive Crop Viewport with touch-none */}
          <div className="flex flex-col items-center">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onWheel={handleWheel}
              style={{
                width: `${VIEWPORT_SIZE}px`,
                height: `${VIEWPORT_SIZE}px`,
                touchAction: 'none',
              }}
              className={`relative rounded-3xl bg-slate-950 overflow-hidden shadow-2xl select-none flex items-center justify-center border-2 border-slate-700/60 ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {/* Image Element */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Area Crop Foto"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${imageMeta.baseWidth}px`,
                  height: `${imageMeta.baseHeight}px`,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              />

              {/* Precise Circular Mask & Rule of Thirds Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full rounded-full border-2 border-white/95 shadow-[0_0_0_9999px_rgba(15,23,42,0.68)] ring-2 ring-sky-400/90 relative overflow-hidden">
                  {/* Grid Lines */}
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-white"></div>
                    <div className="border-r border-white"></div>
                    <div></div>
                  </div>
                </div>
              </div>

              {/* Badge Petunjuk */}
              <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono pointer-events-none backdrop-blur-xs">
                Area Lingkaran = Foto Profil
              </div>
            </div>
          </div>

          {/* Real-time Live Preview Side Column */}
          <div className="flex sm:flex-col items-center justify-center gap-3 sm:gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl shrink-0">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider text-center block w-full">
              Pratinjau Hasil
            </span>

            {/* Preview 1: Avatar Lingkaran */}
            <div className="flex flex-col items-center gap-1">
              <div 
                style={{ width: '64px', height: '64px' }}
                className="rounded-full bg-slate-900 overflow-hidden relative border-2 border-sky-400 shadow-md shrink-0"
              >
                <img
                  src={imageSrc}
                  alt="Preview Lingkaran"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: `${imageMeta.baseWidth * previewScaleCircle}px`,
                    height: `${imageMeta.baseHeight * previewScaleCircle}px`,
                    transform: `translate(-50%, -50%) translate(${offset.x * previewScaleCircle}px, ${offset.y * previewScaleCircle}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Avatar Bulat</span>
            </div>

            {/* Preview 2: Avatar Kartu Beranda */}
            <div className="flex flex-col items-center gap-1">
              <div 
                style={{ width: '64px', height: '64px' }}
                className="rounded-2xl bg-slate-900 overflow-hidden relative border-2 border-emerald-400 shadow-md shrink-0"
              >
                <img
                  src={imageSrc}
                  alt="Preview Kartu"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: `${imageMeta.baseWidth * previewScaleSquare}px`,
                    height: `${imageMeta.baseHeight * previewScaleSquare}px`,
                    transform: `translate(-50%, -50%) translate(${offset.x * previewScaleSquare}px, ${offset.y * previewScaleSquare}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Kartu Beranda</span>
            </div>
          </div>
        </div>

        {/* Controls: Zoom Slider */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>🔍</span>
                <span>Ukuran Zoom (Perbesar / Perkecil):</span>
              </span>
              <span className="font-mono text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200 text-[11px] font-bold">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Perkecil"
              >
                －
              </button>

              <input
                type="range"
                min="0.5"
                max="4"
                step="0.01"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 focus:outline-hidden"
              />

              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(4, Number((prev + 0.1).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Perbesar"
              >
                ＋
              </button>
            </div>
          </div>

          {/* Quick Buttons: Presets, Rotate, Center Reset */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCenter}
                className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Posisikan tepat di tengah"
              >
                <span>🎯</span>
                <span>Pusatkan</span>
              </button>

              <button
                type="button"
                onClick={handleAlignFace}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Fokuskan ke area wajah (sedikit ke atas)"
              >
                <span>👤</span>
                <span>Fokus Wajah</span>
              </button>

              <button
                type="button"
                onClick={handleRotate}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Putar 90 Derajat"
              >
                <span>🔄</span>
                <span>Putar ({rotation}°)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-800 font-bold hover:underline flex items-center gap-1 cursor-pointer text-xs"
            >
              <span>↺</span>
              <span>Reset Posisi</span>
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
              <span>⏳ Menyimpan Presisi...</span>
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
