export const metadata = { title: 'Projects - Flaresmith' };

export default function ProjectsPage() {
  return (
    <div className='gradient-bg min-h-[calc(100vh-4rem)] py-12'>
      <div className='max-w-7xl mx-auto px-6 space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300 text-transparent bg-clip-text'>Your Projects</h1>
          <p className='text-muted-foreground'>Manage orchestrated repositories and their environments.</p>
        </header>
        <div className='glass rounded-xl p-8 text-center text-muted-foreground'>
          <p>No projects yet. Create your first project to get started.</p>
          <a href='/projects/new' className='mt-4 inline-block bg-primary/90 hover:bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium transition-colors'>New Project</a>
        </div>
      </div>
    </div>
  );
}
