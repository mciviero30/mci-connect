import React, { useState, useRef, useCallback } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

const SWIPE_THRESHOLD = 30; // Reduced threshold for faster response
const ACTION_WIDTH = 120;
const TOUCH_PASSIVE_OPTIONS = { passive: true };

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
  const containerRef = useRef(null);
  const isMobileRef = useRef(window.innerWidth < 768);

  const handleTouchStart = useCallback((e) => {
    if (!isMobileRef.current) return;
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!isMobileRef.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    // Swipe left > threshold = show actions
    if (diff > SWIPE_THRESHOLD) {
      setIsSwiped(true);
    }
    // Swipe right or small movement = close/toggle
    else if (diff < -SWIPE_THRESHOLD || Math.abs(diff) < 10) {
      setIsSwiped(false);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    setIsSwiped(false);
    if (onDelete) await onDelete();
  }, [onDelete]);

  const handleEdit = useCallback(async () => {
    setIsSwiped(false);
    if (onEdit) await onEdit();
  }, [onEdit]);

  return (
    <motion.div
      ref={containerRef}
      className="relative overflow-hidden bg-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Acciones - Fondo */}
      {isSwiped && (
        <div className="absolute inset-y-0 right-0 flex w-[120px] bg-gradient-to-l from-red-600 to-red-500 md:hidden">
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center text-white active:bg-blue-700 transition-colors duration-75"
            title="Edit"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center text-white active:bg-red-700 transition-colors duration-75"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Contenido - Se desliza con el swipe */}
      <motion.div
        animate={{
          x: isSwiped ? -ACTION_WIDTH : 0,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.5 }}
        className="relative z-10 bg-white"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}