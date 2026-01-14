import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  className?: string;
  showLabels?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps,
  className,
  showLabels = true,
  variant = 'default'
}) => {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 bg-dark-gray rounded-full h-2">
          <div
            className="bg-primary-blue h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-medium-gray">
          {currentStep}/{totalSteps}
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-dark-gray rounded-full h-2">
            <div
              className="bg-primary-blue h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-primary-blue">
            {Math.round(progress)}% Complete
          </span>
        </div>
        {showLabels && (
          <div className="flex justify-between text-xs text-medium-gray">
            {steps.map((step, index) => (
              <span
                key={index}
                className={cn(
                  index < currentStep ? 'text-primary-blue' : 'text-medium-gray'
                )}
              >
                {step}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-off-white">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-medium-gray">
          {Math.round(progress)}% Complete
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-dark-gray rounded-full h-2">
          <div
            className="bg-primary-blue h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-1",
                index < currentStep ? 'text-primary-blue' : 'text-medium-gray'
              )}
            >
              {index < currentStep && <Check className="w-3 h-3" />}
              <span className="truncate max-w-20">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
