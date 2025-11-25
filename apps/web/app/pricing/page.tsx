'use client';


import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeroSection } from '@/components/marketing/HeroSection'
import { CTASection } from '@/components/marketing/CTASection'

const tiers = [
  {
    name: 'Starter',
    price: '$0',
    cadence: 'per month',
    badge: 'Free Tier',
    description: 'For exploration & hobby projects',
    features: [
      '3 Projects',
      'Dev + Staging Environments',
      'GitHub Secret Validation',
      'Community Support'
    ]
  },
  {
    name: 'Growth',
    price: '$79',
    cadence: 'per month',
    badge: 'Popular',
    description: 'Scaling teams with higher velocity',
    features: [
      'Unlimited Projects',
      'Prod Environment',
      'Preview TTL Automation',
      'Design Drift Detection',
      'Priority Support'
    ]
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'annual',
    badge: 'Custom',
    description: 'Large orgs & compliance needs',
    features: [
      'SAML / SCIM',
      'Advanced Audit Events',
      'Dedicated Provisioning Limits',
      'Design System Rollback SLA',
      'Onboarding & Training'
    ]
  }
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const handleSelect = (tierName: string) => {
    setLoadingTier(tierName)
    setTimeout(() => setLoadingTier(null), 1200)
  }
  return (
    <main className='relative' role='main'>
      <HeroSection
        eyebrow='Pricing'
        title='Transparent tiers aligned with environment maturity'
        subtitle='Scale from exploration to production promotion workflows with security & observability built in.'
        primaryCta={{ label: 'Start Free', href: '/projects/new' }}
        secondaryCta={{ label: 'View Features', href: '/features' }}
      />
      <section aria-labelledby='pricing-heading' className='max-w-7xl mx-auto px-6 py-16'>
        <h2 id='pricing-heading' className='sr-only'>Pricing tiers</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {tiers.map(t => (
            <div
              key={t.name}
              className={`relative rounded-lg p-6 flex flex-col gap-4 border bg-card transition-all group ${t.name === 'Growth' ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border hover:border-primary/50'}`}
            >
              <div className='flex items-center gap-3'>
                <h3 className='text-xl font-semibold'>{t.name}</h3>
                <Badge className='ml-auto'>{t.badge}</Badge>
              </div>
              <div className='flex items-baseline gap-2'>
                <span className='text-4xl font-bold'>{t.price}</span>
                <span className='text-xs uppercase tracking-wide text-muted-foreground'>{t.cadence}</span>
              </div>
              <p className='text-sm text-muted-foreground'>{t.description}</p>
              <ul className='space-y-1 text-sm text-muted-foreground mt-2'>
                {t.features.map(f => <li key={f} className='flex items-center gap-2'><span className='text-primary' aria-hidden='true'>✓</span>{f}</li>)}
              </ul>
              <Button
                variant={t.name === 'Growth' ? 'default' : 'outline'}
                className='mt-4 w-full'
                loading={loadingTier === t.name}
                onClick={() => handleSelect(t.name)}
                spinnerPosition='right'
                data-analytics-id={`pricing-tier-select-${t.name.toLowerCase()}`}
              >
                {loadingTier === t.name ? 'Processing' : 'Select'}
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-6 py-16">
        <CTASection
          heading='Not sure where to begin?'
          body='Start with Starter, upgrade when production promotion workflows & audit history become critical.'
          primaryCta={{ label: 'Create Free Project', href: '/projects/new', variant: 'default' }}
          secondaryCta={{ label: 'View Features', href: '/features', variant: 'outline' }}
        />
      </section>
    </main>
  )
}
