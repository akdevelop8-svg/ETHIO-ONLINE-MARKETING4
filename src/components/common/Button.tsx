import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'platform';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none whitespace-nowrap cursor-pointer";
  
  const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5",
    icon: "p-2 text-sm w-9 h-9"
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 hover:shadow-purple-500/30 border border-white/10",
    secondary: "bg-[#1E293B] text-slate-100 hover:bg-[#283548] border border-slate-700/60 hover:border-slate-600 shadow-sm",
    outline: "bg-transparent text-slate-200 border border-slate-700 hover:border-indigo-500/60 hover:text-indigo-400 hover:bg-indigo-500/5",
    ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60",
    danger: "bg-red-600/90 text-white hover:bg-red-500 border border-red-500/40 shadow-sm shadow-red-600/20",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500/40 shadow-sm shadow-emerald-600/20",
    platform: "bg-[#090C14] text-indigo-400 border border-indigo-500/30 hover:border-indigo-400 hover:bg-[#111927]"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      )}
      {!isLoading && leftIcon && (
        <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>
      )}
    </button>
  );
};
