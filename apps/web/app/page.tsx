import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Rocket, Zap, GitBranch } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,107,53,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(74,144,226,0.18),transparent_55%)]" />
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[size:75px_75px] dark:bg-grid-slate-400/[0.05]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center space-y-8 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-700">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Multi-Environment Orchestration</span>
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary text-transparent bg-clip-text animate-in fade-in slide-in-from-top-4 duration-700">
              Welcome to Flaresmith
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
              Provision and sync GitHub, Cloudflare, Neon, and Postman - all from one platform
            </p>
            <div className="flex gap-4 justify-center pt-4 animate-in fade-in slide-in-from-top-8 duration-700 delay-200">
              <Link href="/projects">
                <Button size="lg" variant="gradient" className="gap-2">
                  <Rocket className="w-4 h-4" />
                  View Projects
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button size="lg" variant="glass" className="gap-2">
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
