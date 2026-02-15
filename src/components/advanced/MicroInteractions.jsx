import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Micro-interactions and Premium Animations
 * Subtle animations that enhance UX
 */

// Fade in from bottom
export const FadeInUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, delay }}
  >
    {children}
  </motion.div>
);

// Scale on mount
export const ScaleIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.2, delay }}
  >
    {children}
  </motion.div>
);

// Slide from side
export const SlideIn = ({ children, direction = 'left', delay = 0 }) => {
  const x = direction === 'left' ? -20 : direction === 'right' ? 20 : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
};

// Stagger children
export const StaggerContainer = ({ children, staggerDelay = 0.05 }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 }
    }}
  >
    {children}
  </motion.div>
);

// Hover scale (for cards, buttons)
export const HoverScale = ({ children, scale = 1.02 }) => (
  <motion.div
    whileHover={{ scale }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

// Pulse animation (for notifications)
export const Pulse = ({ children }) => (
  <motion.div
    animate={{
      scale: [1, 1.05, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {children}
  </motion.div>
);

// Success checkmark animation
export const SuccessCheckmark = () => (
  <motion.svg
    className="w-16 h-16 text-green-600"
    viewBox="0 0 50 50"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 0.5, ease: "easeInOut" }}
  >
    <motion.circle
      cx="25"
      cy="25"
      r="20"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5 }}
    />
    <motion.path
      d="M15 25 L22 32 L35 18"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    />
  </motion.svg>
);

// Shimmer loading effect
export const Shimmer = ({ children, className = '' }) => (
  <div className={`relative overflow-hidden ${className}`}>
    {children}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      animate={{
        x: ['-100%', '100%']
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </div>
);