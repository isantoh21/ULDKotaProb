import React from 'react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProbolinggoBadge: React.FC<Props> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 via-sky-700 to-emerald-950 text-white font-bold shadow-sm shadow-sky-800/10 ${sizeClasses[size]} ${className}`}>
      <svg className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Stylized shield & heart/inclusion leaf for Kota Probolinggo ULD */}
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <span className="sr-only">Logo ULD Kota Probolinggo</span>
    </div>
  );
};
