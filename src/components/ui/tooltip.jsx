import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }) => {
  return <>{children}</>
}

const Tooltip = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { open })
        }
        return child
      })}
    </div>
  )
}

const TooltipTrigger = React.forwardRef(({ className, children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      className: cn("cursor-pointer", className, children.props.className),
      ...props
    });
  }
  
  return (
    <div ref={ref} className={cn("cursor-pointer", className)} {...props}>
      {children}
    </div>
  );
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, children, open, ...props }, ref) => {
  if (!open) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 px-3 py-1.5 text-sm rounded-md shadow-md",
        "bg-slate-900 text-white border border-slate-800",
        "animate-in fade-in-0 zoom-in-95",
        "pointer-events-none",
        "left-1/2 -translate-x-1/2 bottom-full mb-2",
        "whitespace-nowrap",
        className
      )}
      style={{ marginBottom: sideOffset }}
      {...props}
    >
      {children}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-900 border-r border-b border-slate-800 rotate-45 -mt-1" />
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }