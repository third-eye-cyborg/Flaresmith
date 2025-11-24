/**
 * Mobile Card Component (React Native)
 * Implements T038
 * NOTE: BlurView placeholder – actual import requires expo-blur or similar.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CardVariant } from '@flaresmith/types';
import { detectBlurSupport } from '@flaresmith/utils/designSystem/capabilityDetection';

interface MobileCardProps {
  variant?: CardVariant;
  children?: React.ReactNode;
  style?: any;
}

export const MobileCard: React.FC<MobileCardProps> = ({ variant = 'elevated', children, style }) => {
  const capability = detectBlurSupport();
  const supported = capability.supported;

  const baseStyle = [styles.base];
  switch (variant) {
    case 'glass':
      if (supported) {
        baseStyle.push(styles.glassSupported);
      } else {
        baseStyle.push(styles.glassFallback);
      }
      break;
    case 'flat':
      baseStyle.push(styles.flat);
      break;
    case 'elevated':
    default:
      baseStyle.push(styles.elevated);
      break;
  }
  if (style) baseStyle.push(style);

  return <View style={baseStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#f4f4f5',
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: '#ffffff',
  },
  flat: {
    backgroundColor: '#fafafa',
  },
  glassSupported: {
    // Placeholder translucency – actual blur layer would wrap children
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  glassFallback: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});

export default MobileCard;
