'use client'

import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium transition-colors rounded-lg disabled:opacity-40 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-brand-violet text-white hover:bg-brand-violet-dark',
    secondary: 'bg-ui-bg-secondary text-ui-text-primary border border-ui-border hover:bg-ui-bg-tertiary',
    ghost: 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-md',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
