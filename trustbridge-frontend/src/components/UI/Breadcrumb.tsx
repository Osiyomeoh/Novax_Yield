import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/helpers';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  backButtonText?: string;
  onBack?: () => void;
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showBackButton = false,
  backButtonText = 'Back',
  onBack,
  className
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <nav className={cn("flex items-center space-x-2 text-sm", className)}>
      {/* Back Button */}
      {showBackButton && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-3 py-2 text-medium-gray hover:text-off-white transition-colors duration-200 hover:bg-dark-gray/50 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backButtonText}</span>
        </button>
      )}

      {/* Home Link */}
      <Link
        to="/"
        className="flex items-center gap-1 px-2 py-1 text-medium-gray hover:text-off-white transition-colors duration-200 rounded"
      >
        <Home className="w-4 h-4" />
        <span>Home</span>
      </Link>

      {/* Breadcrumb Items */}
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-medium-gray" />
          {item.href && !item.current ? (
            <Link
              to={item.href}
              className="flex items-center gap-1 px-2 py-1 text-medium-gray hover:text-off-white transition-colors duration-200 rounded"
            >
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded",
                item.current
                  ? "text-primary-blue bg-primary-blue/10"
                  : "text-medium-gray"
              )}
            >
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              <span>{item.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
