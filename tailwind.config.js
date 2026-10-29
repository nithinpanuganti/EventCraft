/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design Tokens: Warm neutral surfaces with restrained violet/indigo accents
        surface: {
          50: "#faf9f6", // warm cream / canvas
          100: "#f5f4ef",
          200: "#eae8e1",
          300: "#dedbd2",
          400: "#b8b4a7",
          500: "#8f8b7e",
          600: "#686458",
          700: "#48453c",
          800: "#2a2822",
          900: "#171613",
        },
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6", // Vibrant refined violet
          600: "#7c3aed", // Main primary
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        accent: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1", // Indigo accent
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
        info: {
          50: "#f0f9ff",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        elevated: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
        // Luminous Liquid Glass Shadow Tokens
        glass: "0 4px 24px -2px rgba(23, 22, 19, 0.05), 0 1px 3px 0 rgba(23, 22, 19, 0.03), inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 1px 0 rgba(124, 58, 237, 0.03)",
        "glass-subtle": "0 2px 10px -1px rgba(23, 22, 19, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)",
        "glass-elevated": "0 20px 48px -10px rgba(23, 22, 19, 0.10), 0 8px 20px -4px rgba(23, 22, 19, 0.05), inset 0 1.5px 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 2px 0 rgba(124, 58, 237, 0.04)",
        "glass-hover": "0 14px 34px -4px rgba(124, 58, 237, 0.12), 0 4px 12px -2px rgba(23, 22, 19, 0.04), inset 0 1.5px 0 0 rgba(255, 255, 255, 1)",
        "glass-glow": "0 0 0 1px rgba(139, 92, 246, 0.35), 0 8px 24px -4px rgba(124, 58, 237, 0.25), inset 0 1px 1px 0 rgba(255, 255, 255, 0.5)",
        "glass-glow-subtle": "0 0 0 1px rgba(139, 92, 246, 0.20), 0 4px 14px 0 rgba(124, 58, 237, 0.12)",
        "glass-inset": "inset 0 1px 2px 0 rgba(23, 22, 19, 0.04), 0 1px 0 0 rgba(255, 255, 255, 0.9)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
