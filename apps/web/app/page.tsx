export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Flaresmith</h1>
      <p className="text-xl text-gray-600">
        Multi-Environment Orchestration Platform
      </p>
      <div className="mt-8 flex gap-4">
        <a href="/projects" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          View Projects
        </a>
        <a href="/projects/new" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
          New Project
        </a>
      </div>
    </main>
  );
}
