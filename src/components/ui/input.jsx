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
          "flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
  )
})
Input.displayName = "Input"

export { Input }