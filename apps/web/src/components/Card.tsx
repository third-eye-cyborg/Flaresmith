/**
 * Web Card Component (extends shared Card)
 * Implements T037
 */
import React from 'react';
import { Card, CardProps } from '@flaresmith/ui/Card';

export const WebCard: React.FC<CardProps> = (props) => {
  return <Card {...props} />;
};

export default WebCard;
