import React from 'react'
import { TestimonialCarousel } from './TestimonialCarousel'
import { cn } from '@/lib/utils'

export interface TestimonialSectionProps {
  heading?: string
  subheading?: string
  className?: string
}

export const TestimonialSection: React.FC<TestimonialSectionProps> = ({ heading = 'Loved by platform teams', subheading, className }) => {
  return (
    <section className={cn('relative pt-12 pb-8', className)} aria-labelledby='testimonial-heading'>
      <div className='max-w-6xl mx-auto px-6 space-y-8 text-center'>
        <h2 id='testimonial-heading' className='text-3xl md:text-4xl font-semibold text-foreground'>{heading}</h2>
        {subheading && <p className='max-w-2xl mx-auto text-muted-foreground'>{subheading}</p>}
        <TestimonialCarousel />
      </div>
    </section>
  )
}
