/**
 * SubscriptionBadge Component
 * 
 * Displays the user's subscription tier (free, pro, enterprise) with visual styling.
 * Used across user mobile app to indicate tier status and capabilities.
 * 
 * Features:
 * - Visual styling per tier (colors, icons, tier name)
 * - Optional inline/standalone display modes
 * - Accessibility support
 * - NativeWind styling for consistent theming
 * 
 * Usage:
 * ```tsx
 * <SubscriptionBadge tier="pro" mode="inline" />
 * <SubscriptionBadge tier="free" mode="standalone" showUpgrade />
 * ```
 * 
 * Related: UserSecureStore.getSubscriptionTier() for offline-safe tier access
 * Spec: FR-038, SC-016 (subscription tier syncs across devices)
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Subscription tier type
 */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/**
 * Display mode for the badge
 */
export type BadgeMode = 'inline' | 'standalone';

/**
 * Props for SubscriptionBadge component
 */
export interface SubscriptionBadgeProps {
  /** Current subscription tier */
  tier: SubscriptionTier;
  
  /** Display mode (inline: compact, standalone: full card) */
  mode?: BadgeMode;
  
  /** Show upgrade button for free tier */
  showUpgrade?: boolean;
  
  /** Optional custom styling */
  style?: object;
  
  /** Accessibility label override */
  accessibilityLabel?: string;
}

/**
 * Tier configuration including colors, labels, and descriptions
 */
const TIER_CONFIG: Record<SubscriptionTier, {
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
}> = {
  free: {
    label: 'Free',
    description: 'Basic features',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    icon: '🆓',
  },
  pro: {
    label: 'Pro',
    description: 'Advanced features',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-400',
    icon: '⭐',
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Full platform access',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-400',
    icon: '👑',
  },
};

/**
 * SubscriptionBadge Component
 * 
 * Renders a badge displaying the user's subscription tier with appropriate styling.
 * Supports inline and standalone display modes, with optional upgrade button.
 */
export function SubscriptionBadge({
  tier,
  mode = 'inline',
  showUpgrade = false,
  style,
  accessibilityLabel,
}: SubscriptionBadgeProps): JSX.Element {
  const router = useRouter();
  const config = TIER_CONFIG[tier];
  
  const handleUpgrade = (): void => {
    // Navigate to subscription page with upgrade action
    router.push('/subscription?action=upgrade');
  };
  
  // Inline mode: compact badge
  if (mode === 'inline') {
    return (
      <View
        className={`flex-row items-center px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor}`}
        style={style}
        accessibilityLabel={accessibilityLabel || `Subscription tier: ${config.label}`}
        accessibilityRole="text"
      >
        <Text className="text-base mr-1.5">{config.icon}</Text>
        <Text className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
        </Text>
      </View>
    );
  }
  
  // Standalone mode: full card with description
  return (
    <View
      className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
      style={style}
      accessibilityLabel={accessibilityLabel || `Subscription tier: ${config.label}. ${config.description}`}
      accessibilityRole="text"
    >
      <View className="flex-row items-center mb-2">
        <Text className="text-2xl mr-2">{config.icon}</Text>
        <View className="flex-1">
          <Text className={`text-lg font-bold ${config.textColor}`}>
            {config.label}
          </Text>
          <Text className={`text-sm ${config.textColor} opacity-80`}>
            {config.description}
          </Text>
        </View>
      </View>
      
      {showUpgrade && tier === 'free' && (
        <TouchableOpacity
          onPress={handleUpgrade}
          className="mt-3 bg-blue-600 py-2.5 px-4 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Pro"
          accessibilityHint="Navigate to subscription upgrade page"
        >
          <Text className="text-white text-center font-semibold">
            Upgrade to Pro
          </Text>
        </TouchableOpacity>
      )}
      
      {showUpgrade && tier === 'pro' && (
        <TouchableOpacity
          onPress={handleUpgrade}
          className="mt-3 bg-purple-600 py-2.5 px-4 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Enterprise"
          accessibilityHint="Navigate to subscription upgrade page"
        >
          <Text className="text-white text-center font-semibold">
            Upgrade to Enterprise
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Example usage:
 * 
 * // Inline mode in header
 * <SubscriptionBadge tier="pro" mode="inline" />
 * 
 * // Standalone card in settings
 * <SubscriptionBadge tier="free" mode="standalone" showUpgrade />
 * 
 * // With offline-safe tier from secure store
 * const tier = await UserSecureStore.getSubscriptionTier();
 * <SubscriptionBadge tier={tier} mode="inline" />
 */
