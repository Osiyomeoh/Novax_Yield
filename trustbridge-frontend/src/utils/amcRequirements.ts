/**
 * AMC (Asset Management Company) Requirements Utility
 * 
 * Determines which asset categories require AMC partnership
 * for regulatory compliance and proper asset management.
 */

export interface CategoryInfo {
  id: number;
  name: string;
  requiresAMC: boolean;
  type: 'digital' | 'rwa';
  description: string;
  comingSoon?: boolean;
}

/**
 * Check if an asset category requires AMC partnership
 */
export const requiresAMC = (categoryId: number): boolean => {
  const amcRequiredCategories = [
    7,  // Real Estate
    8,  // Commodities
    9,  // Intellectual Property
    13  // Financial Instruments
  ];
  return amcRequiredCategories.includes(categoryId);
};

/**
 * Get the type of asset (digital or RWA)
 */
export const getCategoryType = (categoryId: number): 'digital' | 'rwa' => {
  return requiresAMC(categoryId) ? 'rwa' : 'digital';
};

/**
 * Get AMC requirement message for a category
 */
export const getAMCRequirementMessage = (categoryName: string): string => {
  return `${categoryName} is a Real World Asset (RWA) that requires partnership with a licensed Asset Management Company (AMC) for regulatory compliance, professional oversight, and investor protection.`;
};

/**
 * Get coming soon message for RWA categories
 */
export const getComingSoonMessage = (): string => {
  return 'RWA tokenization with AMC integration is currently in development and will be available in Q2 2025. Join our waitlist to be notified when it launches!';
};

/**
 * Get all category information with AMC requirements
 */
export const getCategoryInfo = (categoryId: number, categoryName: string): CategoryInfo => {
  const requiresAMCPartnership = requiresAMC(categoryId);
  const type = getCategoryType(categoryId);
  
  return {
    id: categoryId,
    name: categoryName,
    requiresAMC: requiresAMCPartnership,
    type,
    description: requiresAMCPartnership 
      ? getAMCRequirementMessage(categoryName)
      : `Create and tokenize ${categoryName} directly without AMC partnership.`,
    comingSoon: requiresAMCPartnership // RWA features coming soon
  };
};

/**
 * Get all RWA category IDs
 */
export const getRWACategoryIds = (): number[] => {
  return [7, 8, 9, 13];
};

/**
 * Get all digital asset category IDs
 */
export const getDigitalCategoryIds = (): number[] => {
  return [6, 10, 11, 12, 14, 15];
};

/**
 * Check if user can create this asset type
 * (Currently only digital assets are allowed)
 */
export const canCreateAsset = (categoryId: number, isAMC: boolean = false): boolean => {
  const isRWA = requiresAMC(categoryId);
  
  // RWA requires AMC partnership
  if (isRWA && !isAMC) {
    return false;
  }
  
  // Digital assets can be created by anyone
  return true;
};

/**
 * Get user-friendly status message
 */
export const getStatusMessage = (categoryId: number, isAMC: boolean = false): {
  canCreate: boolean;
  message: string;
  action: 'create' | 'waitlist' | 'partner';
} => {
  const isRWA = requiresAMC(categoryId);
  
  if (!isRWA) {
    return {
      canCreate: true,
      message: 'You can create this asset now!',
      action: 'create'
    };
  }
  
  if (isRWA && isAMC) {
    return {
      canCreate: true,
      message: 'As a licensed AMC, you can create this asset.',
      action: 'create'
    };
  }
  
  return {
    canCreate: false,
    message: 'This asset type requires AMC partnership. Feature coming Q2 2025.',
    action: 'waitlist'
  };
};

/**
 * AMC-related constants
 */
export const AMC_CONSTANTS = {
  LAUNCH_DATE: 'Q2 2025',
  WAITLIST_EMAIL: 'waitlist@trustbridge.africa',
  LEARN_MORE_URL: '/amc/about',
  PARTNER_URL: '/amc/directory',
  MIN_AMC_CAPITAL: '$100,000',
  AMC_FEE_STRUCTURE: {
    management: '1% annually',
    performance: '10% of profits',
    setup: '$1,000 one-time'
  }
};




