export default function Home() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Flaresmith</h1>
        <p className="text-lg text-gray-600">Manage your projects and environments</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Projects</h2>
          <p className="text-gray-600 mb-4">View and manage your projects</p>
          <a href="/projects" className="text-indigo-600 hover:underline">Browse projects →</a>
        </div>
        
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Environments</h2>
          <p className="text-gray-600 mb-4">Manage dev, staging, and production</p>
          <a href="/environments" className="text-indigo-600 hover:underline">View environments →</a>
        </div>
        
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Billing</h2>
          <p className="text-gray-600 mb-4">View usage and manage subscription</p>
          <a href="/billing" className="text-indigo-600 hover:underline">Go to billing →</a>
        </div>
      </div>
    </main>
  );
}
