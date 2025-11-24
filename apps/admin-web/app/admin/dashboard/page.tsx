'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, projects: 0, activeEnvs: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    // Fetch dashboard stats
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold mt-2">{stats.users}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
            <p className="text-3xl font-bold mt-2">{stats.projects}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Environments</h3>
            <p className="text-3xl font-bold mt-2">{stats.activeEnvs}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/admin/users" className="p-4 border border-gray-200 rounded hover:bg-gray-50">
              <h3 className="font-medium">Manage Users</h3>
              <p className="text-sm text-gray-600 mt-1">View and manage all users</p>
            </a>
            <a href="/admin/settings/mfa" className="p-4 border border-gray-200 rounded hover:bg-gray-50">
              <h3 className="font-medium">Security Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Configure MFA and security</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
