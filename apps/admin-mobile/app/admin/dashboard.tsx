import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { neonAuthFlow } from '../../../src/auth/neonAuthFlow';

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState({ users: 0, projects: 0, activeEnvs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = await neonAuthFlow.getAccessToken();
        if (!token) return;

        const response = await fetch('https://api.example.com/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Users</Text>
          <Text style={styles.statValue}>{stats.users}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Projects</Text>
          <Text style={styles.statValue}>{stats.projects}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Environments</Text>
          <Text style={styles.statValue}>{stats.activeEnvs}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    flex: 1,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
});
