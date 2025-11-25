import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-primary to-accent text-white shadow-md hover:shadow-lg hover:brightness-110",
        glass: "bg-white/10 backdrop-blur-sm border border-white/15 text-white hover:bg-white/15",
        subtle: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      tone: {
        brand: "",
        success: "bg-green-600 hover:bg-green-500 text-white",
        warning: "bg-amber-500 hover:bg-amber-400 text-white",
        danger: "bg-red-600 hover:bg-red-500 text-white",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  spinnerPosition?: 'left' | 'right'
}

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
)

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, tone, asChild = false, loading = false, spinnerPosition = 'left', children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, tone, className }), loading && 'cursor-wait')}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && spinnerPosition === 'left' && <Spinner />}
        <span className={loading ? 'opacity-80' : undefined}>{children}</span>
        {loading && spinnerPosition === 'right' && <Spinner />}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
