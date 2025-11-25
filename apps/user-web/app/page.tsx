export default function Home() {
  return (
    <div className="gradient-bg min-h-[calc(100vh-4rem)] py-12">
      <main className="px-6 max-w-7xl mx-auto">
        {/* Hero */}
        <section className="mb-12 text-center space-y-6">
          <div className="inline-flex items-center px-4 py-2 rounded-full glass glass-hover text-sm tracking-wide">
            <span className="text-primary-300">⚡</span>
            <span className="ml-2 font-medium">Developer Control Center</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text">
            Welcome to Flaresmith
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage projects, environments, and billing across multi-cloud resources with spec-first precision.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <a href="/projects" className="glass px-6 py-3 rounded-md font-medium text-sm glass-hover">
              Browse Projects →
            </a>
            <a href="/projects/new" className="bg-primary/90 hover:bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium text-sm transition-colors">
              New Project
            </a>
          </div>
        </section>

        {/* Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass rounded-xl p-6 flex flex-col justify-between group relative overflow-hidden">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="text-primary">Projects</span></h2>
              <p className="text-muted-foreground text-sm leading-relaxed">View and manage orchestrated repositories and their live state.</p>
            </div>
            <a href="/projects" className="mt-6 text-primary-300 text-sm font-medium group-hover:underline">Browse projects →</a>
          </div>
          <div className="glass rounded-xl p-6 flex flex-col justify-between group relative overflow-hidden">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="text-primary">Environments</span></h2>
              <p className="text-muted-foreground text-sm leading-relaxed">Dev, staging & production with deterministic parity and automatic preview TTLs.</p>
            </div>
            <a href="/environments" className="mt-6 text-primary-300 text-sm font-medium group-hover:underline">View environments →</a>
          </div>
            <div className="glass rounded-xl p-6 flex flex-col justify-between group relative overflow-hidden">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="text-primary">Billing</span></h2>
              <p className="text-muted-foreground text-sm leading-relaxed">Usage metrics, subscription management & deployment budgeting.</p>
            </div>
            <a href="/billing" className="mt-6 text-primary-300 text-sm font-medium group-hover:underline">Go to billing →</a>
          </div>
        </section>
      </main>
    </div>
  );
}
