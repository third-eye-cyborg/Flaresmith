export const metadata = { title: 'Analytics - Admin' };

const mockMetrics = {
  totalUsers: 247,
  activeProjects: 89,
  deploymentsToday: 156,
  apiRequests: 12453,
  avgResponseTime: 142,
  errorRate: 0.3,
};

const recentDeployments = [
  { id: '1', project: 'ecommerce-platform', environment: 'production', status: 'success', time: '5 min ago' },
  { id: '2', project: 'analytics-dashboard', environment: 'staging', status: 'success', time: '12 min ago' },
  { id: '3', project: 'mobile-app-api', environment: 'dev', status: 'failed', time: '18 min ago' },
  { id: '4', project: 'customer-portal', environment: 'production', status: 'success', time: '32 min ago' },
];

export default function AdminAnalyticsPage() {
  return (
    <div className='gradient-bg min-h-[calc(100vh-4rem)] py-12'>
      <div className='max-w-7xl mx-auto px-6 space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text'>
            Platform Analytics
          </h1>
          <p className='text-muted-foreground'>Real-time metrics and deployment activity</p>
        </header>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Total Users</p>
            <p className='text-3xl font-bold'>{mockMetrics.totalUsers}</p>
            <p className='text-xs text-green-400'>↑ 12% from last month</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Active Projects</p>
            <p className='text-3xl font-bold'>{mockMetrics.activeProjects}</p>
            <p className='text-xs text-green-400'>↑ 8% from last month</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Deployments Today</p>
            <p className='text-3xl font-bold'>{mockMetrics.deploymentsToday}</p>
            <p className='text-xs text-muted-foreground'>Across all environments</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>API Requests (24h)</p>
            <p className='text-3xl font-bold'>{mockMetrics.apiRequests.toLocaleString()}</p>
            <p className='text-xs text-green-400'>↑ 23% from yesterday</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Avg Response Time</p>
            <p className='text-3xl font-bold'>{mockMetrics.avgResponseTime}ms</p>
            <p className='text-xs text-green-400'>↓ 15ms from average</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Error Rate</p>
            <p className='text-3xl font-bold'>{mockMetrics.errorRate}%</p>
            <p className='text-xs text-green-400'>Within target (&lt;1%)</p>
          </div>
        </div>

        <div className='glass rounded-xl p-6 space-y-4'>
          <h3 className='text-xl font-semibold'>Recent Deployments</h3>
          <div className='space-y-3'>
            {recentDeployments.map((deployment) => (
              <div key={deployment.id} className='flex items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors'>
                <div className='flex-1'>
                  <p className='font-medium'>{deployment.project}</p>
                  <p className='text-sm text-muted-foreground'>{deployment.environment}</p>
                </div>
                <div className='flex items-center gap-4'>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    deployment.status === 'success' 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {deployment.status}
                  </span>
                  <span className='text-sm text-muted-foreground min-w-[100px] text-right'>{deployment.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='glass rounded-xl p-6 space-y-4'>
          <h3 className='text-xl font-semibold'>System Health</h3>
          <div className='space-y-4'>
            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>API Availability</span>
                <span className='text-green-400'>99.97%</span>
              </div>
              <div className='h-2 bg-background/50 rounded-full overflow-hidden'>
                <div className='h-full bg-gradient-to-r from-green-500 to-green-400 w-[99%]' aria-label='API Availability 99.97 percent'></div>
              </div>
            </div>
            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Database Performance</span>
                <span className='text-green-400'>98.5%</span>
              </div>
              <div className='h-2 bg-background/50 rounded-full overflow-hidden'>
                <div className='h-full bg-gradient-to-r from-primary-500 to-accent-500 w-[98%]' aria-label='Database Performance 98.5 percent'></div>
              </div>
            </div>
            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Edge Network</span>
                <span className='text-green-400'>100%</span>
              </div>
              <div className='h-2 bg-background/50 rounded-full overflow-hidden'>
                <div className='h-full bg-gradient-to-r from-accent-500 to-primary-500 w-full' aria-label='Edge Network 100 percent'></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
