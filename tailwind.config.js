/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					'50': '#f0f9ff',
					'100': '#e0f2fe',
					'200': '#bae6fd',
					'300': '#7dd3fc',
					'400': '#38bdf8',
					'500': '#0ea5e9',
					'600': '#0284c7',
					'700': '#0369a1',
					'800': '#075985',
					'900': '#0c4a6e',
					'950': '#082f49',
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				status: {
					draft: {
						DEFAULT: 'hsl(var(--status-draft))',
						foreground: 'hsl(var(--status-draft-foreground))'
					},
					planned: {
						DEFAULT: 'hsl(var(--status-planned))',
						foreground: 'hsl(var(--status-planned-foreground))'
					},
					'in-progress': {
						DEFAULT: 'hsl(var(--status-in-progress))',
						foreground: 'hsl(var(--status-in-progress-foreground))'
					},
					done: {
						DEFAULT: 'hsl(var(--status-done))',
						foreground: 'hsl(var(--status-done-foreground))'
					},
					blocked: {
						DEFAULT: 'hsl(var(--status-blocked))',
						foreground: 'hsl(var(--status-blocked-foreground))'
					}
				},
				priority: {
					low: {
						DEFAULT: 'hsl(var(--priority-low))',
						foreground: 'hsl(var(--priority-low-foreground))'
					},
					medium: {
						DEFAULT: 'hsl(var(--priority-medium))',
						foreground: 'hsl(var(--priority-medium-foreground))'
					},
					high: {
						DEFAULT: 'hsl(var(--priority-high))',
						foreground: 'hsl(var(--priority-high-foreground))'
					},
					critical: {
						DEFAULT: 'hsl(var(--priority-critical))',
						foreground: 'hsl(var(--priority-critical-foreground))'
					}
				},
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: [
					'Inter',
					'system-ui',
					'sans-serif'
				],
				mono: [
					'JetBrains Mono',
					'Consolas',
					'monospace'
				]
			},
			fontWeight: {
				medium: '500',
				semibold: '550',
				bold: '600'
			},
			boxShadow: {
				'linear-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
				'linear-md': '0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
				'linear-lg': '0 4px 8px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
}
