'use client';

import { useState, useEffect } from 'react';
import { neonAuthClient } from '@/auth/neonClient';

export default function MfaSetupPage() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setupMfa = async () => {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) return;

      try {
        const { qrCode: qr, secret: sec } = await neonAuthClient.setupMfa(token);
        setQrCode(qr);
        setSecret(sec);
      } catch (err) {
        setError('Failed to initialize MFA setup');
      }
    };

    setupMfa();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/mfa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: verifyCode })
      });

      if (!res.ok) throw new Error('Verification failed');

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2">MFA Enabled</h2>
            <p className="text-gray-600">Two-factor authentication is now active on your account.</p>
            <a href="/admin/dashboard" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Set Up Two-Factor Authentication</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Step 1: Scan QR Code</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use an authenticator app like Google Authenticator or Authy to scan this code:
            </p>
            {qrCode && (
              <div className="flex justify-center p-4 bg-gray-50 rounded">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Step 2: Or Enter Secret Manually</h3>
            <code className="block p-3 bg-gray-100 rounded text-sm break-all">
              {secret}
            </code>
          </div>

          <form onSubmit={handleVerify}>
            <h3 className="font-medium mb-2">Step 3: Verify Setup</h3>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              maxLength={6}
              pattern="[0-9]{6}"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Enable MFA'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
