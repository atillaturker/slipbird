import { Receipt, Trash } from 'phosphor-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme, type Category } from '@/theme';

import { Badge, type BadgeTone } from './Badge';
import { ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';

const SHIMMER_MS = 900;
const SHIMMER_MIN_OPACITY = 0.4;

type Props = {
  onPress?: () => void;
  merchant: string;
  category?: Category;
  categoryLabel?: string;
  date: string;
  amount: string;
  status?: { tone: BadgeTone; label: string };
  processing?: boolean;
  thumbnailUri?: string;
  onDelete?: () => void;
};

export function ReceiptRow({ onPress, merchant, category, categoryLabel, date, amount, status, processing, thumbnailUri, onDelete }: Props) {
  const { t } = useTranslation();
  const { colors, categories, space, radius, size, type } = useTheme();
  const badge = processing ? { tone: 'neutral' as const, label: t('receiptRow.processing') } : status;

  const row = (
    <PressableBase
      onPress={onPress}
      disabled={processing}
      accessibilityRole="button"
      accessibilityLabel={[merchant, categoryLabel, date, amount, badge?.label].filter(Boolean).join(', ')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        backgroundColor: colors.paperRaised,
      }}>
      <Thumbnail uri={thumbnailUri} processing={processing} />
      <View style={{ flex: 1, gap: space[1] }}>
        <Text style={[type.headline, { color: colors.ink }]} numberOfLines={1}>
          {merchant}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          {category && <View style={{ width: space[2], height: space[2], borderRadius: radius.full, backgroundColor: categories[category] }} />}
          {categoryLabel ? (
            <Text style={[type.subhead, { color: colors.inkMuted, flexShrink: 1 }]} numberOfLines={1}>
              {categoryLabel}
            </Text>
          ) : null}
          <Text style={[type.figureSm, { color: colors.inkMuted }]} numberOfLines={1}>
            {date}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: space[1], minHeight: size.thumb, justifyContent: 'center' }}>
        <Text style={[type.figureMd, { color: colors.ink }]}>{amount}</Text>
        {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
      </View>
    </PressableBase>
  );

  if (!onDelete) return row;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={size.hitMin}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
          style={{
            width: size.hitMin * 2,
            alignItems: 'center',
            justifyContent: 'center',
            gap: space[1],
            backgroundColor: colors.dangerSoft,
          }}>
          <Trash size={ICON_SIZE_ROW} color={colors.danger} />
          <Text style={[type.caption, { color: colors.danger }]}>{t('common.delete')}</Text>
        </Pressable>
      )}>
      {row}
    </ReanimatedSwipeable>
  );
}

function Thumbnail({ uri, processing }: { uri?: string; processing?: boolean }) {
  const { colors, radius, size } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (processing) {
      opacity.value = withRepeat(withTiming(SHIMMER_MIN_OPACITY, { duration: SHIMMER_MS }), -1, true);
    } else {
      cancelAnimation(opacity);
      opacity.value = 1;
    }
  }, [processing, opacity]);

  const shimmer = useAnimatedStyle(() => ({ opacity: opacity.value }));
  // Real photo cropped 3:4 (portrait), `size.thumb` tall.
  const box = { width: (size.thumb * 3) / 4, height: size.thumb, borderRadius: radius.xs, overflow: 'hidden' as const };

  if (processing) {
    return <Animated.View style={[box, { backgroundColor: colors.paperSunken }, shimmer]} />;
  }
  if (uri) {
    return <Image source={{ uri }} style={box} resizeMode="cover" accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[box, { backgroundColor: colors.paperSunken, alignItems: 'center', justifyContent: 'center' }]}>
      <Receipt size={ICON_SIZE_ROW} color={colors.inkMuted} />
    </View>
  );
}
