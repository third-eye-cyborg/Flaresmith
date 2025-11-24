/**
 * Mobile Badge Component
 * Implements T041
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { BadgeVariant } from '@flaresmith/types';

interface MobileBadgeProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  style?: any;
}

export const MobileBadge: React.FC<MobileBadgeProps> = ({ variant = 'default', children, style }) => {
  const baseStyle = [styles.base];
  switch (variant) {
    case 'outline':
      baseStyle.push(styles.outline);
      break;
    case 'subtle':
      baseStyle.push(styles.subtle);
      break;
    case 'default':
    default:
      baseStyle.push(styles.default);
      break;
  }
  if (style) baseStyle.push(style);
  return (
    <View style={baseStyle} accessibilityRole="text">
      <Text style={styles.text}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  default: {
    backgroundColor: '#0ea5e9',
  },
  outline: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: 'transparent',
  },
  subtle: {
    backgroundColor: '#f4f4f5',
  },
});

export default MobileBadge;
