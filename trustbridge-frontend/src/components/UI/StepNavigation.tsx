import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/helpers';

export interface Step {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  current?: boolean;
  disabled?: boolean;
}

interface StepNavigationProps {
  steps: Step[];
  onStepClick?: (stepId: string) => void;
  className?: string;
  showConnectors?: boolean;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  steps,
  onStepClick,
  className,
  showConnectors = true
}) => {
  return (
    <nav className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center max-w-full overflow-x-auto pb-2 scrollbar-hide">
        {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step Item */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-shrink-0",
              step.current
                ? "bg-primary-blue/10 border border-primary-blue/30 text-primary-blue"
                : step.completed
                ? "bg-primary-blue/5 border border-primary-blue/20 text-primary-blue hover:bg-primary-blue/10 cursor-pointer"
                : step.disabled
                ? "bg-dark-gray/50 border border-medium-gray/30 text-medium-gray cursor-not-allowed"
                : "bg-dark-gray border border-medium-gray/30 text-off-white hover:bg-dark-gray/80 cursor-pointer"
            )}
            onClick={() => !step.disabled && onStepClick?.(step.id)}
          >
            {/* Step Number/Icon */}
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all duration-200 flex-shrink-0",
                step.current
                  ? "bg-primary-blue text-black"
                  : step.completed
                  ? "bg-primary-blue text-black"
                  : step.disabled
                  ? "bg-medium-gray/50 text-medium-gray"
                  : "bg-medium-gray text-off-white"
              )}
            >
              {step.completed ? (
                <Check className="w-3 h-3" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {/* Step Content */}
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-xs whitespace-nowrap">{step.title}</span>
              {step.description && (
                <span className="text-xs text-medium-gray truncate max-w-20">{step.description}</span>
              )}
            </div>
          </div>

          {/* Connector */}
          {showConnectors && index < steps.length - 1 && (
            <ChevronRight className="w-3 h-3 text-medium-gray mx-1 flex-shrink-0" />
          )}
        </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default StepNavigation;
