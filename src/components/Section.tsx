import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { FieldLabel } from './FieldLabel';

/** A titled block on a scrolling screen (caption header, content below). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[3] }}>
      <FieldLabel>{title}</FieldLabel>
      {children}
    </View>
  );
}
