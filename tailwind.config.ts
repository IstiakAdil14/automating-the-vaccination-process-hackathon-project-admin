import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    /* ── Container ── */
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1400px" },
    },

    extend: {
      /* ── Colors ── */
      colors: {
        /* ShadCN semantic tokens → CSS vars */
        border:      "var(--border)",
        input:       "var(--border)",
        ring:        "var(--accent)",
        background:  "var(--background)",
        foreground:  "var(--foreground)",
        primary: {
          DEFAULT:    "var(--primary)",
          hover:      "var(--primary-hover)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--danger)",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          hover:      "var(--accent-hover)",
          subtle:     "var(--accent-subtle)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT:    "var(--surface)",
          foreground: "var(--foreground)",
          raised:     "var(--surface-raised)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },

        /* Semantic status */
        warning: {
          DEFAULT:    "var(--warning)",
          subtle:     "var(--warning-subtle)",
          foreground: "var(--warning-foreground)",
        },
        danger: {
          DEFAULT:    "var(--danger)",
          subtle:     "var(--danger-subtle)",
          foreground: "var(--danger-foreground)",
        },
        info: {
          DEFAULT:    "var(--info)",
          subtle:     "var(--info-subtle)",
          foreground: "var(--info-foreground)",
        },
        success: {
          DEFAULT:    "var(--accent)",
          subtle:     "var(--accent-subtle)",
          foreground: "var(--accent-foreground)",
        },

        /* Sidebar */
        sidebar: {
          bg:          "var(--sidebar-bg)",
          border:      "var(--sidebar-border)",
          text:        "var(--sidebar-text)",
          muted:       "var(--sidebar-text-muted)",
          active:      "var(--sidebar-active-text)",
          "active-bg": "var(--sidebar-active-bg)",
          hover:       "var(--sidebar-hover-bg)",
        },

        /* Raw navy palette */
        navy: {
          50:  "var(--navy-50)",
          100: "var(--navy-100)",
          200: "var(--navy-200)",
          300: "var(--navy-300)",
          400: "var(--navy-400)",
          500: "var(--navy-500)",
          600: "var(--navy-600)",
          700: "var(--navy-700)",
          800: "var(--navy-800)",
          900: "var(--navy-900)",
          950: "var(--navy-950)",
        },

        /* Raw health-green palette */
        "health-green": {
          50:  "var(--health-green-50)",
          100: "var(--health-green-100)",
          300: "var(--health-green-300)",
          400: "var(--health-green-400)",
          500: "var(--health-green-500)",
          600: "var(--health-green-600)",
          700: "var(--health-green-700)",
          800: "var(--health-green-800)",
          900: "var(--health-green-900)",
        },
      },

      /* ── Border Radius ── */
      borderRadius: {
        sm:   "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },

      /* ── Box Shadow ── */
      boxShadow: {
        xs:          "var(--shadow-xs)",
        sm:          "var(--shadow-sm)",
        DEFAULT:     "var(--shadow-md)",
        md:          "var(--shadow-md)",
        lg:          "var(--shadow-lg)",
        xl:          "var(--shadow-xl)",
        "glow-green": "var(--shadow-glow-green)",
        "glow-navy":  "var(--shadow-glow-navy)",
      },

      /* ── Typography ── */
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem",  { lineHeight: "1rem" }],
        xs:    ["0.75rem",   { lineHeight: "1rem" }],
        sm:    ["0.875rem",  { lineHeight: "1.25rem" }],
        base:  ["1rem",      { lineHeight: "1.5rem" }],
        lg:    ["1.125rem",  { lineHeight: "1.75rem" }],
        xl:    ["1.25rem",   { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem",    { lineHeight: "2rem" }],
        "3xl": ["1.875rem",  { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem",   { lineHeight: "2.5rem" }],
      },

      /* ── Spacing ── */
      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
        "sidebar":          "16rem",   /* 256px expanded */
        "sidebar-collapsed": "4.5rem", /* 72px collapsed */
        "topbar":           "4rem",    /* 64px */
      },

      /* ── Animations ── */
      keyframes: {
        slideIn: {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to:   { transform: "translateX(0)",     opacity: "1" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        fadeUp: {
          from: { transform: "translateY(16px)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
        scaleIn: {
          from: { transform: "scale(0.95)", opacity: "0" },
          to:   { transform: "scale(1)",    opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "slide-in":       "slideIn 0.3s ease forwards",
        "slide-in-right": "slideInRight 0.3s ease forwards",
        "fade-up":        "fadeUp 0.4s ease forwards",
        "fade-in":        "fadeIn 0.3s ease forwards",
        "pulse-slow":     "pulseSlow 2s ease-in-out infinite",
        "scale-in":       "scaleIn 0.2s ease forwards",
        "shimmer":        "shimmer 1.5s infinite",
        "spin-slow":      "spinSlow 3s linear infinite",
        "bounce-subtle":  "bounceSubtle 2s ease-in-out infinite",
      },

      /* ── Backdrop Blur ── */
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },

      /* ── Transitions ── */
      transitionDuration: {
        "50":  "50ms",
        "150": "150ms",
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
