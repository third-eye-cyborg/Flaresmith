"use client"
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Quote } from 'lucide-react'

interface Testimonial {
  id: number
  quote: string
  author: string
  role: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote: 'Flaresmith eliminated our environment drift. Promotion to prod is now a non-event.',
    author: 'Ava L.',
    role: 'Platform Lead'
  },
  {
    id: 2,
    quote: 'Spec-first contracts mean zero surprises in downstream integrations.',
    author: 'Noah K.',
    role: 'Staff Engineer'
  },
  {
    id: 3,
    quote: 'Secrets sync & validation saved us from a production outage during a rotation.',
    author: 'Maya R.',
    role: 'Security Engineer'
  }
]

export interface TestimonialCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  intervalMs?: number
}

export const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({ className, intervalMs = 5000 }) => {
  const [index, setIndex] = React.useState(0)
  const [paused, setPaused] = React.useState(false)

  React.useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setIndex(i => (i + 1) % testimonials.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [paused, intervalMs])

  const active = testimonials[index]
  if (!active) return null

  return (
    <div
      className={cn('relative mx-auto max-w-3xl rounded-2xl border border-white/10 glass p-8 text-center select-none', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-live='polite'
    >
      <Quote className='w-10 h-10 mx-auto mb-4 text-primary' aria-hidden='true' />
      <p className='text-lg md:text-xl font-medium leading-relaxed'>{active.quote}</p>
      <div className='mt-4 text-sm text-muted-foreground'>
        <span className='font-semibold text-foreground'>{active.author}</span> · {active.role}
      </div>
      <div className='flex justify-center gap-2 mt-6'>
        {testimonials.map((t, i) => (
          <button
            key={t.id}
            aria-label={`Show testimonial ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn('h-2.5 w-2.5 rounded-full transition-all', i === index ? 'bg-primary w-5' : 'bg-primary/30 hover:bg-primary/50')}
          />
        ))}
      </div>
      {paused && <span className='absolute top-2 right-3 text-[10px] uppercase tracking-wide text-muted-foreground'>Paused</span>}
    </div>
  )
}
