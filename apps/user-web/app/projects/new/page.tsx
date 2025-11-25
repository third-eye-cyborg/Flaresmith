export const metadata = { title: 'New Project - Flaresmith' };

import { Button } from '@/src/components/ui/button'
export default function NewProjectPage() {
  return (
    <div className='gradient-bg min-h-[calc(100vh-4rem)] py-12'>
      <div className='max-w-3xl mx-auto px-6 space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-4xl font-bold'>Create Project</h1>
          <p className='text-muted-foreground'>Provision a new multi-environment project.</p>
        </header>
        <div className='glass rounded-xl p-8 space-y-6'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Project Name</label>
            <input type='text' placeholder='my-awesome-project' className='w-full px-4 py-2 rounded-md bg-background/50 border border-border focus:border-primary outline-none' />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Description</label>
            <textarea placeholder='What does this project do?' rows={3} className='w-full px-4 py-2 rounded-md bg-background/50 border border-border focus:border-primary outline-none' />
          </div>
          <div className='flex gap-3'>
            <Button className='flex-1' variant='gradient'>Create Project</Button>
            <Button asChild variant='glass'>
              <a href='/projects'>Cancel</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
