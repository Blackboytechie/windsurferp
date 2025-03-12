// Define plan tiers and their features
export const PLAN_FEATURES = {
  free: {
    maxUsers: 3,
    maxProjects: 5,
    hasInventoryManagement: true,
    hasAdvancedReporting: false,
    hasMultiCurrency: false,
    hasApiAccess: false,
  },
  starter: {
    maxUsers: 10,
    maxProjects: 20,
    hasInventoryManagement: true,
    hasAdvancedReporting: true,
    hasMultiCurrency: false,
    hasApiAccess: false,
  },
  professional: {
    maxUsers: 50,
    maxProjects: 100,
    hasInventoryManagement: true,
    hasAdvancedReporting: true,
    hasMultiCurrency: true,
    hasApiAccess: true,
  },
  enterprise: {
    maxUsers: -1, // Unlimited
    maxProjects: -1, // Unlimited
    hasInventoryManagement: true,
    hasAdvancedReporting: true,
    hasMultiCurrency: true,
    hasApiAccess: true,
  },
};

// Get features for a specific plan
export function getPlanFeatures(planName: string) {
  return PLAN_FEATURES[planName as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;
}

// Check if a plan has access to a specific feature
export function canUseFeature(planName: string, featureName: string): boolean {
  const plan = getPlanFeatures(planName);
  return !!plan[featureName as keyof typeof plan];
}