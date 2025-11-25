import * as React from 'react'

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

type Variant = 'default' | 'gradient' | 'glass' | 'outline' | 'ghost' | 'link'
type Size = 'default' | 'sm' | 'lg' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  spinnerPosition?: 'left' | 'right'
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  gradient: 'bg-gradient-to-r from-primary to-accent text-white shadow-md hover:shadow-lg hover:brightness-110',
  glass: 'bg-white/10 backdrop-blur-sm border border-white/15 text-white hover:bg-white/15',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline'
}

const sizeClasses: Record<Size, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10'
}

const Spinner = () => (
  <svg className='animate-spin h-4 w-4 text-current' viewBox='0 0 24 24'>
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' />
  </svg>
)

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, spinnerPosition = 'left', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
          variantClasses[variant],
          sizeClasses[size],
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && spinnerPosition === 'left' && <Spinner />}
        <span className={loading ? 'opacity-80' : undefined}>{children}</span>
        {loading && spinnerPosition === 'right' && <Spinner />}
      </button>
    )
  }
)
Button.displayName = 'Button'
