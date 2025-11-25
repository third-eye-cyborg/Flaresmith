
import { Rocket, Zap, Shield, GitBranch, Cloud, Database, Palette, FlaskConical, Bell, KeyRound, Bot, Code2, BookOpen, Chrome, Blocks, Eye, Coins, TrendingUp, Smartphone, Gauge, Bug, FileText, MessageSquare, PlayCircle, Lock, ShieldCheck } from 'lucide-react'
import { HeroSection } from '@/components/marketing/HeroSection'
import { CTASection } from '@/components/marketing/CTASection'
import { TestimonialSection } from '@/components/marketing/TestimonialSection'
import { FeatureGrid } from '@/components/marketing/FeatureGrid'

export default function HomePage() {
  return (
    <main className="relative min-h-screen" role="main">
      {/* Hero */}
      <HeroSection
        eyebrow="Cloud Orchestration Platform"
        title="Build faster with spec-first development"
        subtitle="Orchestrate GitHub, Cloudflare, Neon, and Postman from a single specification. Keep your entire stack synchronized."
        primaryCta={{ label: 'Get Started', href: '/projects/new' }}
        secondaryCta={{ label: 'View Documentation', href: 'https://github.com/third-eye-cyborg/CloudMake' }}
        metrics={[
          { label: 'Deploy Time', value: '<2min' },
          { label: 'Uptime', value: '99.9%' },
          { label: 'Environments', value: '3+' }
        ]}
        hideMetricsOnMobile={false}
      />

      {/* From Spec to Production - 3 step cards */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">From Spec to Production</h2>
          <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">Define your feature specs, let AI generate the implementation, and deploy across all environments.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary mb-6">
              <GitBranch className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-3">1. Write Specs</h3>
            <p className="text-base text-muted-foreground/90 leading-relaxed">Use Markdown to author feature specs with OpenAPI, GraphQL, MCP tools. Type systems are generated from zod.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary mb-6">
              <Rocket className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">2. Generate Artifacts</h3>
            <p className="text-base text-muted-foreground/90 leading-relaxed">AI-generated routes, API adapters, UI mocks, E2E tests. Schemas, Docs, and Postman tests from specs.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary mb-6">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3">3. Provision & Sync</h3>
            <p className="text-base text-muted-foreground/90 leading-relaxed">Sync secrets to GitHub / Codespaces, deploy to Cloudflare, sync Neon branches and Postman environments.</p>
          </div>
        </div>
      </section>

      {/* The Instant Enterprise Monorepo */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">The Instant Enterprise Monorepo</h2>
          <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">A single spec generates a robust, API-first architecture. Consistently follows the Monorepo and platform patterns.</p>
        </div>
        <FeatureGrid
          items={[
            { icon: <Cloud className='w-5 h-5' />, title: 'Customer Web App', description: 'Instant user application using Radlid UI-integrations.' },
            { icon: <Shield className='w-5 h-5' />, title: 'Customer Mobile App', description: 'Expo / React Native applications for iOS and Android.' },
            { icon: <Database className='w-5 h-5' />, title: 'Admin Web Portal', description: 'Secure platform dashboard for admin / support teams.' },
            { icon: <Rocket className='w-5 h-5' />, title: 'Admin Mobile App', description: 'Field user support from native app on iOS & Android.' },
            { icon: <GitBranch className='w-5 h-5' />, title: 'Serverless Database', description: 'Data integrations for server-driven UI with Neon branches.' },
            { icon: <Zap className='w-5 h-5' />, title: 'Pages', description: 'Marketing sites along with SEO-focused content pages.' }
          ]}
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
            { name: 'GitHub', description: 'Version control and CI/CD workflows', icon: <GitBranch className="w-6 h-6" /> },
            { name: 'Cloudflare', description: 'Workers, Pages, and serverless hosting', icon: <Cloud className="w-6 h-6" /> },
            { name: 'Neon', description: 'Serverless Postgres with branching', icon: <Database className="w-6 h-6" /> },
            { name: 'Postman', description: 'API testing and documentation', icon: <FlaskConical className="w-6 h-6" /> },
            { name: 'Figma', description: 'Design tokens and style sync', icon: <Palette className="w-6 h-6" /> },
            { name: 'PostHog', description: 'Product analytics and insights', icon: <TrendingUp className="w-6 h-6" /> },
            { name: 'Polar', description: 'Monetization and billing', icon: <Coins className="w-6 h-6" /> },
            { name: 'Linear', description: 'Issue tracking and workflows', icon: <Rocket className="w-6 h-6" /> },
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
            { name: 'Expo', description: 'Cross-platform mobile development', icon: <Smartphone className="w-6 h-6" /> },
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

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-6 py-32">
        <TestimonialSection heading="What teams are saying" subheading="Validation from teams eliminating environment drift & manual sync toil." />
      </section>

      {/* CTA */}
      <CTASection
        heading="Ready to converge?"
        body="Join the beta waiting list, and discover how Flaresmith teams deliver AI-leveraged code with absolute transparency and confidence."
        primaryCta={{ label: 'Contact Sales', href: '/projects/new', variant: 'default' }}
        secondaryCta={{ label: 'Get Started', href: '/pricing', variant: 'outline' }}
      />
    </main>
  )
}
