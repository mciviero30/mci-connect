import React, { useState, useRef } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SwipeableListItem({
  id,
  children,
  onDelete,
  onEdit,
  isActive = false,
  onClose = () => {},
}) {
  const [isSwiped, setIsSwiped] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (window.innerWidth >= 768) return; // Desktop - ignore
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (window.innerWidth >= 768) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 768) return;

    const diff = touchStartX.current - touchEndX.current;

    // Swipe a la izquierda > 50px = mostrar acciones
    if (diff > 50) {
      setIsSwiped(true);
      return;
    }

    // Swipe a la derecha < -50px = cerrar
    if (diff < -50) {
      setIsSwiped(false);
      return;
    }

    // Click normal - cerrar swipe si estaba abierto
    if (Math.abs(diff) < 10) {
      if (isSwiped) {
        setIsSwiped(false);
      }
    }
  };

  const handleDelete = async () => {
    setIsSwiped(false);
    if (onDelete) await onDelete();
  };

  const handleEdit = async () => {
    setIsSwiped(false);
    if (onEdit) await onEdit();
  };

  return (
    <motion.div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Acciones - Fondo */}
      {isSwiped && (
        <div className="absolute inset-y-0 right-0 flex w-[120px] bg-gradient-to-l from-red-600 to-red-500 md:hidden">
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center text-white hover:bg-red-700 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Contenido - Se desliza con el swipe */}
      <motion.div
        animate={{
          x: isSwiped ? -120 : 0,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative z-10 bg-white"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}