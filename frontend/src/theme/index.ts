import { createTheme, MantineColorsTuple } from '@mantine/core';
import CRM_COLORS from './colors';

// OneAssist Signature Royal Swatch
const oneassist: MantineColorsTuple = [
  '#EFF6FF',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#60A5FA',
  '#3B82F6',
  '#2563EB',
  '#1D4ED8',
  '#1E40AF',
  '#1E3A8A',
];

// Modern Slate Neutral Swatch
const slate: MantineColorsTuple = [
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#475569',
  '#334155',
  '#1e293b',
  '#0f172a',
];

export const theme = createTheme({
  fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, monospace',
  headings: {
    fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '700',
  },
  primaryColor: 'oneassist',
  primaryShade: 6,
  defaultGradient: {
    from: '#1D4ED8',
    to: '#3B82F6',
    deg: 135,
  },
  colors: {
    oneassist,
    blue: oneassist,
    indigo: oneassist,
    slate,
  },
  defaultRadius: 'xl',
  cursorType: 'pointer',
  components: {
    Button: {
      defaultProps: {
        radius: 'xl',
      },
      styles: {
        root: {
          fontWeight: 600,
          letterSpacing: '0.01em',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'xl',
        padding: 'lg',
      },
      styles: {
        root: {
          border: `1px solid ${CRM_COLORS.border}`,
          backgroundColor: CRM_COLORS.cardBg,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.25s ease',
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'xl',
        variant: 'light',
      },
      styles: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          padding: '4px 10px',
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Select: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Modal: {
      defaultProps: {
        radius: '24px',
        overlayProps: {
          blur: 6,
          backgroundOpacity: 0.45,
        },
      },
    },
    Tooltip: {
      defaultProps: {
        radius: 'md',
        withArrow: true,
      },
    },
    Checkbox: {
      defaultProps: {
        radius: 'sm',
        color: 'oneassist',
      },
    },
  },
});

export { CRM_COLORS };
