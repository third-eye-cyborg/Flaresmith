import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Rocket, Zap, GitBranch } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[size:75px_75px] dark:bg-grid-slate-400/[0.05]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Multi-Environment Orchestration</span>
            </div>
            
            <h1 className="text-6xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
              Welcome to Flaresmith
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Provision and sync GitHub, Cloudflare, Neon, and Postman - all from one platform
            </p>
            
            <div className="flex gap-4 justify-center pt-4">
              <Link href="/projects">
                <Button size="lg" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Rocket className="w-4 h-4" />
                  View Projects
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button size="lg" variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                  <Zap className="w-4 h-4" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Automated repository provisioning and environment configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/projects">
                <Button variant="ghost" className="w-full">Explore →</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Environment Sync</CardTitle>
              <CardDescription>
                Dev, staging, and production environments in perfect harmony
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/projects">
                <Button variant="ghost" className="w-full">Get Started →</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mb-4">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <CardTitle>One-Click Deploy</CardTitle>
              <CardDescription>
                Deploy to Cloudflare Workers and Pages with confidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/projects/new">
                <Button variant="ghost" className="w-full">Deploy Now →</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
