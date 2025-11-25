export default function AdminLanding() {
  return (
    <div className="gradient-bg min-h-[calc(100vh-4rem)] py-12">
      <main className="px-6 max-w-7xl mx-auto">
        <section className="mb-12 space-y-4 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full glass text-sm tracking-wide">
            <span className="text-primary-300">🛠</span>
            <span className="ml-2 font-medium">Administration Hub</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text">
            Admin Portal
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            System governance, configuration control & observability.
          </p>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass rounded-xl p-6 flex flex-col justify-between group">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="text-primary">Users</span></h2>
              <p className="text-muted-foreground text-sm leading-relaxed">Manage accounts, roles & access policies.</p>
            </div>
            <a href="/admin/users" className="mt-6 text-primary-300 text-sm font-medium group-hover:underline">Manage users →</a>
          </div>
          <div className="glass rounded-xl p-6 flex flex-col justify-between group">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="text-primary">Settings</span></h2>
              <p className="text-muted-foreground text-sm leading-relaxed">Platform configuration & integration toggles.</p>
            </div>
            <a href="/admin/settings" className="mt-6 text-primary-300 text-sm font-medium group-hover:underline">View settings →</a>
          </div>
          <div className="glass rounded-xl p-6 flex flex-col justify-between group">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="text-primary">Analytics</span></h2>
              <p className="text-muted-foreground text-sm leading-relaxed">Live metrics, sync events & performance traces.</p>
            </div>
            <a href="/admin/analytics" className="mt-6 text-primary-300 text-sm font-medium group-hover:underline">View analytics →</a>
          </div>
        </section>
      </main>
    </div>
  );
}
