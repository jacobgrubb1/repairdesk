import { useRef, useState, useEffect } from 'react';

export default function SignaturePad({ onSave, existingSignature, label }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showPad, setShowPad] = useState(false);

  useEffect(() => {
    if (showPad && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth;
      canvas.height = 150;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [showPad]);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function startDraw(e) {
    e.preventDefault();
    setDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    setDrawing(false);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function save() {
    if (!hasDrawn) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
    setShowPad(false);
  }

  if (existingSignature && !showPad) {
    return (
      <div className="border rounded-lg p-3">
        <p className="text-xs font-bold uppercase text-gray-500 mb-2">{label}</p>
        <img src={existingSignature} alt="Signature" className="h-16 border rounded" />
        <button onClick={() => setShowPad(true)} className="text-blue-600 text-xs hover:underline mt-1 block">
          Re-sign
        </button>
      </div>
    );
  }

  if (!showPad) {
    return (
      <button onClick={() => setShowPad(true)} className="text-blue-600 text-sm hover:underline">
        + Capture {label}
      </button>
    );
  }

  return (
    <div className="border rounded-lg p-3">
      <p className="text-xs font-bold uppercase text-gray-500 mb-2">{label}</p>
      <canvas
        ref={canvasRef}
        className="w-full border rounded cursor-crosshair bg-white"
        style={{ touchAction: 'none' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="flex gap-2 mt-2">
        <button onClick={save} disabled={!hasDrawn}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
          Save
        </button>
        <button onClick={clear} className="text-gray-500 text-sm">Clear</button>
        <button onClick={() => setShowPad(false)} className="text-gray-500 text-sm">Cancel</button>
      </div>
    </div>
  );
}
