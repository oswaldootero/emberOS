import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
        // EmberOS palette — every scale resolves through CSS variables so
        // the same utility classes work in light (:root) and dark (.dark).
        // See globals.css for both value sets.
        ink: {
          950: "hsl(var(--ink-950) / <alpha-value>)",
          900: "hsl(var(--ink-900) / <alpha-value>)",
          850: "hsl(var(--ink-850) / <alpha-value>)",
          800: "hsl(var(--ink-800) / <alpha-value>)",
          700: "hsl(var(--ink-700) / <alpha-value>)",
          600: "hsl(var(--ink-600) / <alpha-value>)",
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
          50: "hsl(var(--ember-50) / <alpha-value>)",
          100: "hsl(var(--ember-100) / <alpha-value>)",
          200: "hsl(var(--ember-200) / <alpha-value>)",
          300: "hsl(var(--ember-300) / <alpha-value>)",
          400: "hsl(var(--ember-400) / <alpha-value>)",
          500: "hsl(var(--ember-500) / <alpha-value>)",
          600: "hsl(var(--ember-600) / <alpha-value>)",
          700: "hsl(var(--ember-700) / <alpha-value>)",
        },
        ivory: {
          DEFAULT: "hsl(var(--ivory) / <alpha-value>)",
          50: "hsl(var(--ivory-50) / <alpha-value>)",
          100: "hsl(var(--ivory-100) / <alpha-value>)",
          200: "hsl(var(--ivory-200) / <alpha-value>)",
          300: "hsl(var(--ivory-300) / <alpha-value>)",
        },
        // The codebase leans on `border-white/[0.05]`-style utilities for
        // hairline borders and hover surfaces. Remap `white` to a theme
        // variable: white in dark mode, near-black in light mode, so those
        // hairlines stay visible on paper. (No component uses text-white.)
        white: "hsl(var(--contrast) / <alpha-value>)",
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
        glow: "var(--shadow-glow)",
        "glow-sm": "var(--shadow-glow-sm)",
        cinematic: "var(--shadow-cinematic)",
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
  plugins: [tailwindcssAnimate],
};

export default config;
