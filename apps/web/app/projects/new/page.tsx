'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Database, Cloud, Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('fullstack');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem('auth-token');
      
      if (!authToken) {
        setIsLoading(false);
        router.push('/login');
        return;
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to projects dashboard
      router.push('/projects');
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen pt-32 pb-20 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back Button */}
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Projects
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Create New Project</h1>
          <p className="text-xl text-muted-foreground/90">Set up a new Flaresmith project with automated provisioning across your entire stack.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Details */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Project Details</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-foreground mb-2">
                  Project Name *
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
                  placeholder="my-awesome-project"
                />
                <p className="text-sm text-muted-foreground mt-2">This will be used for GitHub repo, database, and deployment naming.</p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground resize-none"
                  placeholder="Describe your project..."
                />
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Choose a Template</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTemplate('fullstack')}
                className={`text-left p-6 rounded-lg border-2 transition-all ${
                  template === 'fullstack'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">Full Stack Monorepo</h3>
                </div>
                <p className="text-sm text-muted-foreground">Next.js web + mobile apps with API and admin portal</p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('api-only')}
                className={`text-left p-6 rounded-lg border-2 transition-all ${
                  template === 'api-only'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">API Only</h3>
                </div>
                <p className="text-sm text-muted-foreground">Hono API on Cloudflare Workers with Neon database</p>
              </button>
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Automatic Provisioning</h2>
            <p className="text-muted-foreground mb-6">The following integrations will be automatically configured:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'GitHub Repository', icon: <GitBranch className="w-5 h-5" />, description: 'Version control with CI/CD workflows' },
                { name: 'Neon Database', icon: <Database className="w-5 h-5" />, description: 'Serverless Postgres with branching' },
                { name: 'Cloudflare Workers', icon: <Cloud className="w-5 h-5" />, description: 'Edge deployment for API and web' },
                { name: 'Postman Collections', icon: <Zap className="w-5 h-5" />, description: 'API testing and documentation' },
              ].map((integration) => (
                <div key={integration.name} className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                    {integration.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{integration.name}</h4>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 justify-end">
            <Link
              href="/projects"
              className="px-6 py-3 rounded-lg border border-border hover:border-primary/50 transition-colors font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !projectName}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
