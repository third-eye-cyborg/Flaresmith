'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Settings, GitBranch, Clock } from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check authentication
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
    return null; // Will redirect
  }

  // Mock projects data
  const projects = [
    { id: 1, name: 'Production App', status: 'active', lastDeploy: '2 hours ago', environments: 3 },
    { id: 2, name: 'Staging Platform', status: 'active', lastDeploy: '5 hours ago', environments: 2 },
  ];

  return (
    <main className="min-h-screen pt-32 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">Projects</h1>
            <p className="text-xl text-muted-foreground/90">Manage your Flaresmith projects and environments</p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">{project.name}</h3>
                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">Active</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Last deploy: {project.lastDeploy}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitBranch className="w-4 h-4" />
                  <span>{project.environments} environments</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border">
                <Button variant="outline" className="w-full">View Project</Button>
              </div>
            </div>
          ))}
          
          {/* Create New Project Card */}
          <div
            onClick={() => router.push('/projects/new')}
            className="bg-card/50 border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/50 hover:bg-card transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[280px] group"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Create New Project</h3>
            <p className="text-sm text-muted-foreground text-center">Set up a new Flaresmith project</p>
          </div>
        </div>
      </div>
    </main>
  );
}
