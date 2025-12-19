import React from 'react';

export default function MCIDocumentLogo({ height = 64 }) {
  return (
    <svg 
      viewBox="0 0 200 80" 
      style={{ height: `${height}px`, width: 'auto' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Isotipo - Cubo/Caja 3D en blanco */}
      <g transform="translate(10, 20)">
        {/* Cara frontal */}
        <path 
          d="M 20 15 L 40 5 L 40 30 L 20 40 Z" 
          fill="#FFFFFF" 
          stroke="#E5E7EB" 
          strokeWidth="1.5"
          shapeRendering="geometricPrecision"
        />
        {/* Cara superior */}
        <path 
          d="M 0 25 L 20 15 L 40 5 L 20 -5 Z" 
          fill="#F3F4F6" 
          stroke="#E5E7EB" 
          strokeWidth="1.5"
          shapeRendering="geometricPrecision"
        />
        {/* Cara lateral */}
        <path 
          d="M 0 25 L 0 50 L 20 40 L 20 15 Z" 
          fill="#E5E7EB" 
          stroke="#D1D5DB" 
          strokeWidth="1.5"
          shapeRendering="geometricPrecision"
        />
      </g>

      {/* Texto MODERN */}
      <text 
        x="65" 
        y="28" 
        fontFamily="'Inter', 'Helvetica Neue', sans-serif" 
        fontSize="11" 
        fontWeight="700" 
        fill="#FFFFFF"
        letterSpacing="0.8"
      >
        MODERN
      </text>

      {/* Texto COMPONENTS */}
      <text 
        x="65" 
        y="42" 
        fontFamily="'Inter', 'Helvetica Neue', sans-serif" 
        fontSize="11" 
        fontWeight="700" 
        fill="#FFFFFF"
        letterSpacing="0.8"
      >
        COMPONENTS
      </text>

      {/* Texto INSTALLATIONS */}
      <text 
        x="65" 
        y="56" 
        fontFamily="'Inter', 'Helvetica Neue', sans-serif" 
        fontSize="11" 
        fontWeight="700" 
        fill="#FFFFFF"
        letterSpacing="0.8"
      >
        INSTALLATIONS
      </text>

      {/* Línea decorativa */}
      <line 
        x1="65" 
        y1="60" 
        x2="190" 
        y2="60" 
        stroke="#4A90E2" 
        strokeWidth="2"
      />
    </svg>
  );
}