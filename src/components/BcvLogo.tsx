import React from 'react';

interface BcvLogoProps {
  className?: string;
  size?: number;
}

export const BcvLogo: React.FC<BcvLogoProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Banco Central de Venezuela</title>
      {/* Outer golden rim */}
      <circle cx="50" cy="50" r="48" fill="#1b4079" stroke="#e6b325" strokeWidth="3" />
      <circle cx="50" cy="50" r="43" fill="#0d254c" stroke="#f6c845" strokeWidth="1.5" strokeDasharray="3 1.5" />
      
      {/* Sun rays from center */}
      <g stroke="#f6c845" strokeWidth="1.2" opacity="0.8">
        {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map((deg, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={50 + 26 * Math.cos((deg * Math.PI) / 180)}
            y2={50 + 26 * Math.sin((deg * Math.PI) / 180)}
          />
        ))}
      </g>

      {/* Central golden shield / radiant coin */}
      <circle cx="50" cy="50" r="23" fill="#e6b325" stroke="#fdf0a6" strokeWidth="1.5" />
      
      {/* Stylized BCV emblem scales and liberty laurel inside shield */}
      {/* Central pillar / scale beam */}
      <path
        d="M50 33 L50 67 M41 40 L59 40 M38 43 L44 54 L38 54 Z M56 43 L62 54 L56 54 Z"
        stroke="#0d254c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#f6c845"
      />
      
      {/* Central sun burst star */}
      <circle cx="50" cy="37" r="3.5" fill="#0d254c" />
      <circle cx="50" cy="37" r="1.8" fill="#ffffff" />
      
      {/* Laurel branches */}
      <path
        d="M32 54 C32 64 42 70 50 70 C58 70 68 64 68 54"
        stroke="#f6c845"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* BCV Text arc top and bottom */}
      <text
        x="50"
        y="19"
        textAnchor="middle"
        fill="#f6c845"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
        letterSpacing="1"
      >
        BCV
      </text>
      <text
        x="50"
        y="86"
        textAnchor="middle"
        fill="#fdf0a6"
        fontSize="5.2"
        fontWeight="900"
        fontFamily="sans-serif"
        letterSpacing="0.8"
      >
        VENEZUELA
      </text>
    </svg>
  );
};
