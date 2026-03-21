import * as React from "react"
import { cn } from "@/lib/utils"
import { autoCapitalize } from "@/components/utils/nameHelpers"

const Input = React.forwardRef(({ className, type, autoCapitalizeInput = false, ...props }, ref) => {
  const handleChange = (e) => {
    if (autoCapitalizeInput && type !== 'email' && type !== 'password') {
      const capitalized = autoCapitalize(e.target.value);
      e.target.value = capitalized;
    }
    
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded border border-input bg-background px-2 py-1 text-[10px] ring-offset-background file:border-0 file:bg-transparent file:text-[9px] file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          "touch-action-manipulation",
          className
        )}
        style={{ fontSize: 'max(10px, 0.625rem)' }}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
  )
})
Input.displayName = "Input"

export { Input }