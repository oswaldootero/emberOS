import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        // EmberOS cinematic palette
        ink: {
          950: "#07060a",
          900: "#0b0a0f",
          850: "#0f0e14",
          800: "#13121a",
          700: "#1a1922",
          600: "#22202c",
        },
        tobacco: {
          50: "#f5ede1",
          100: "#e6d4b8",
          200: "#cdb088",
          300: "#a8845a",
          400: "#7f5f3b",
          500: "#5c4527",
          600: "#3d2d18",
          700: "#2a1f10",
          800: "#1a130a",
          900: "#0e0a05",
        },
        ember: {
          50: "#fff5e0",
          100: "#ffe3a8",
          200: "#f5c97a",
          300: "#e3b04f",
          400: "#c69437",
          500: "#a4761e",
          600: "#7f5912",
          700: "#5a3e08",
        },
        ivory: {
          DEFAULT: "#f4ecd8",
          50: "#fbf7ee",
          100: "#f4ecd8",
          200: "#e6d8b6",
          300: "#cfbb8c",
        },
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
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "ember-glow":
          "radial-gradient(ellipse at top, rgba(198, 148, 55, 0.15), transparent 60%)",
        "tobacco-grain":
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.02) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(198,148,55,0.04) 0%, transparent 40%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(198, 148, 55, 0.35)",
        "glow-sm": "0 0 20px -8px rgba(198, 148, 55, 0.25)",
        cinematic:
          "0 20px 60px -20px rgba(0,0,0,0.8), 0 8px 24px -8px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out",
        shimmer: "shimmer 3s linear infinite",
        glow: "glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
