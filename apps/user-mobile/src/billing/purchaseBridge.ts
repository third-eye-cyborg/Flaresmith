/**
 * Expo-Polar Purchase Bridge (T076)
 * 
 * Abstracts platform-specific in-app purchase (IAP) or Polar checkout token retrieval.
 * For initial implementation we simulate a purchase and produce a pseudo receiptToken.
 * In production, integrate with StoreKit (iOS) / Google Play Billing (Android) or Polar mobile checkout.
 * 
 * Flow:
 * 1. Initiate purchase for productId
 * 2. Obtain receipt token (native platform receipt or Polar purchase token)
 * 3. POST to backend /billing/mobile/receipt with { receiptToken, productId, platform }
 * 4. Backend validates, updates subscription tier, returns updated tier
 */

// Platform detection without react-native types to avoid type issues in monorepo root typecheck

export interface PurchaseResult {
  success: boolean;
  tier?: 'free' | 'pro' | 'enterprise';
  message?: string;
}

export async function initiatePurchase(productId: string): Promise<PurchaseResult> {
  // Simulate native IAP receipt token (hash of product + timestamp)
  const receiptToken = `${productId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  // Send receipt to backend
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform: 'ios' | 'android' = /Android/i.test(ua) ? 'android' : 'ios';

  try {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/billing/mobile/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptToken, productId, platform }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.error?.message || 'Purchase failed' };
    }

    const data = await res.json();
    return { success: true, tier: data.tier };
  } catch (e: any) {
    return { success: false, message: e.message || 'Network error' };
  }
}

// Future: validate entitlement locally before calling backend, handle retries & idempotency key caching.
