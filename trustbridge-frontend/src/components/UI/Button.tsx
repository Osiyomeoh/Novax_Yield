import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/helpers';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-sm text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-gray-400 border border-black",
        destructive: "bg-black text-white hover:bg-gray-400 border border-black",
        outline: "border border-black bg-white text-black hover:bg-gray-100 hover:text-black",
        secondary: "bg-background-tertiary text-text-primary hover:bg-background-tertiary/80 border border-border-primary",
        ghost: "hover:bg-gray-100 hover:text-black border-transparent",
        link: "underline-offset-4 hover:underline text-black border-transparent",
        neon: "bg-white border border-black text-black hover:bg-gray-100 hover:text-black transition-all duration-200",
        primary: "bg-black text-white font-medium hover:bg-gray-400 border border-black"
      },
      size: {
        xs: "h-8 px-2 text-xs",
        sm: "h-9 px-3 text-sm rounded-md",
        default: "h-10 py-2 px-4",
        lg: "h-11 px-6 text-lg rounded-md",
        xl: "h-12 px-8 text-xl rounded-md",
        icon: "h-10 w-10"
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;