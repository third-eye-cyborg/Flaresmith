import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { initiatePurchase } from '../../src/billing/purchaseBridge';

/**
 * Subscription Screen (T078)
 * Displays current tier (placeholder) and allows upgrade via purchase bridge.
 * In production, fetch current subscription from API and show status/period end.
 */
export default function SubscriptionScreen() {
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upgrade(productId: string) {
    setLoading(true);
    setMessage(null);
    const result = await initiatePurchase(productId);
    setLoading(false);
    if (result.success && result.tier) {
      setTier(result.tier);
      setMessage(`Upgraded to ${result.tier}`);
    } else {
      setMessage(result.message || 'Upgrade failed');
    }
  }

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Subscription</Text>
      <Text style={{ marginBottom: 16 }}>Current Tier: {tier}</Text>
      {message && <Text style={{ marginBottom: 16 }}>{message}</Text>}
      <Pressable
        disabled={loading}
        onPress={() => upgrade('prod_pro')}
        style={{
          backgroundColor: '#2563eb',
          padding: 12,
          borderRadius: 6,
          opacity: loading ? 0.5 : 1,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>{loading ? 'Processing...' : 'Upgrade to Pro'}</Text>
      </Pressable>
      <Pressable
        disabled={loading}
        onPress={() => upgrade('prod_enterprise')}
        style={{
          backgroundColor: '#9333ea',
          padding: 12,
          borderRadius: 6,
          opacity: loading ? 0.5 : 1,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>{loading ? 'Processing...' : 'Upgrade to Enterprise'}</Text>
      </Pressable>
    </View>
  );
}
