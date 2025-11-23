/**
 * T009: Accessibility Contrast Calculator
 * Feature: 004-design-system
 * Decision: D-003 (Internal OKLCH-based contrast calculation)
 * 
 * Implements WCAG 2.1 contrast ratio calculation with OKLCH color space support
 * for accessibility audits.
 */

import type { AccessibilityStatus } from '@flaresmith/types';

/**
 * Color representation (internal)
 */
interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a?: number; // 0-1
}

/**
 * Parse hex color to RGB
 * 
 * @param hex - Hex color string (#RRGGBB or #RRGGBBAA)
 * @returns RGB color object
 */
function parseHex(hex: string): RGBColor {
  const cleaned = hex.replace(/^#/, '');
  
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  const a = cleaned.length === 8 
    ? parseInt(cleaned.substring(6, 8), 16) / 255
    : 1;
  
  return { r, g, b, a };
}

/**
 * Parse OKLCH color to RGB (approximation)
 * OKLCH format: oklch(L C H [/ alpha])
 * 
 * @param oklch - OKLCH color string
 * @returns RGB color object (approximated)
 */
function parseOKLCH(oklch: string): RGBColor {
  // Extract values from oklch(L C H) or oklch(L C H / alpha)
  const match = oklch.match(/oklch\(([^)]+)\)/);
  if (!match || !match[1]) throw new Error(`Invalid OKLCH color: ${oklch}`);
  
  const parts = match[1].split(/\s+\/\s+|\s+/);
  if (parts.length < 3) throw new Error(`Invalid OKLCH color: ${oklch}`);
  
  const l = parseFloat(parts[0] || '0');
  const c = parseFloat(parts[1] || '0');
  const h = parseFloat(parts[2] || '0');
  const a = parts[3] ? parseFloat(parts[3]) : 1;
  
  // Simplified OKLCH → sRGB conversion
  // Note: Full conversion requires color.js or similar
  // This is an approximation for MVP
  const lightness = l * 255;
  const chroma = c * 100;
  const hue = (h * Math.PI) / 180;
  
  const r = Math.min(255, Math.max(0, lightness + chroma * Math.cos(hue)));
  const g = Math.min(255, Math.max(0, lightness + chroma * Math.cos(hue + 2.09)));
  const b = Math.min(255, Math.max(0, lightness + chroma * Math.cos(hue + 4.19)));
  
  return { r, g, b, a };
}

/**
 * Parse color string to RGB
 * 
 * @param color - Color string (hex, oklch, or hsl)
 * @returns RGB color object
 */
export function parseColor(color: string): RGBColor {
  if (color.startsWith('#')) {
    return parseHex(color);
  }
  
  if (color.startsWith('oklch(')) {
    return parseOKLCH(color);
  }
  
  if (color.startsWith('hsl(')) {
    // Basic HSL parsing (simplified)
    const match = color.match(/hsl\(([^)]+)\)/);
    if (!match || !match[1]) throw new Error(`Invalid HSL color: ${color}`);
    
    const parts = match[1].split(/\s+|,\s*/);
    if (parts.length < 3) throw new Error(`Invalid HSL color: ${color}`);
    
    const h = parseFloat(parts[0] || '0') / 360;
    const s = parseFloat(parts[1] || '0') / 100;
    const l = parseFloat(parts[2] || '0') / 100;
    
    // HSL to RGB
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a: 1,
    };
  }
  
  throw new Error(`Unsupported color format: ${color}`);
}

/**
 * Calculate relative luminance (WCAG 2.1 formula)
 * 
 * @param rgb - RGB color
 * @returns Relative luminance (0-1)
 */
export function calculateLuminance(rgb: RGBColor): number {
  // Convert to sRGB
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  
  // Apply gamma correction
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG 2.1)
 * 
 * @param color1 - First color string
 * @param color2 - Second color string
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);
  
  const lum1 = calculateLuminance(rgb1);
  const lum2 = calculateLuminance(rgb2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate contrast ratio against WCAG AA standards
 * 
 * @param ratio - Contrast ratio
 * @param isLargeText - Whether text is large (≥18pt or ≥14pt bold)
 * @returns Accessibility status
 */
export function validateContrastRatio(
  ratio: number,
  isLargeText: boolean = false
): AccessibilityStatus {
  const threshold = isLargeText ? 3.0 : 4.5;
  
  if (ratio >= threshold) {
    return 'pass';
  }
  
  // Warn if close to threshold (within 10%)
  if (ratio >= threshold * 0.9) {
    return 'warn';
  }
  
  return 'fail';
}

/**
 * Audit contrast between two token colors
 * 
 * @param fgColor - Foreground color
 * @param bgColor - Background color
 * @param isLargeText - Whether text is large
 * @returns Audit result with ratio and status
 */
export function auditContrast(
  fgColor: string,
  bgColor: string,
  isLargeText: boolean = false
): {
  ratio: number;
  status: AccessibilityStatus;
  recommendation?: string;
} {
  const ratio = calculateContrastRatio(fgColor, bgColor);
  const status = validateContrastRatio(ratio, isLargeText);
  
  const result: {
    ratio: number;
    status: AccessibilityStatus;
    recommendation?: string;
  } = { ratio, status };
  
  if (status === 'fail' || status === 'warn') {
    const threshold = isLargeText ? 3.0 : 4.5;
    result.recommendation = `Increase contrast to meet ${threshold}:1 ratio (currently ${ratio.toFixed(2)}:1)`;
  }
  
  return result;
}
