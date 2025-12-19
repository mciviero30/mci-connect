import React from 'react';

export default function MCIConnectLogo({ className = "", height = 80 }) {
  return (
    <svg 
      viewBox="0 0 400 80" 
      className={className}
      style={{ height: `${height}px`, width: 'auto' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Isotipo - Cubo/Caja 3D */}
      <g transform="translate(20, 20)">
        {/* Cara frontal */}
        <path 
          d="M 20 15 L 40 5 L 40 30 L 20 40 Z" 
          fill="#4A90E2" 
          stroke="#2C5F8D" 
          strokeWidth="1.5"
          shapeRendering="geometricPrecision"
        />
        {/* Cara superior */}
        <path 
          d="M 0 25 L 20 15 L 40 5 L 20 -5 Z" 
          fill="#60A5FA" 
          stroke="#2C5F8D" 
          strokeWidth="1.5"
          shapeRendering="geometricPrecision"
        />
        {/* Cara lateral */}
        <path 
          d="M 0 25 L 0 50 L 20 40 L 20 15 Z" 
          fill="#3B82F6" 
          stroke="#2C5F8D" 
          strokeWidth="1.5"
          shapeRendering="geometricPrecision"
        />
      </g>

      {/* Texto MCI */}
      <text 
        x="75" 
        y="35" 
        fontFamily="'Inter', 'Helvetica Neue', sans-serif" 
        fontSize="22" 
        fontWeight="800" 
        fill="#1E293B"
        letterSpacing="0.5"
      >
        MCI
      </text>

      {/* Texto CONNECT */}
      <text 
        x="75" 
        y="55" 
        fontFamily="'Inter', 'Helvetica Neue', sans-serif" 
        fontSize="16" 
        fontWeight="600" 
        fill="#4A90E2"
        letterSpacing="2"
      >
        CONNECT
      </text>
    </svg>
  );
}