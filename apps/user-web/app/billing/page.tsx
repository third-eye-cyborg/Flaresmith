import { useState } from 'react';

/**
 * Billing Page (T079)
 * Shows current subscription tier and provides a button to initiate Polar checkout.
 * For now, uses simple fetch to /billing/web/checkout with planId.
 */
export default function BillingPage() {
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-3">Billing</h1>
      <p className="mb-4">Current Tier: {tier}</p>
      {message && <p className="mb-4 text-sm">{message}</p>}
      <button
        disabled={loading}
        onClick={() => startCheckout('plan_pro')}
        className={`bg-blue-600 text-white px-4 py-3 rounded-md mr-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Processing…' : 'Upgrade to Pro'}
      </button>
      <button
        disabled={loading}
        onClick={() => startCheckout('plan_enterprise')}
        className={`bg-purple-600 text-white px-4 py-3 rounded-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Processing…' : 'Upgrade to Enterprise'}
      </button>
    </div>
  );
}
