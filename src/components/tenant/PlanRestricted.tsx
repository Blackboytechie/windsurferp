import React from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { AlertCircle } from 'lucide-react';

interface PlanRestrictedProps {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PlanRestricted({ feature, fallback, children }: PlanRestrictedProps) {
  const { canUseFeature, currentTenant } = useTenant();
  
  if (!currentTenant) {
    return null;
  }
  
  if (canUseFeature(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-medium">Feature not available</h3>
      </div>
      <p className="mt-1 text-sm text-amber-600">
        This feature requires a higher plan. Please upgrade to access {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}.
      </p>
    </div>
  );
}