export const metadata = { title: 'Users - Admin' };

const mockUsers = [
  { id: '1', email: 'user@example.com', name: 'John Doe', role: 'admin', projects: 3, lastActive: '2 hours ago' },
  { id: '2', email: 'jane@example.com', name: 'Jane Smith', role: 'user', projects: 1, lastActive: '1 day ago' },
  { id: '3', email: 'bob@example.com', name: 'Bob Johnson', role: 'user', projects: 5, lastActive: '3 hours ago' },
];

import { Button } from '@/components/ui/button'
export default function AdminUsersPage() {
  return (
    <div className='gradient-bg min-h-[calc(100vh-4rem)] py-12'>
      <div className='max-w-7xl mx-auto px-6 space-y-8'>
        <header className='flex items-center justify-between'>
          <div className='space-y-3'>
            <h1 className='text-4xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text'>
              User Management
            </h1>
            <p className='text-muted-foreground'>Manage user accounts and permissions</p>
          </div>
          <Button variant='gradient' className='px-6 py-3 rounded-lg'>Add User</Button>
        </header>

        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Total Users</p>
            <p className='text-3xl font-bold'>{mockUsers.length}</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Admins</p>
            <p className='text-3xl font-bold'>{mockUsers.filter(u => u.role === 'admin').length}</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Active Today</p>
            <p className='text-3xl font-bold'>{mockUsers.filter(u => u.lastActive.includes('hour')).length}</p>
          </div>
          <div className='glass rounded-xl p-6 space-y-2'>
            <p className='text-sm text-muted-foreground'>Total Projects</p>
            <p className='text-3xl font-bold'>{mockUsers.reduce((sum, u) => sum + u.projects, 0)}</p>
          </div>
        </div>

        <div className='glass rounded-xl overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-white/10'>
                  <th className='text-left p-4 text-sm font-medium text-muted-foreground'>User</th>
                  <th className='text-left p-4 text-sm font-medium text-muted-foreground'>Email</th>
                  <th className='text-left p-4 text-sm font-medium text-muted-foreground'>Role</th>
                  <th className='text-left p-4 text-sm font-medium text-muted-foreground'>Projects</th>
                  <th className='text-left p-4 text-sm font-medium text-muted-foreground'>Last Active</th>
                  <th className='text-left p-4 text-sm font-medium text-muted-foreground'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user) => (
                  <tr key={user.id} className='border-b border-white/5 hover:bg-white/5 transition-colors'>
                    <td className='p-4 font-medium'>{user.name}</td>
                    <td className='p-4 text-muted-foreground'>{user.email}</td>
                    <td className='p-4'>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-primary-500/20 text-primary-300' : 'bg-accent-500/20 text-accent-300'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className='p-4'>{user.projects}</td>
                    <td className='p-4 text-muted-foreground'>{user.lastActive}</td>
                    <td className='p-4'>
                      <Button variant='link' className='text-sm px-0'>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
