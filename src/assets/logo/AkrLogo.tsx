import React from 'react';
import logoImg from './akr_logo.png';

interface AkrLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'image' | 'vector';
  showTagline?: boolean;
}

export const AkrLogo: React.FC<AkrLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'image',
  showTagline = true,
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-28',
  };

  if (variant === 'image') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src={logoImg}
          alt="AKR Credit Capital"
          className={`${sizeClasses[size]} object-contain filter drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)] transition-transform duration-300`}
        />
      </div>
    );
  }

  // Fallback crisp SVG vector in case of vector preference
  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      <div className="flex items-center gap-1">
        <span className="font-serif font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#F3D98B] via-[#D4AF37] to-[#C99A2E] text-2xl md:text-3xl filter drop-shadow">
          AKR
        </span>
        <div className="h-4 w-[1px] bg-akr-gold/50 mx-1" />
        <span className="font-sans font-semibold tracking-widest text-xs uppercase text-[#F3D98B]/90">
          Credit Capital
        </span>
      </div>
      {showTagline && (
        <span className="font-sans tracking-widest text-[9px] uppercase text-akr-text-muted mt-1">
          Building Possibilities Together
        </span>
      )}
    </div>
  );
};

export default AkrLogo;
