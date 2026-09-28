import type { BottomTabBarProps } from 'expo-router/tabs';
import { ChartBar, House, Receipt, Wallet, type Icon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { PressableBase } from './internal/PressableBase';
import { ScanButton } from './ScanButton';

// docs/COMPONENTS.md: the scan button rises 18px above the top edge of the tab bar.
const SCAN_LIFT = 18;
const ICON_SIZE = 24;

const TABS: Record<string, { icon: Icon; label: 'tabs.home' | 'tabs.receipts' | 'tabs.insights' | 'tabs.budgets' }> = {
  index: { icon: House, label: 'tabs.home' },
  receipts: { icon: Receipt, label: 'tabs.receipts' },
  insights: { icon: ChartBar, label: 'tabs.insights' },
  budgets: { icon: Wallet, label: 'tabs.budgets' },
};

type Props = BottomTabBarProps & { onScan?: () => void; onScanLongPress?: () => void };

/** App tab bar: Home · Receipts · Scan · Insights · Budgets. */
export function TabBar({ state, navigation, insets, onScan, onScanLongPress }: Props) {
  const { t } = useTranslation();
  const { colors, space, size, type } = useTheme();

  const tab = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    const config = TABS[route.name];
    if (!config) return null;
    const focused = state.index === routeIndex;
    const color = focused ? colors.stampInk : colors.inkMuted;
    const TabIcon = config.icon;

    return (
      <PressableBase
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={{ flex: 1, minHeight: size.hitMin, alignItems: 'center', justifyContent: 'center', gap: space[1] / 2, paddingTop: space[2] }}>
        <TabIcon size={ICON_SIZE} color={color} weight="regular" />
        <Text style={[type.caption, { color }]} numberOfLines={1}>
          {t(config.label)}
        </Text>
      </PressableBase>
    );
  };

  const half = Math.ceil(state.routes.length / 2);

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.paperRaised,
        borderTopWidth: 1,
        borderTopColor: colors.rule,
        paddingBottom: Math.max(insets.bottom, space[2]),
      }}>
      {state.routes.slice(0, half).map((_, i) => tab(i))}
      <View style={{ width: size.scanButton + space[4], alignItems: 'center' }}>
        <View style={{ marginTop: -SCAN_LIFT }}>
          <ScanButton onPress={onScan} onLongPress={onScanLongPress} />
        </View>
      </View>
      {state.routes.slice(half).map((_, i) => tab(half + i))}
    </View>
  );
}
