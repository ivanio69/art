import { useState } from 'react';
import { ImageOff, Maximize2 } from 'lucide-react';
export default function PaintingImage({ painting, className = '', reveal = false, zoom = false, onZoom }) {
  const [failed, setFailed] = useState(false);
  return <div className={`painting-image ${className}`}>
    {painting.image && !failed ? <img src={painting.image} alt={reveal && painting.title ? painting.title : `Картина №${painting.id}`} loading={zoom ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} /> : <div className="missing-image"><ImageOff size={28} /><span>Добавьте {painting.id}.jpg</span></div>}
    {onZoom && !failed && <button type="button" className="zoom-button" aria-label="Увеличить картину" onClick={onZoom}><Maximize2 size={18} /></button>}
  </div>;
}
