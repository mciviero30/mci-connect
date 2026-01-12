import { useState, useRef } from 'react';

export const useSwipeActions = () => {
  const [activeSwipeId, setActiveSwipeId] = useState(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e, id) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (id, threshold = 50) => {
    const diff = touchStartX.current - touchEndX.current;
    const verticalDiff = Math.abs(e?.touches?.[0]?.clientY - touchStartY.current || 0);

    // Ignorar si es un scroll vertical
    if (verticalDiff > 10) {
      setActiveSwipeId(null);
      return null;
    }

    // Swipe a la izquierda (eliminar)
    if (diff > threshold) {
      return 'delete';
    }

    // Swipe a la derecha (editar)
    if (diff < -threshold) {
      return 'edit';
    }

    setActiveSwipeId(null);
    return null;
  };

  const closeSwipe = () => {
    setActiveSwipeId(null);
  };

  const openSwipe = (id) => {
    setActiveSwipeId(id);
  };

  return {
    activeSwipeId,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    closeSwipe,
    openSwipe,
  };
};