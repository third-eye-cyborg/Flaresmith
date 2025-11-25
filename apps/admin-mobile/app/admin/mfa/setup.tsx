import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { neonAuthFlow } from '@/auth/neonAuthFlow';

export default function MfaSetupScreen() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const setupMfa = async () => {
      try {
        const token = await neonAuthFlow.getAccessToken();
        if (!token) return;

        const response = await fetch('https://api.example.com/admin/mfa/setup', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } catch (err) {
        setError('Failed to initialize MFA setup');
      }
    };

    setupMfa();
  }, []);

  const handleVerify = async () => {
    try {
      const token = await neonAuthFlow.getAccessToken();
      if (!token) return;

      const response = await fetch('https://api.example.com/admin/mfa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verifyCode }),
      });

      if (!response.ok) throw new Error('Verification failed');

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.title}>MFA Enabled</Text>
        <Text style={styles.subtitle}>Two-factor authentication is now active.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Up Two-Factor Authentication</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Scan QR Code</Text>
        {qrCode && <Image source={{ uri: qrCode }} style={styles.qrCode} />}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Or Enter Secret</Text>
        <Text style={styles.secret}>{secret}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 3: Verify Setup</Text>
        <TextInput
          style={styles.input}
          value={verifyCode}
          onChangeText={setVerifyCode}
          placeholder="Enter 6-digit code"
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          <Text style={styles.buttonText}>Enable MFA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  successIcon: { fontSize: 72, textAlign: 'center', color: '#10b981', marginBottom: 16 },
  error: { backgroundColor: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  qrCode: { width: 200, height: 200, alignSelf: 'center' },
  secret: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, fontFamily: 'monospace' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
