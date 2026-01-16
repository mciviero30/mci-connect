import React from "react";
import { cn } from "@/lib/utils";

/**
 * PageContainer - Unified page wrapper for consistent layout
 * 
 * Usage:
 * <PageContainer>
 *   <PageHeader ... />
 *   Page content
 * </PageContainer>
 */
export default function PageContainer({ children, className, maxWidth = "7xl" }) {
  const maxWidthClasses = {
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    "full": "max-w-full"
  };

  return (
    <div className={cn(
      "min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0",
      className
    )}>
      <div className={cn(
        "mx-auto p-4 md:p-8",
        maxWidthClasses[maxWidth] || maxWidthClasses["7xl"]
      )}>
        {children}
      </div>
    </div>
  );
}