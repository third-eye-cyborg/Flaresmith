/**
 * Shared Card Primitive
 * Implements T035 & T036: Variant prop with Liquidglass support & fallback
 */
import React from 'react';
import type { CardVariant } from '@flaresmith/types';
import { detectLiquidglassCapability, shouldUseFallback } from '@flaresmith/utils/designSystem/capabilityDetection';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant; // elevated | glass | flat
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

const baseClasses = 'rounded-md border border-[var(--semantic-border-default)] text-[var(--semantic-foreground-primary)] bg-[var(--semantic-background-secondary)] transition-colors';

function getVariantClasses(variant: CardVariant, capabilitySupported: boolean): string {
  switch (variant) {
    case 'glass':
      if (!capabilitySupported) {
        // Fallback: solid + elevation
        return 'shadow-md bg-[var(--semantic-background-secondary)]/90';
      }
      // Glass styling uses backdrop-filter (web) with CSS vars for opacity
      return 'backdrop-blur-md bg-[var(--semantic-background-secondary)]/60 shadow-sm';
    case 'flat':
      return 'bg-[var(--semantic-background-secondary)]';
    case 'elevated':
    default:
      return 'shadow-lg bg-[var(--semantic-background-secondary)]';
  }
}

export const Card: React.FC<CardProps> = ({ variant = 'elevated', as = 'div', className = '', children, ...rest }) => {
  // Runtime detection (web only). On SSR, we treat as fallback.
  const capability = detectLiquidglassCapability('web');
  const fallback = shouldUseFallback(capability);
  const Component: any = as;
  const variantClasses = getVariantClasses(variant, !fallback);
  return (
    <Component
      className={`${baseClasses} ${variantClasses} ${className}`.trim()}
      data-variant={variant}
      data-liquidglass-supported={!fallback}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Card;
// React import removed (automatic JSX runtime)
import { View, type ViewProps } from "react-native";

export interface CardProps extends ViewProps {}

export function Card({ children, ...props }: CardProps) {
  return (
    <View className="bg-white rounded-lg shadow-md p-4 border border-gray-200" {...props}>
      {children}
    </View>
  );
}
