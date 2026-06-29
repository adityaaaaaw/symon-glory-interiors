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
        primary: '#1E293B',
        secondary: '#475569',
        accentGold: '#D4A017',
        bgBase: '#FAFAFA',
        bgSurface: '#FFFFFF',
        borderColor: '#E5E7EB',
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
        
        // Dark theme specific variants for ease of styling
        darkBg: '#0F172A',
        darkSurface: '#1E293B',
        darkBorder: '#334155',
        darkTextPrimary: '#F8FAFC',
        darkTextSecondary: '#94A3B8'
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
      },
      boxShadow: {
        'gold': '0 4px 14px 0 rgba(212, 160, 23, 0.15)',
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 1px 1px 0 rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
