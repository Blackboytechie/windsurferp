import * as React from "react"
import { ForwardRefExoticComponent, RefAttributes } from 'react'

import { cn } from "@/lib/utils"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive"
}

const AlertDescription = ({ children }: { children: React.ReactNode }) => {
  return <p className="mt-2 text-sm text-gray-600">{children}</p>;
};
AlertDescription.displayName = "AlertDescription";

interface AlertComponent extends ForwardRefExoticComponent<AlertProps & RefAttributes<HTMLDivElement>> {
  Description: typeof AlertDescription;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border px-4 py-3 text-sm",
          variant === "destructive"
            ? "border-red-500 bg-red-50 text-red-700"
            : "border-gray-300 bg-gray-50 text-gray-700",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
) as AlertComponent

Alert.displayName = "Alert"
Alert.Description = AlertDescription

export { Alert as default, AlertDescription }