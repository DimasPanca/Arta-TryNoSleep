import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          400: 'var(--color-brand-400)',
          600: 'var(--color-brand-600)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
        },
        amber: {
          100: 'var(--color-amber-100)',
          400: 'var(--color-amber-400)',
        },
        danger: {
          100: 'var(--color-danger-100)',
          400: 'var(--color-danger-400)',
        },
        surface:        'var(--color-surface)',
        'surface-card': 'var(--color-surface-card)',
        border:         'var(--color-border)',
        'border-strong':'var(--color-border-strong)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary':'var(--color-text-secondary)',
        'text-muted':   'var(--color-text-muted)',
        grade: {
          a: 'var(--color-grade-a)',
          b: 'var(--color-grade-b)',
          c: 'var(--color-grade-c)',
          d: 'var(--color-grade-d)',
          f: 'var(--color-grade-f)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body:    'var(--font-body)',
        mono:    'var(--font-mono)',
      },
      fontSize: {
        xs:   'var(--text-xs)',
        sm:   'var(--text-sm)',
        base: 'var(--text-base)',
        lg:   'var(--text-lg)',
        xl:   'var(--text-xl)',
        '2xl':'var(--text-2xl)',
        '4xl':'var(--text-4xl)',
      },
      transitionDuration: {
        fast:   'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow:   'var(--duration-slow)',
      },
      transitionTimingFunction: {
        'ease-out':    'var(--ease-out)',
        'ease-in-out': 'var(--ease-in-out)',
      },
    },
  },
  plugins: [],
};

export default config;
