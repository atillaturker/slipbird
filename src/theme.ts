// Slipbird design tokens — generated from the Slipbird design system. Do not edit values by hand.
// Fonts: npx expo install @expo-google-fonts/instrument-sans @expo-google-fonts/ibm-plex-mono expo-font
import { useColorScheme, TextStyle } from 'react-native';

const lightColors = {
  paper: '#f2f3ef',
  paperRaised: '#ffffff',
  paperSunken: '#e6e8e2',
  rule: '#dfe2dc',
  ruleStrong: '#838a82',
  ink: '#121613',
  inkMuted: '#555c55',
  stamp: '#0b6b4c',
  onStamp: '#ffffff',
  stampSoft: '#dcf1e6',
  stampInk: '#0a6446',
  check: '#7d5200',
  checkSoft: '#fbefcc',
  danger: '#b3261e',
  dangerSoft: '#fbe7e4',
  focus: '#121613',
};

const darkColors: typeof lightColors = {
  paper: '#0e1210',
  paperRaised: '#181d1a',
  paperSunken: '#222824',
  rule: '#2c332e',
  ruleStrong: '#6f7871',
  ink: '#edf1ec',
  inkMuted: '#a0a9a1',
  stamp: '#4fd6a0',
  onStamp: '#05231a',
  stampSoft: '#12342a',
  stampInk: '#5fe0ab',
  check: '#f5c451',
  checkSoft: '#382c0b',
  danger: '#ff8a7a',
  dangerSoft: '#3d1916',
  focus: '#edf1ec',
};

/** Category colours, fixed order. A 9th category folds into `other`. Never use for text. */
export const categoryOrder = ['groceries', 'dining', 'transport', 'shopping', 'health', 'bills', 'home', 'entertainment', 'other'] as const;
export type Category = (typeof categoryOrder)[number];

const lightCategories: Record<Category, string> = {
  groceries: '#2a78d6',
  dining: '#eb6834',
  transport: '#1baf7a',
  shopping: '#eda100',
  health: '#e87ba4',
  bills: '#008300',
  home: '#4a3aa7',
  entertainment: '#e34948',
  other: '#8f958d',
};

const darkCategories: Record<Category, string> = {
  groceries: '#3987e5',
  dining: '#d95926',
  transport: '#199e70',
  shopping: '#c98500',
  health: '#d55181',
  bills: '#008300',
  home: '#9085e9',
  entertainment: '#e66767',
  other: '#6f7871',
};

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  full: 999,
} as const;

export const size = {
  hitMin: 44,
  thumb: 44,
  scanButton: 64,
  perforation: 8,
} as const;

/** Words use Instrument Sans; every amount, receipt date and line item uses a figure* style (IBM Plex Mono). */
export const type = {
  title1: { fontFamily: 'InstrumentSans_600SemiBold', fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title2: { fontFamily: 'InstrumentSans_600SemiBold', fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headline: { fontFamily: 'InstrumentSans_600SemiBold', fontSize: 16, lineHeight: 22 },
  body: { fontFamily: 'InstrumentSans_400Regular', fontSize: 16, lineHeight: 24 },
  subhead: { fontFamily: 'InstrumentSans_400Regular', fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: 'InstrumentSans_500Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  figureXl: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 40, lineHeight: 44, letterSpacing: -1.0 },
  figureMd: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 16, lineHeight: 22 },
  figureSm: { fontFamily: 'IBMPlexMono_400Regular', fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export const shadow = {
  lift: {
    light: { shadowColor: '#121613', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    dark: { shadowColor: '#000000', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  },
} as const;

export const themes = {
  light: { colors: lightColors, categories: lightCategories },
  dark: { colors: darkColors, categories: darkCategories },
};
export type Colors = typeof lightColors;
export type Scheme = keyof typeof themes;

export function useTheme() {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, ...themes[scheme], space, radius, size, type, shadow: { lift: shadow.lift[scheme] } };
}
