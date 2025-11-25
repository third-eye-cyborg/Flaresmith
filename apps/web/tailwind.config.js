const baseConfig = require("@flaresmith/config-tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	...baseConfig,
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		// Include src tree where actual components live
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
		// Fallback legacy path (some generators may place components here)
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
	],
	plugins: [require("tailwindcss-animate")],
	theme: {
		extend: {
			keyframes: {
				aurora: {
					'0%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
					'100%': { backgroundPosition: '0% 50%' }
				},
				float: {
					'0%,100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-6px)' }
				},
				shimmer: {
					'0%': { backgroundPosition: '200% 0' },
					'100%': { backgroundPosition: '-200% 0' }
				},
				pulseGlow: {
					'0%,100%': { opacity: '0.65', filter: 'brightness(1)' },
					'50%': { opacity: '1', filter: 'brightness(1.15)' }
				},
				gradientMove: {
					'0%': { backgroundPosition: '0% 0%' },
					'100%': { backgroundPosition: '100% 100%' }
				}
			},
			animation: {
				'aurora-slow': 'aurora 18s linear infinite',
				'float': 'float 6s ease-in-out infinite',
				'shimmer-fast': 'shimmer 2.5s linear infinite',
				'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
				'gradient-move': 'gradientMove 12s ease-in-out infinite'
			},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
			backgroundImage: {
				'gradient-aurora': 'linear-gradient(115deg, rgba(255,107,53,0.35), rgba(74,144,226,0.35), rgba(120,64,255,0.35))',
				'mesh-soft': 'radial-gradient(circle at 15% 20%, rgba(255,107,53,0.15), transparent 60%), radial-gradient(circle at 85% 30%, rgba(74,144,226,0.18), transparent 55%)',
				'radial-fade': 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 70%)'
			},
    		colors: {
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		}
    	}
    }
};
