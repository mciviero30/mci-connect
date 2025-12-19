import React from 'react';

export default function MCIFieldLogo({ className = "", fullWidth = false }) {
  return (
    <div 
      className={`${fullWidth ? 'w-screen relative left-[50%] right-[50%] -mx-[50vw]' : 'w-full'} ${className}`}
      style={{ 
        background: 'linear-gradient(135deg, #FFC107 0%, #FFB300 50%, #FFA000 100%)',
        padding: '24px 0'
      }}
    >
      <div className="max-w-7xl mx-auto px-8 flex items-center gap-6">
        {/* Isotipo - Cubo/Caja 3D */}
        <svg 
          viewBox="0 0 60 60" 
          style={{ height: '60px', width: 'auto' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(10, 15)">
            {/* Cara frontal */}
            <path 
              d="M 20 15 L 40 5 L 40 30 L 20 40 Z" 
              fill="#1E293B" 
              stroke="#0F172A" 
              strokeWidth="2"
              shapeRendering="geometricPrecision"
            />
            {/* Cara superior */}
            <path 
              d="M 0 25 L 20 15 L 40 5 L 20 -5 Z" 
              fill="#334155" 
              stroke="#0F172A" 
              strokeWidth="2"
              shapeRendering="geometricPrecision"
            />
            {/* Cara lateral */}
            <path 
              d="M 0 25 L 0 50 L 20 40 L 20 15 Z" 
              fill="#475569" 
              stroke="#0F172A" 
              strokeWidth="2"
              shapeRendering="geometricPrecision"
            />
          </g>
        </svg>

        {/* Texto */}
        <div className="flex flex-col">
          <svg 
            viewBox="0 0 250 60" 
            style={{ height: '60px', width: 'auto' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* MCI */}
            <text 
              x="0" 
              y="32" 
              fontFamily="'Inter', 'Helvetica Neue', sans-serif" 
              fontSize="32" 
              fontWeight="900" 
              fill="#1E293B"
              letterSpacing="1"
            >
              MCI
            </text>
            
            {/* FIELD */}
            <text 
              x="0" 
              y="54" 
              fontFamily="'Inter', 'Helvetica Neue', sans-serif" 
              fontSize="18" 
              fontWeight="700" 
              fill="#1E293B"
              letterSpacing="3"
            >
              FIELD
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}