import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = "rounded-2xl border transition-all duration-200 overflow-hidden";
  
  const variantClasses: Record<string, string> = {
    default: "bg-[#121824] border-slate-800/80 text-slate-100",
    elevated: "bg-[#161F2E] border-slate-700/70 shadow-lg shadow-black/40 text-slate-100",
    glass: "bg-[#121824]/90 backdrop-blur-md border-slate-800/90 text-slate-100",
    interactive: "bg-[#121824] border-slate-800/80 hover:border-slate-700 hover:bg-[#161F2E] active:scale-[0.99] cursor-pointer text-slate-100"
  };

  const paddingClasses: Record<string, string> = {
    none: "p-0",
    sm: "p-3",
    md: "p-4 sm:p-5",
    lg: "p-6"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};
