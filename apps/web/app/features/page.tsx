import { FeatureCard } from '@/components/marketing/FeatureCard';
import { Rocket, GitBranch, Zap, Shield, Cloud, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TestimonialCarousel } from '@/components/marketing/TestimonialCarousel';

export const metadata = { title: 'Features - Flaresmith' };

export default function FeaturesPage() {
  return (
    <div className='relative min-h-screen py-16 overflow-hidden'>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,107,53,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(74,144,226,0.15),transparent_55%)]" />
      <div className='max-w-7xl mx-auto px-6 space-y-12 relative'>
        <header className='text-center space-y-4'>
          <h1 className='text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary text-transparent bg-clip-text animate-in fade-in slide-in-from-top-4 duration-700'>Platform Features</h1>
          <p className='text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-top-6 duration-700 delay-100'>Edge-native orchestration across code, environments & integrations with spec-first guarantees.</p>
        </header>
        <section className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          <FeatureCard icon={<GitBranch className='w-5 h-5' />} title='GitHub Integration' description='Provision repos, sync secrets, enforce environment parity & code policies.' href='/docs/github' />
          <FeatureCard icon={<Zap className='w-5 h-5' />} title='Environment Sync' description='Dev → Staging → Prod promotion pipelines with deterministic rollback.' href='/docs/environments' />
          <FeatureCard icon={<Cloud className='w-5 h-5' />} title='Cloudflare Deploy' description='Hono Workers + Pages deployments with preview TTL management.' href='/docs/cloudflare' />
          <FeatureCard icon={<Rocket className='w-5 h-5' />} title='One-Click Deploy' description='Unified deploy command triggers multi-surface propagation & audit logging.' href='/docs/deploy' />
          <FeatureCard icon={<Shield className='w-5 h-5' />} title='Security & Secrets' description='Automated secret distribution, conflict detection & rate-aware sync.' href='/docs/security' />
          <FeatureCard icon={<Globe className='w-5 h-5' />} title='Postman Contracts' description='Spec-driven collection generation & CI validation for API correctness.' href='/docs/postman' />
        </section>
        <section className='mt-8 text-center space-y-6'>
          <h2 className='text-3xl font-semibold bg-gradient-to-r from-primary/80 to-accent/80 text-transparent bg-clip-text'>Ready to orchestrate like an edge-native?</h2>
          <p className='max-w-xl mx-auto text-muted-foreground'>Start free, provision your environments, and promote with absolute spec-driven confidence.</p>
          <div className='flex justify-center gap-4'>
            <Button variant='gradient' size='lg' asChild>
              <a href='/pricing'>View Pricing</a>
            </Button>
            <Button variant='glass' size='lg' asChild>
              <a href='/projects'>Go to Dashboard</a>
            </Button>
          </div>
        </section>
        <section className='pt-12'>
          <TestimonialCarousel />
        </section>
      </div>
    </div>
  );
}
