import React, { forwardRef } from 'react';
import { cn } from '../../utils/helpers';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          "border-border-primary bg-background-secondary text-text-primary placeholder:text-text-tertiary focus:ring-primary-blue shadow-sm",
          {
            "border-error focus:ring-error": variant === 'error',
            "border-primary-blue focus:ring-primary-blue": variant === 'success',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;