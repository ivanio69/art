import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    element.showModal();
    const listener = e => { if (e.key !== 'Tab') return; const focusable = [...element.querySelectorAll('button,input,textarea,select,a[href]')].filter(el => !el.disabled); const first = focusable[0]; const last = focusable.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } };
    element.addEventListener('keydown', listener);
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { element.removeEventListener('keydown', listener); document.body.style.overflow = previous; element.close(); };
  }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }} aria-labelledby="modal-title">
    <header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={21} /></button></header>
    {children}
  </dialog>;
}
