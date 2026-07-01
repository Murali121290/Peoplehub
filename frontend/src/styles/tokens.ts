export const colors = {
  primary: {
    50: '#EFF7F8', 100: '#D7EBED', 200: '#B0D7DB', 300: '#7FBEC5', 400: '#4B9CA6',
    500: '#1F7A8C', 600: '#186370', 700: '#144F5A', 800: '#123F48', 900: '#0F323A', 950: '#081D22',
  },
  secondary: {
    50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA',
    500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A',
  },
  success: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 500: '#10B981', 600: '#059669', 700: '#047857' },
  warning: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
  danger: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
  info: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
  neutral: {
    25: '#FBFCFE', 50: '#F8FAFF', 100: '#F0F4FF', 200: '#DCDEF5', 300: '#C7CBE8', 400: '#94A3B8',
    500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A', 950: '#080D18',
  },
  surface: '#FFFFFF',
} as const;

export const chartPalette = [
  colors.primary[500],
  colors.secondary[500],
  colors.success[500],
  colors.warning[500],
  colors.danger[500],
  colors.primary[300],
  colors.secondary[300],
];

export const statusColors = {
  active: colors.success[500],
  approved: colors.success[500],
  present: colors.success[500],
  pending: colors.warning[500],
  late: colors.warning[500],
  rejected: colors.danger[500],
  absent: colors.danger[500],
  inactive: colors.neutral[400],
  onLeave: colors.info[500],
} as const;
