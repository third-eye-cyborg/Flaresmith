export const metadata = { title: 'Settings - Admin' };

import { Button } from '@/components/ui/button'
export default function AdminSettingsPage() {
  return (
    <div className='gradient-bg min-h-[calc(100vh-4rem)] py-12'>
      <div className='max-w-5xl mx-auto px-6 space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text'>
            System Settings
          </h1>
          <p className='text-muted-foreground'>Configure platform-wide settings and integrations</p>
        </header>

        <div className='space-y-6'>
          <div className='glass rounded-xl p-6 space-y-4'>
            <h3 className='text-xl font-semibold'>General Settings</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>Platform Name</label>
                <input
                  type='text'
                  defaultValue='Flaresmith'
                  placeholder='Platform name'
                  aria-label='Platform Name'
                  className='w-full bg-background/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500/50 transition-colors'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-2'>Support Email</label>
                <input
                  type='email'
                  defaultValue='support@flaresmith.dev'
                  placeholder='support@yourdomain.dev'
                  aria-label='Support Email'
                  className='w-full bg-background/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500/50 transition-colors'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-2'>Max Projects Per User</label>
                <input
                  type='number'
                  defaultValue={10}
                  placeholder='10'
                  aria-label='Max Projects Per User'
                  className='w-full bg-background/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500/50 transition-colors'
                />
              </div>
            </div>
          </div>

          <div className='glass rounded-xl p-6 space-y-4'>
            <h3 className='text-xl font-semibold'>Integration Settings</h3>
            <div className='space-y-4'>
              <div className='flex items-center justify-between p-4 border border-white/10 rounded-lg'>
                <div>
                  <p className='font-medium'>GitHub Integration</p>
                  <p className='text-sm text-muted-foreground'>Connected as @flaresmith-admin</p>
                </div>
                <span className='px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300'>Active</span>
              </div>
              <div className='flex items-center justify-between p-4 border border-white/10 rounded-lg'>
                <div>
                  <p className='font-medium'>Cloudflare Integration</p>
                  <p className='text-sm text-muted-foreground'>API Token configured</p>
                </div>
                <span className='px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300'>Active</span>
              </div>
              <div className='flex items-center justify-between p-4 border border-white/10 rounded-lg'>
                <div>
                  <p className='font-medium'>Neon Database</p>
                  <p className='text-sm text-muted-foreground'>Primary connection pool</p>
                </div>
                <span className='px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300'>Active</span>
              </div>
              <div className='flex items-center justify-between p-4 border border-white/10 rounded-lg'>
                <div>
                  <p className='font-medium'>Postman Integration</p>
                  <p className='text-sm text-muted-foreground'>API sync enabled</p>
                </div>
                <span className='px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300'>Active</span>
              </div>
            </div>
          </div>

          <div className='glass rounded-xl p-6 space-y-4'>
            <h3 className='text-xl font-semibold'>Security Settings</h3>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='font-medium'>Two-Factor Authentication</p>
                  <p className='text-sm text-muted-foreground'>Require 2FA for all admin accounts</p>
                </div>
                <label className='relative inline-flex items-center cursor-pointer' aria-label='Enable Two-Factor Authentication'>
                  <span className='sr-only'>Enable Two-Factor Authentication</span>
                  <input
                    type='checkbox'
                    defaultChecked
                    className='sr-only peer'
                    role='switch'
                    aria-checked='true'
                    aria-label='Two-Factor Authentication Enabled'
                  />
                  <div
                    className="w-11 h-6 bg-background/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"
                    aria-hidden='true'
                  ></div>
                </label>
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='font-medium'>Session Timeout</p>
                  <p className='text-sm text-muted-foreground'>Auto-logout after inactivity</p>
                </div>
                <select aria-label='Session Timeout' className='bg-background/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500/50 transition-colors'>
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>2 hours</option>
                  <option>4 hours</option>
                </select>
              </div>
            </div>
          </div>

          <div className='flex justify-end'>
            <Button variant='gradient' className='px-6 py-3 rounded-lg'>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
