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
    <div className={cn('relative group rounded-xl bg-card border border-border p-8 flex flex-col gap-4 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1', className)}>
      <div className='flex items-start gap-4'>
        <div className='w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300'>
          {icon}
        </div>
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <h3 className='text-xl font-bold tracking-tight'>{title}</h3>
            {badge && <Badge className='ml-auto'>{badge}</Badge>}
          </div>
        </div>
      </div>
      <p className='text-base text-muted-foreground/90 leading-relaxed'>{description}</p>
      {href && (
        <span className='pt-1 text-primary text-sm font-medium group-hover:underline'>{'Learn more →'}</span>
      )}
    </div>
  );
  return href ? <a href={href}>{Inner}</a> : Inner;
}
