/**
 * Base Tailwind Configuration
 * 
 * Merges:
 * - Static base tokens (tokens.base.json)
 * - Generated database tokens (tokens.generated.ts) - T020
 * 
 * Generated tokens take precedence over base tokens.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        secondary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          900: "#14532d",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          900: "#78350f",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          900: "#7f1d1d",
        },
        // Generated tokens will extend/override above colors
        ...getGeneratedTokens().colors,
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        // Generated spacing tokens
        ...getGeneratedTokens().spacing,
      },
      fontSize: {
        // Generated typography tokens
        ...getGeneratedTypography(),
      },
      borderRadius: {
        // Generated radius tokens
        ...getGeneratedTokens().borderRadius,
      },
      boxShadow: {
        // Generated elevation tokens
        ...getGeneratedElevation(),
      },
      backdropBlur: {
        // Generated glass tokens (blur values)
        ...getGeneratedGlass(),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

/**
 * Load generated tokens with fallback
 * 
 * Returns empty object if tokens.generated.ts doesn't exist yet
 * (e.g., before first generation run)
 */
function getGeneratedTokens() {
  try {
    const { designTokens } = require('./tokens.generated');
    return designTokens;
  } catch (error) {
    console.warn('[Tailwind Config] Generated tokens not found, using base tokens only');
    return { colors: {}, spacing: {}, borderRadius: {}, elevation: {}, glass: {}, typography: {}, semantic: {} };
  }
}

/**
 * Transform typography tokens to Tailwind fontSize format
 */
function getGeneratedTypography() {
  const tokens = getGeneratedTokens();
  const typography = tokens.typography || {};
  
  const result: Record<string, [string, { lineHeight: string; fontWeight?: string; letterSpacing?: string }]> = {};
  
  for (const [key, value] of Object.entries(typography)) {
    if (typeof value === 'object' && value.fontSize) {
      result[key] = [
        value.fontSize,
        {
          lineHeight: value.lineHeight || '1.5',
          ...(value.fontWeight && { fontWeight: value.fontWeight }),
          ...(value.letterSpacing && { letterSpacing: value.letterSpacing }),
        },
      ];
    }
  }
  
  return result;
}

/**
 * Transform elevation tokens to Tailwind boxShadow format
 */
function getGeneratedElevation() {
  const tokens = getGeneratedTokens();
  const elevation = tokens.elevation || {};
  
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(elevation)) {
    if (typeof value === 'object' && value.shadowY && value.shadowBlur) {
      const x = value.shadowX || '0';
      const y = value.shadowY;
      const blur = value.shadowBlur;
      const color = value.shadowColor || 'rgba(0, 0, 0, 0.1)';
      
      result[key] = `${x} ${y} ${blur} ${color}`;
    }
  }
  
  return result;
}

/**
 * Transform glass tokens to Tailwind backdropBlur format
 */
function getGeneratedGlass() {
  const tokens = getGeneratedTokens();
  const glass = tokens.glass || {};
  
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(glass)) {
    if (typeof value === 'object' && value.blur) {
      result[key] = value.blur;
    }
  }
  
  return result;
}
