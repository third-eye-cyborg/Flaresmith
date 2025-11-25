import React from 'react';
import { designSyncFlagSnapshot } from '../../../api/src/config/flags';
import { HeroSection } from '@/components/marketing/HeroSection';
import { ArrowRight, Palette, Layers, RefreshCw, GitBranch, Eye, Blocks, Figma, Code2, Sparkles } from 'lucide-react';

export default function DesignSyncPage() {
  if (!designSyncFlagSnapshot.DESIGN_SYNC_ENABLED) {
    return (
      <div className="min-h-screen pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Design Sync</h1>
          <p className="text-xl text-muted-foreground">This feature is currently disabled. Enable the DESIGN_SYNC_ENABLED flag to access synchronization workflows.</p>
        </div>
      </div>
    );
  }
  return (
    <main className="relative min-h-screen" role="main">
      {/* Hero */}
      <HeroSection
        eyebrow="Design-to-Code Automation"
        title="Never manually sync design tokens again"
        subtitle="Flaresmith creates a continuous loop between Figma, Builder.io, Storybook, and your codebase—keeping design tokens, components, and documentation always in sync."
        primaryCta={{ label: 'Start Syncing', href: '/projects/new' }}
        secondaryCta={{ label: 'View Documentation', href: '/docs/design-sync' }}
      />

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">The Complete Design Sync Loop</h2>
          <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">From design to production without the context switching. Visual Copilot bridges the gap between designers and developers.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Palette className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">1. Design in Figma</h3>
            </div>
            <p className="text-base text-muted-foreground/90 leading-relaxed mb-4">Designers work freely in Figma using your design system. Update colors, typography, spacing, and component styles without touching code.</p>
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <span>Design tokens auto-extracted</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">2. Visual Copilot</h3>
            </div>
            <p className="text-base text-muted-foreground/90 leading-relaxed mb-4">Builder.io's Visual Copilot transforms Figma designs into production-ready React components. AI-powered translation from design to code.</p>
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <span>Components generated</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Blocks className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">3. Storybook Stories</h3>
            </div>
            <p className="text-base text-muted-foreground/90 leading-relaxed mb-4">Every component automatically gets Storybook stories. Interactive documentation, visual regression testing, and a living component library.</p>
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <span>Stories auto-created</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">4. Continuous Sync</h3>
            </div>
            <p className="text-base text-muted-foreground/90 leading-relaxed mb-4">Flaresmith monitors for changes and keeps everything in sync. Design updates flow to code, code changes sync back to Storybook and Figma.</p>
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <span>Always up-to-date</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Integration Points */}
      <section className="max-w-7xl mx-auto px-6 py-32 bg-card/30">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">Seamless Integration</h2>
          <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">Connect your entire design-to-development workflow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
              <Palette className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Figma Plugin</h3>
            <p className="text-muted-foreground/90 leading-relaxed">Extract design tokens, publish components, and sync changes directly from Figma with our native plugin.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Visual Copilot</h3>
            <p className="text-muted-foreground/90 leading-relaxed">Builder.io's AI converts designs to React code with your design system tokens baked in automatically.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
              <Blocks className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Storybook Sync</h3>
            <p className="text-muted-foreground/90 leading-relaxed">Auto-generated stories for every component with controls, docs, and visual regression testing built in.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">Powerful Workflow Tools</h2>
          <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">Everything you need to manage design at scale</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Manual Sync Triggers', description: 'Force synchronization across all platforms on-demand when you need instant updates', icon: <RefreshCw className="w-5 h-5" /> },
            { title: 'Version History', description: 'Full audit trail with undo/redo. Rollback to any previous design token version instantly', icon: <GitBranch className="w-5 h-5" /> },
            { title: 'Drift Detection', description: 'Automatically detect when design tokens fall out of sync and get actionable remediation steps', icon: <Eye className="w-5 h-5" /> },
            { title: 'Token Coverage', description: 'Monitor which tokens are used across web, mobile, and Storybook with usage analytics', icon: <Layers className="w-5 h-5" /> },
            { title: 'Visual Testing', description: 'Chromatic integration for automated visual regression testing across all components', icon: <Sparkles className="w-5 h-5" /> },
            { title: 'Component Generator', description: 'Scaffold new components with Storybook stories and design tokens pre-configured', icon: <Code2 className="w-5 h-5" /> },
          ].map((feature) => (
            <div key={feature.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-sm text-muted-foreground/90">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-32 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Ready to sync your design system?</h2>
        <p className="text-xl text-muted-foreground/90 mb-10 leading-relaxed">Join teams that ship faster with automated design-to-code workflows.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/projects/new" className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors">
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </a>
          <a href="/docs/design-sync" className="inline-flex items-center justify-center gap-2 bg-card text-foreground border border-border px-8 py-4 rounded-lg font-semibold text-lg hover:border-primary/50 transition-colors">
            Read Documentation
          </a>
        </div>
      </section>
    </main>
  );
}
