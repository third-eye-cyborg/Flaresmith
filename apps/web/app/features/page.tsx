
import { Rocket, GitBranch, Zap, Shield, Cloud, Globe, Database, Palette, FlaskConical, Bell, KeyRound, Bot, Code2, Smartphone, BookOpen, Chrome, Blocks, Eye, Coins, TrendingUp, Gauge, Bug, FileText, MessageSquare, PlayCircle, Lock, ShieldCheck } from 'lucide-react'
import { FeatureGrid } from '@/components/marketing/FeatureGrid'
import { HeroSection } from '@/components/marketing/HeroSection'

export const metadata = { title: 'Features - Flaresmith' }

export default function FeaturesPage() {
  return (
    <main className='relative' role='main'>
      <HeroSection
        eyebrow='Capabilities'
        title='Every integration orchestrated in lockstep'
        subtitle='GitHub, Cloudflare, Neon, Postman & design tokens converge under spec-first automation.'
        primaryCta={{ label: 'Create Project', href: '/projects/new' }}
      />
      <section className="max-w-7xl mx-auto px-6 py-16">
        <FeatureGrid
          items={[
            { icon: <GitBranch className='w-5 h-5' />, title: 'Universal Tooling Bridge', description: 'Flaresmith acts as the glue layer for your entire stack. Use MCP servers, CLI, and SDKs to automate everything from development to deployment.', href: '/docs/tooling' },
            { icon: <Zap className='w-5 h-5' />, title: 'Continuous Design Sync', description: 'Keep design in the core of your platform without specifying new colors. Flaresmith synchronizes your design tokens in real-time across platforms without code drift.', href: '/docs/design-sync' },
            { icon: <Cloud className='w-5 h-5' />, title: 'Ephemeral Environments', description: 'Spin up fully isolated dev & test instances on-demand. Preview branches get their own GitHub repo, database, and hosting—all auto-archived on TTL.', href: '/docs/environments' },
            { icon: <Rocket className='w-5 h-5' />, title: 'Orchestrated Enterprise Environment', description: 'Everything unified under one umbrella. One Repo, Cloudflare, Figma, and Neon. Configure once, deploy in dev, staging, and production consistently.', href: '/docs/enterprise' },
            { icon: <Shield className='w-5 h-5' />, title: 'AI-Centric Development', description: 'AI agents running via GitHub Copilot, Model Context Protocol servers on dev machines, Vercel AI SDK in production - all working from the same spec-first definition.', href: '/docs/ai' },
            { icon: <Globe className='w-5 h-5' />, title: 'Spec-Driven Workflows', description: 'Write features in Markdown specs and let Flaresmith generate OpenAPI contracts, Postman collections, API routes, and end-to-end tests automatically.', href: '/docs/specs' }
          ]}
          heading='Core Features'
          subheading='From provisioning to promotion, every step is deterministic & observable.'
        />
      </section>

      {/* The Flaresmith Ecosystem */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">The Flaresmith Ecosystem</h2>
          <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">Native integrations with the best cloud infrastructure tools.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { name: 'GitHub', description: 'Repositories, CI/CD, and version control', icon: <GitBranch className="w-6 h-6" /> },
            { name: 'Cloudflare', description: 'Workers, Pages, and serverless hosting', icon: <Cloud className="w-6 h-6" /> },
            { name: 'Figma', description: 'Design tokens and style sync', icon: <Palette className="w-6 h-6" /> },
            { name: 'Postman', description: 'API testing and documentation', icon: <FlaskConical className="w-6 h-6" /> },
            { name: 'Neon', description: 'Serverless Postgres with branching', icon: <Database className="w-6 h-6" /> },
            { name: 'PostHog', description: 'Product analytics and insights', icon: <TrendingUp className="w-6 h-6" /> },
            { name: 'Polar', description: 'Monetization and billing', icon: <Coins className="w-6 h-6" /> },
            { name: 'Linear', description: 'Issue tracking and workflows', icon: <Rocket className="w-6 h-6" /> },
            { name: 'Expo', description: 'React Native mobile apps', icon: <Smartphone className="w-6 h-6" /> },
            { name: 'OneSignal', description: 'Push notifications and messaging', icon: <Bell className="w-6 h-6" /> },
            { name: 'Better Auth', description: 'Modern authentication solution', icon: <Shield className="w-6 h-6" /> },
            { name: 'Copilot', description: 'AI-powered code assistance', icon: <Bot className="w-6 h-6" /> },
            { name: 'Codespaces', description: 'Cloud development environments', icon: <Code2 className="w-6 h-6" /> },
            { name: 'Notion', description: 'Documentation and knowledge base', icon: <BookOpen className="w-6 h-6" /> },
            { name: 'Chrome DevTools', description: 'Browser debugging and testing', icon: <Chrome className="w-6 h-6" /> },
            { name: 'Builder.io', description: 'Visual development platform', icon: <Blocks className="w-6 h-6" /> },
            { name: 'Chromatic', description: 'Visual testing and UI review', icon: <Eye className="w-6 h-6" /> },
            { name: 'Turborepo', description: 'High-performance monorepo build system', icon: <Gauge className="w-6 h-6" /> },
            { name: 'Console Ninja', description: 'Enhanced console debugging', icon: <Bug className="w-6 h-6" /> },
            { name: 'Speckit', description: 'Spec-first development toolkit', icon: <FileText className="w-6 h-6" /> },
            { name: 'Slack', description: 'Team collaboration and communication', icon: <MessageSquare className="w-6 h-6" /> },
            { name: 'GitHub Actions', description: 'CI/CD workflows and automation', icon: <PlayCircle className="w-6 h-6" /> },
            { name: 'GitHub Secrets', description: 'Secure secrets management', icon: <Lock className="w-6 h-6" /> },
            { name: 'GitHub Security', description: 'Code scanning and vulnerability detection', icon: <ShieldCheck className="w-6 h-6" /> },
          ].map((integration) => (
            <div key={integration.name} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 text-center group">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                {integration.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{integration.name}</h3>
              <p className="text-sm text-muted-foreground/90">{integration.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
