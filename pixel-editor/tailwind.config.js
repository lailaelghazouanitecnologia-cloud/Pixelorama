/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pixelorama exact colors
        pix: {
          base: '#242424',
          secondary: '#3b3b3b',
          tertiary: '#2d2d2d',
          hover: '#4a4a4a',
          pressed: '#525252',
          text: '#c6c6c6',
          'text-secondary': '#a0a0a0',
          'text-muted': '#808080',
          'text-disabled': '#666666',
          accent: '#3b7cd8',
          'accent-hover': '#4a8be7',
          'accent-pressed': '#2a6bc7',
          border: '#4d4d4d',
          'border-light': '#5a5a5a',
          'border-dark': '#1a1a1a',
          error: '#cc3333',
          success: '#46a049',
          warning: '#c68c00',
        },
        // Shadcn compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        // Pixelorama spacing
        'pix-1': '2px',
        'pix-2': '4px',
        'pix-3': '6px',
        'pix-4': '8px',
        'pix-5': '10px',
      },
      fontSize: {
        'pix-xs': '11px',
        'pix-sm': '12px',
        'pix-base': '13px',
      },
    },
  },
  plugins: [],
}
