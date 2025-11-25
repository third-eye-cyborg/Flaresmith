import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide border transition-colors select-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary/20 text-primary border-primary/30',
        accent: 'bg-accent/20 text-accent-foreground border-accent/30',
        outline: 'bg-transparent text-foreground border-foreground/30',
        glass: 'bg-white/10 text-white border-white/20 backdrop-blur-sm',
      },
      size: {
        sm: 'text-[10px] h-5',
        md: 'text-xs h-6',
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'sm'
    }
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, size, ...props }, ref) => {
  return <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
})
Badge.displayName = 'Badge'

export { badgeVariants }
