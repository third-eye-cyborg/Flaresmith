'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function BillingPage() {
  const tier: 'free' | 'pro' | 'enterprise' = 'free';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout(planId: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/billing/web/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, successUrl: window.location.href, cancelUrl: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error?.message || 'Checkout failed');
      } else {
        setMessage('Redirecting to Polar checkout...');
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      }
    } catch (e: any) {
      setMessage(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='gradient-bg min-h-[calc(100vh-4rem)] py-12'>
      <div className='max-w-5xl mx-auto px-6 space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text'>
            Billing & Subscription
          </h1>
          <p className='text-muted-foreground'>Manage your subscription and view usage metrics.</p>
        </header>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Current Plan</p>
            <p className='text-2xl font-bold capitalize'>{tier}</p>
            <p className='text-xs text-muted-foreground'>{tier === 'free' ? '$0/month' : tier === 'pro' ? '$79/month' : 'Custom pricing'}</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Projects</p>
            <p className='text-2xl font-bold'>0 / {tier === 'free' ? '3' : '∞'}</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Next Billing</p>
            <p className='text-2xl font-bold'>{tier === 'free' ? 'N/A' : 'Dec 24, 2025'}</p>
          </div>
        </div>

        {message && (
          <div className='glass rounded-xl p-4 border border-primary-500/20'>
            <p className='text-sm text-primary-300'>{message}</p>
          </div>
        )}

        <div className='glass rounded-xl p-8 space-y-6'>
          <h3 className='text-xl font-semibold'>Upgrade Your Plan</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='border border-white/10 rounded-xl p-6 space-y-4 hover:border-primary-500/30 transition-colors'>
              <div>
                <h4 className='text-lg font-semibold'>Pro</h4>
                <p className='text-3xl font-bold mt-2'>$79<span className='text-sm text-muted-foreground'>/month</span></p>
              </div>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>✓ Unlimited projects</li>
                <li>✓ Advanced environments</li>
                <li>✓ Priority support</li>
                <li>✓ Custom workflows</li>
              </ul>
              <Button
                variant='gradient'
                className='w-full rounded-lg'
                loading={loading}
                spinnerPosition='right'
                disabled={loading}
                onClick={() => startCheckout('plan_pro')}
              >
                {loading ? 'Processing…' : 'Upgrade to Pro'}
              </Button>
            </div>
            <div className='border border-white/10 rounded-xl p-6 space-y-4 hover:border-primary-500/30 transition-colors'>
              <div>
                <h4 className='text-lg font-semibold'>Enterprise</h4>
                <p className='text-3xl font-bold mt-2'>Custom</p>
              </div>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>✓ Everything in Pro</li>
                <li>✓ Dedicated support</li>
                <li>✓ SLA guarantees</li>
                <li>✓ Custom integrations</li>
              </ul>
              <Button
                variant='gradient'
                className='w-full rounded-lg'
                loading={loading}
                spinnerPosition='right'
                disabled={loading}
                onClick={() => startCheckout('plan_enterprise')}
              >
                {loading ? 'Processing…' : 'Contact Sales'}
              </Button>
            </div>
          </div>
        </div>

        {tier !== 'free' && (
          <div className='glass rounded-xl p-6 space-y-4'>
            <h3 className='font-semibold'>Payment Method</h3>
            <p className='text-sm text-muted-foreground'>Visa ending in 4242</p>
            <Button variant='link' className='text-sm px-0'>Update payment method →</Button>
          </div>
        )}
      </div>
    </div>
  );
}
