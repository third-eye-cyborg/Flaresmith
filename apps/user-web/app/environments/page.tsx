export const metadata = { title: 'Environments - Flaresmith' };

export default function EnvironmentsPage() {
  const envs = [
    { name: 'Development', status: 'active', branch: 'main', lastDeploy: '2 hours ago' },
    { name: 'Staging', status: 'active', branch: 'staging', lastDeploy: '1 day ago' },
    { name: 'Production', status: 'active', branch: 'main', lastDeploy: '3 days ago' }
  ];
  return (
    <div className='gradient-bg min-h-[calc(100vh-4rem)] py-12'>
      <div className='max-w-7xl mx-auto px-6 space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text'>Environments</h1>
          <p className='text-muted-foreground'>Manage dev, staging & production environments.</p>
        </header>
        <div className='space-y-4'>
          {envs.map(e => (
            <div key={e.name} className='glass rounded-xl p-6 flex items-center justify-between'>
              <div>
                <h3 className='font-semibold text-lg'>{e.name}</h3>
                <p className='text-sm text-muted-foreground'>Branch: {e.branch} • Last deploy: {e.lastDeploy}</p>
              </div>
              <span className='px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30'>{e.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
