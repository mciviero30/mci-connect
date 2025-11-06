import React from 'react';

const SKIN_COLORS = {
  light: '#ffd1b3',
  tan: '#e8b494',
  medium: '#d4a574',
  dark: '#8d5524',
  pale: '#ffe5d9'
};

const HAIR_COLORS = {
  black: '#1a1a1a',
  brown: '#4a2511',
  blonde: '#f4d03f',
  red: '#a94442',
  gray: '#808080',
  blue: '#3B9FF3',
  purple: '#9b59b6'
};

export default function CustomAvatar({ config, size = 'md', className = '' }) {
  const sizes = {
    sm: { w: 40, h: 40, scale: 0.8 },
    md: { w: 80, h: 80, scale: 1 },
    lg: { w: 120, h: 120, scale: 1.5 },
    xl: { w: 160, h: 160, scale: 2 }
  };

  const { w, h, scale } = sizes[size];
  
  if (!config) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-[#3B9FF3] to-blue-500 flex items-center justify-center ${className}`}
        style={{ width: w, height: h }}
      >
        <span className="text-white font-bold" style={{ fontSize: w * 0.4 }}>?</span>
      </div>
    );
  }

  const skinColor = SKIN_COLORS[config.skin] || SKIN_COLORS.medium;
  const hairColor = HAIR_COLORS[config.hair_color] || HAIR_COLORS.brown;

  return (
    <div className={`relative ${className}`} style={{ width: w, height: h }}>
      <svg viewBox="0 0 100 100" width={w} height={h} className="drop-shadow-lg">
        {/* Background Circle */}
        <circle cx="50" cy="50" r="48" fill="url(#avatarBg)" />
        <defs>
          <linearGradient id="avatarBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#f0f9ff', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#e0f2fe', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Accessory - Hat/Cap (behind head) */}
        {config.accessory === 'hat' && (
          <>
            <ellipse cx="50" cy="20" rx="28" ry="8" fill="#1a1a1a" />
            <rect x="22" y="15" width="56" height="12" rx="6" fill="#1a1a1a" />
          </>
        )}
        {config.accessory === 'cap' && (
          <>
            <path d="M 30 25 Q 50 15 70 25 L 65 30 L 35 30 Z" fill="#3B9FF3" />
            <ellipse cx="50" cy="28" rx="8" ry="3" fill="#2A8FE3" />
          </>
        )}

        {/* Head */}
        <circle cx="50" cy="55" r="25" fill={skinColor} />
        
        {/* Hair */}
        {config.hair === 'short' && (
          <>
            <ellipse cx="50" cy="35" rx="26" ry="15" fill={hairColor} />
            <path d="M 24 40 Q 30 30 35 35 Q 40 32 45 35 Q 50 30 55 35 Q 60 32 65 35 Q 70 30 76 40" fill={hairColor} />
          </>
        )}
        {config.hair === 'medium' && (
          <>
            <ellipse cx="50" cy="35" rx="27" ry="18" fill={hairColor} />
            <path d="M 23 45 Q 20 50 22 55 M 77 45 Q 80 50 78 55" stroke={hairColor} strokeWidth="3" fill="none" />
          </>
        )}
        {config.hair === 'long' && (
          <>
            <ellipse cx="50" cy="35" rx="28" ry="20" fill={hairColor} />
            <path d="M 22 50 Q 18 60 20 70 M 78 50 Q 82 60 80 70" stroke={hairColor} strokeWidth="4" fill="none" />
          </>
        )}
        {config.hair === 'curly' && (
          <>
            <circle cx="35" cy="32" r="8" fill={hairColor} />
            <circle cx="50" cy="28" r="10" fill={hairColor} />
            <circle cx="65" cy="32" r="8" fill={hairColor} />
            <circle cx="28" cy="40" r="6" fill={hairColor} />
            <circle cx="72" cy="40" r="6" fill={hairColor} />
          </>
        )}
        {config.hair === 'buzz' && (
          <ellipse cx="50" cy="33" rx="25" ry="12" fill={hairColor} opacity="0.7" />
        )}

        {/* Eyes */}
        {config.eyes === 'normal' && (
          <>
            <circle cx="40" cy="52" r="3" fill="#1a1a1a" />
            <circle cx="60" cy="52" r="3" fill="#1a1a1a" />
          </>
        )}
        {config.eyes === 'happy' && (
          <>
            <path d="M 37 52 Q 40 48 43 52" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 57 52 Q 60 48 63 52" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}
        {config.eyes === 'wide' && (
          <>
            <circle cx="40" cy="52" r="4" fill="#1a1a1a" />
            <circle cx="60" cy="52" r="4" fill="#1a1a1a" />
            <circle cx="40" cy="51" r="1.5" fill="white" />
            <circle cx="60" cy="51" r="1.5" fill="white" />
          </>
        )}
        {config.eyes === 'tired' && (
          <>
            <line x1="37" y1="52" x2="43" y2="52" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
            <line x1="57" y1="52" x2="63" y2="52" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {config.eyes === 'wink' && (
          <>
            <circle cx="40" cy="52" r="3" fill="#1a1a1a" />
            <line x1="57" y1="52" x2="63" y2="52" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
          </>
        )}

        {/* Glasses */}
        {config.glasses && (
          <>
            <circle cx="40" cy="52" r="6" fill="none" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="60" cy="52" r="6" fill="none" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="46" y1="52" x2="54" y2="52" stroke="#1a1a1a" strokeWidth="2" />
          </>
        )}

        {/* Nose */}
        <ellipse cx="50" cy="58" rx="2" ry="3" fill={skinColor} opacity="0.5" />

        {/* Mouth */}
        {config.mouth === 'smile' && (
          <path d="M 40 65 Q 50 70 60 65" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        {config.mouth === 'happy' && (
          <>
            <path d="M 40 65 Q 50 72 60 65" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 42 65 Q 50 70 58 65" fill="#d45d79" />
          </>
        )}
        {config.mouth === 'neutral' && (
          <line x1="42" y1="66" x2="58" y2="66" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        )}
        {config.mouth === 'laugh' && (
          <>
            <ellipse cx="50" cy="68" rx="10" ry="6" fill="#d45d79" />
            <path d="M 40 65 Q 50 73 60 65" stroke="#1a1a1a" strokeWidth="2" fill="none" />
          </>
        )}
        {config.mouth === 'surprised' && (
          <circle cx="50" cy="67" r="4" fill="#1a1a1a" opacity="0.8" />
        )}

        {/* Facial Hair */}
        {config.facial_hair === 'beard' && (
          <>
            <path d="M 32 70 Q 35 78 40 76 Q 45 78 50 78 Q 55 78 60 76 Q 65 78 68 70" fill={hairColor} />
            <ellipse cx="50" cy="75" rx="15" ry="8" fill={hairColor} />
          </>
        )}
        {config.facial_hair === 'mustache' && (
          <path d="M 42 63 Q 46 66 50 64 Q 54 66 58 63" fill={hairColor} strokeWidth="2" />
        )}
        {config.facial_hair === 'goatee' && (
          <ellipse cx="50" cy="73" rx="6" ry="8" fill={hairColor} />
        )}

        {/* Accessory - Headphones (in front) */}
        {config.accessory === 'headphones' && (
          <>
            <path d="M 20 45 Q 18 50 20 55" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 80 45 Q 82 50 80 55" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
            <rect x="17" y="48" width="6" height="10" rx="3" fill="#3B9FF3" />
            <rect x="77" y="48" width="6" height="10" rx="3" fill="#3B9FF3" />
            <path d="M 23 50 Q 50 25 77 50" stroke="#1a1a1a" strokeWidth="3" fill="none" />
          </>
        )}
      </svg>
    </div>
  );
}