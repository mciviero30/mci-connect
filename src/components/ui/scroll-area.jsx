
import * as React from "react"
import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-auto", className)}
    style={{
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(59, 159, 243, 0.3) transparent',
      WebkitOverflowScrolling: 'touch'
    }}
    {...props}
  >
    {children}
  </div>
))
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef(({ className, orientation = "vertical", ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
