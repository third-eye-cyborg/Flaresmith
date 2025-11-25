import React, { useState } from 'react'
export const metadata = { title: 'Pricing - Flaresmith' };
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    // Simulate async action
    setTimeout(() => setLoadingTier(null), 1200)
  }
  return (
    <div className='relative min-h-screen py-16 overflow-hidden'>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,107,53,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(74,144,226,0.15),transparent_55%)]" />
      <div className='max-w-7xl mx-auto px-6 space-y-12 relative'>
        <header className='text-center space-y-4'>
          <h1 className='text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary text-transparent bg-clip-text animate-in fade-in slide-in-from-top-4 duration-700'>Pricing</h1>
          <p className='text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-top-6 duration-700 delay-100'>Transparent tiers with environment parity, security & observability baked in.</p>
        </header>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {tiers.map(t => (
            <div key={t.name} className='glass rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/40 transition-colors border border-white/10'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-semibold'>{t.name}</h2>
                <Badge className='ml-auto'>{t.badge}</Badge>
              </div>
              <div className='flex items-baseline gap-2'>
                <span className='text-4xl font-bold'>{t.price}</span>
                <span className='text-xs uppercase tracking-wide text-muted-foreground'>{t.cadence}</span>
              </div>
              <p className='text-sm text-muted-foreground'>{t.description}</p>
              <ul className='space-y-1 text-sm text-muted-foreground mt-2'>
                {t.features.map(f => <li key={f} className='flex items-center gap-2'><span className='text-primary'>✓</span>{f}</li>)}
              </ul>
              <Button
                variant='gradient'
                className='mt-4 w-full'
                loading={loadingTier === t.name}
                onClick={() => handleSelect(t.name)}
                spinnerPosition='right'
              >
                {loadingTier === t.name ? 'Processing' : 'Select'}
              </Button>
            </div>
          ))}
        </div>
        <section className='text-center space-y-6 pt-8'>
          <h2 className='text-3xl font-semibold bg-gradient-to-r from-primary/80 to-accent/80 text-transparent bg-clip-text'>Not sure where to start?</h2>
          <p className='max-w-xl mx-auto text-muted-foreground'>Begin on the free tier, upgrade when you need production promotion workflow guarantees. Enterprise? We’ll tailor SLAs & compliance.</p>
          <div className='flex justify-center gap-4'>
            <Button variant='glass' size='lg' asChild>
              <a href='/features'>Explore Features</a>
            </Button>
            <Button variant='gradient' size='lg' asChild>
              <a href='/projects'>Launch Dashboard</a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
