/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        akr: {
          bg: '#0B0B0C',
          surface: '#161617',
          'surface-card': '#1C1C1E',
          'surface-light': '#F7F5F0',
          border: '#27272A',
          'border-gold': 'rgba(212, 175, 55, 0.35)',
          'border-gold-bright': '#D4AF37',
          gold: '#D4AF37',
          'gold-light': '#F3D98B',
          'gold-dark': '#C99A2E',
          'text-primary': '#FFFFFF',
          'text-muted': '#9A9A9A',
          'text-dim': '#666668',
          success: '#2E9E5B',
          warning: '#E0A526',
          danger: '#D64545',
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #F3D98B, #C99A2E)',
        'gold-gradient-hover': 'linear-gradient(135deg, #F8E4A0, #DCA938)',
        'gold-card-sheen': 'linear-gradient(135deg, rgba(243, 217, 139, 0.15), rgba(201, 154, 46, 0.05))',
        'dark-gradient': 'linear-gradient(180deg, #1A1A1C 0%, #0B0B0C 100%)',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.25)',
        'gold-glow-lg': '0 0 35px rgba(212, 175, 55, 0.35)',
        'card-dark': '0 10px 30px -10px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
}
