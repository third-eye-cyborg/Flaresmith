import React from 'react'
import { cn } from '@/lib/utils'

export interface GradientBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'aurora' | 'mesh' | 'radial'
  intensity?: 'subtle' | 'default' | 'strong'
  disableMotion?: boolean
}

// Decorative background component reserving layout space (no CLS) and respecting reduced motion.
export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  variant = 'aurora',
  intensity = 'default',
  className,
  disableMotion,
  ...rest
}) => {
  const shouldReduce = disableMotion || typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const opacityMap = {
    subtle: 'opacity-30',
    default: 'opacity-50',
    strong: 'opacity-70'
  }[intensity]

  const variantClass = {
    aurora: cn('bg-gradient-aurora bg-[length:200%_200%]', !shouldReduce && 'animate-aurora-slow'),
    mesh: 'bg-mesh-soft',
    radial: 'bg-radial-fade'
  }[variant]

  return (
    <div
      aria-hidden='true'
      className={cn('pointer-events-none absolute inset-0 select-none', variantClass, opacityMap, className)}
      {...rest}
    />
  )
}
