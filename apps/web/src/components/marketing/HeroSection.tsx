import React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CTA {
  label: string
  href: string
  variant?: string
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  analyticsId?: string
}

interface Metric {
  label: string
  value: string
}

export interface HeroSectionProps {
  eyebrow?: string
  title: string
  subtitle?: string
  primaryCta: CTA
  secondaryCta?: CTA
  metrics?: Metric[]
  className?: string
  backgroundIntensity?: 'subtle' | 'default' | 'strong'
  hideMetricsOnMobile?: boolean
}

export const HeroSection: React.FC<HeroSectionProps> = ({ eyebrow, title, subtitle, primaryCta, secondaryCta, metrics, className, hideMetricsOnMobile = true }) => {
  return (
    <section className={cn('relative pt-32 pb-20 md:pt-40 md:pb-28 text-center overflow-hidden', className)} aria-labelledby='hero-heading'>
      <div className='relative max-w-6xl mx-auto px-6 space-y-8'>
        {eyebrow && (
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary backdrop-blur-sm'>
            {eyebrow}
          </div>
        )}
        <h1 id='hero-heading' className='text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-foreground max-w-5xl mx-auto'>
          {title}
        </h1>
        {subtitle && <p className='text-xl md:text-2xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed'>{subtitle}</p>}
        <div className='flex flex-col sm:flex-row gap-4 justify-center pt-6'>
          <a
            href={primaryCta.href}
            target={primaryCta.href.startsWith('http') ? '_blank' : undefined}
            rel={primaryCta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            data-analytics-id={primaryCta.analyticsId || 'hero-primary-cta'}
            className={cn(
              buttonVariants({ variant: (primaryCta.variant as any) || 'default', size: 'lg' }),
              'gap-2 text-base px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all'
            )}
          >
            {primaryCta.iconLeft}<span>{primaryCta.label}</span>{primaryCta.iconRight}
          </a>
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              target={secondaryCta.href.startsWith('http') ? '_blank' : undefined}
              rel={secondaryCta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              data-analytics-id={secondaryCta.analyticsId || 'hero-secondary-cta'}
              className={cn(
                buttonVariants({ variant: (secondaryCta.variant as any) || 'outline', size: 'lg' }),
                'gap-2 text-base px-8 py-6 hover:bg-primary/10 transition-all'
              )}
            >
              {secondaryCta.iconLeft}<span>{secondaryCta.label}</span>{secondaryCta.iconRight}
            </a>
          )}
        </div>
        {metrics && metrics.length > 0 && (
          <div className={cn('grid gap-8 pt-12', hideMetricsOnMobile ? 'hidden md:grid md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3')}>
            {metrics.map(m => (
              <div key={m.label} className='flex flex-col items-center gap-2'>
                <span className='text-4xl md:text-5xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent'>{m.value}</span>
                <span className='text-sm uppercase tracking-wider text-muted-foreground font-medium'>{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
