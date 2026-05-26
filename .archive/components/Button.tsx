import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  icon, 
  size = 'md',
  className = '', 
  ...props 
}) => {
  // Vercel-style button base
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-accents-5 rounded-md";
  
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  const variants = {
    // Primary: Inverted contrast. Dark mode = White bg/Black text. Light mode = Black bg/White text.
    primary: "bg-accents-8 text-background hover:bg-accents-7 border border-transparent shadow-[0_0_0_1px_transparent]",
    // Secondary: Background matches container, Bordered.
    secondary: "bg-background text-accents-8 border border-accents-2 hover:border-accents-5 hover:text-accents-8",
    // Red text for danger
    danger: "bg-background text-error border border-error/20 hover:bg-error/10 hover:border-error/50",
    // Ghost
    ghost: "bg-transparent text-accents-5 hover:text-accents-8 hover:bg-accents-1",
  };

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};