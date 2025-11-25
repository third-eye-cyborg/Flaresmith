import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  className?: string;
  badge?: string;
}

export function FeatureCard({ icon, title, description, href, className, badge }: FeatureCardProps) {
  const Inner = (
    <div className={cn('relative group rounded-xl glass p-6 flex flex-col gap-3 overflow-hidden', className)}>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/70 to-accent-500/70 flex items-center justify-center text-primary-foreground'>
          {icon}
        </div>
        <h3 className='text-lg font-semibold tracking-tight'>{title}</h3>
        {badge && <Badge className='ml-auto'>{badge}</Badge>}
      </div>
      <p className='text-sm text-muted-foreground leading-relaxed'>{description}</p>
      {href && (
        <span className='pt-1 text-primary-300 text-sm font-medium group-hover:underline'>{'Learn more →'}</span>
      )}
      <div className='pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-accent/10' />
    </div>
  );
  return href ? <a href={href}>{Inner}</a> : Inner;
}
