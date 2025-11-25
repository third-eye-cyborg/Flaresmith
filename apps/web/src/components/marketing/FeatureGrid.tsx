import React from 'react'
import { FeatureCard } from './FeatureCard'
import { cn } from '@/lib/utils'

export interface FeatureItem {
  icon: React.ReactNode
  title: string
  description: string
  href?: string
  badge?: string
}

interface FeatureGridProps {
  items: FeatureItem[]
  className?: string
  heading?: string
  subheading?: string
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({ items, className, heading, subheading }) => {
  return (
    <section className={cn('relative', className)} aria-labelledby='features-heading'>
      <div className='max-w-7xl mx-auto px-6 space-y-10'>
        {(heading || subheading) && (
          <div className='text-center space-y-4'>
            {heading && <h2 id='features-heading' className='text-3xl md:text-4xl font-semibold tracking-tight text-foreground'>{heading}</h2>}
            {subheading && <p className='max-w-xl mx-auto text-muted-foreground'>{subheading}</p>}
          </div>
        )}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {items.map(item => (
            <FeatureCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.description}
              href={item.href}
              badge={item.badge}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
