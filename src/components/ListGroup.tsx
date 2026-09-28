import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

/** `paper-raised` group, `radius-md`, 1px `rule` border; hairlines between rows inset to the text column. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors, radius } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.rule, overflow: 'hidden', backgroundColor: colors.paperRaised }}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <Hairline />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * One row of a group rendered item by item (SectionList): draws the part of the group border this row owns.
 */
export function GroupRow({ first, last, children }: { first: boolean; last: boolean; children: ReactNode }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: last ? 1 : 0,
        borderColor: colors.rule,
        borderTopLeftRadius: first ? radius.md : 0,
        borderTopRightRadius: first ? radius.md : 0,
        borderBottomLeftRadius: last ? radius.md : 0,
        borderBottomRightRadius: last ? radius.md : 0,
        overflow: 'hidden',
        backgroundColor: colors.paperRaised,
      }}>
      {!first && <Hairline />}
      {children}
    </View>
  );
}

function Hairline() {
  const { colors, space } = useTheme();
  return <View style={{ height: 1, marginLeft: space[4], backgroundColor: colors.rule }} />;
}
