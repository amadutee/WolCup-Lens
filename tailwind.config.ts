import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          700: "#047857",
          900: "#064e3b",
        },
        ink: "#07111f",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(16, 185, 129, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
