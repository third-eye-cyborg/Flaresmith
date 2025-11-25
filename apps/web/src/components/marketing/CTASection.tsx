import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CTASectionProps {
  heading: string
  body?: string
  primaryCta: { label: string; href: string; variant?: string }
  secondaryCta?: { label: string; href: string; variant?: string }
  className?: string
}

export const CTASection: React.FC<CTASectionProps> = ({ heading, body, primaryCta, secondaryCta, className }) => {
  return (
    <section className={cn('relative pt-16 pb-20', className)} aria-labelledby='cta-heading'>
      <div className='max-w-5xl mx-auto px-6 text-center space-y-6'>
        <h2 id='cta-heading' className='text-3xl md:text-4xl font-semibold text-foreground'>{heading}</h2>
        {body && <p className='max-w-xl mx-auto text-muted-foreground'>{body}</p>}
        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <a href={primaryCta.href}>
            <Button size='lg' variant={primaryCta.variant as any || 'default'}>{primaryCta.label}</Button>
          </a>
          {secondaryCta && (
            <a href={secondaryCta.href}>
              <Button size='lg' variant={secondaryCta.variant as any || 'outline'}>{secondaryCta.label}</Button>
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
