/**
 * Shared Badge Primitive
 * Implements T039
 */
import React from 'react';
import type { BadgeVariant } from '@flaresmith/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant; // default | outline | subtle
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

const base = 'inline-flex items-center rounded-full text-xs font-medium transition-colors';

function variantClasses(variant: BadgeVariant): string {
  switch (variant) {
    case 'outline':
      return 'border border-[var(--semantic-border-default)] text-[var(--semantic-foreground-secondary)] bg-transparent';
    case 'subtle':
      return 'bg-[var(--semantic-background-tertiary)] text-[var(--semantic-foreground-secondary)]';
    case 'default':
    default:
      return 'bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]';
  }
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', as = 'span', className = '', children, ...rest }) => {
  const Comp: any = as;
  return (
    <Comp
      className={`${base} px-[var(--spacing-xs)] py-[2px] ${variantClasses(variant)} ${className}`.trim()}
      data-variant={variant}
      {...rest}
    >
      {children}
    </Comp>
  );
};

export default Badge;
