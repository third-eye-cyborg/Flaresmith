export default function AdminLanding() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
        <p className="text-lg text-gray-600">System administration and management</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <p className="text-gray-600 mb-4">Manage user accounts and permissions</p>
          <a href="/admin/users" className="text-indigo-600 hover:underline">Manage users →</a>
        </div>
        
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <p className="text-gray-600 mb-4">Configure system settings</p>
          <a href="/admin/settings" className="text-indigo-600 hover:underline">View settings →</a>
        </div>
        
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
          <h2 className="text-xl font-semibold mb-2">Analytics</h2>
          <p className="text-gray-600 mb-4">View system metrics and usage</p>
          <a href="/admin/analytics" className="text-indigo-600 hover:underline">View analytics →</a>
        </div>
      </div>
    </main>
  );
}
