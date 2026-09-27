import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { Badge, type BadgeTone } from './Badge';
import { DashedRule, TornEdge } from './internal/Perforation';

// docs/COMPONENTS.md: the total is figure-xl scaled to 30px.
const TOTAL_FONT_SIZE = 30;
const TOTAL_LINE_HEIGHT = 36;

type Props = {
  merchant: string;
  date: string;
  number?: string;
  badge?: { tone: BadgeTone; label: string };
  items: { name: string; qty?: string; amount: string }[];
  tax?: { label: string; amount: string }[];
  total: string;
  totalLabel?: string;
  images?: string[];
};

export function ReceiptCard({ merchant, date, number, badge, items, tax, total, totalLabel, images }: Props) {
  const { t } = useTranslation();
  const { colors, space, radius, type } = useTheme();

  return (
    <View style={{ gap: space[4] }}>
      <View>
        <View
          style={{
            backgroundColor: colors.paperRaised,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
            paddingHorizontal: space[4],
            paddingTop: space[6],
            paddingBottom: space[4],
            gap: space[4],
          }}>
          <View style={{ alignItems: 'center', gap: space[1] }}>
            <Text style={[type.title2, { color: colors.ink, textAlign: 'center' }]}>{merchant}</Text>
            <Text style={[type.figureSm, { color: colors.inkMuted }]}>{date}</Text>
            {number ? <Text style={[type.figureSm, { color: colors.inkMuted }]}>{number}</Text> : null}
            {badge ? (
              <View style={{ marginTop: space[1] }}>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </View>
            ) : null}
          </View>

          {items.length > 0 && (
            <>
              <DashedRule />
              <View style={{ gap: space[2] }}>
                {items.map((item, i) => (
                  <View key={`${item.name}-${i}`} style={{ flexDirection: 'row', gap: space[2] }}>
                    <Text style={[type.figureSm, { flex: 1, color: colors.ink }]}>{item.name}</Text>
                    {item.qty ? <Text style={[type.figureSm, { color: colors.inkMuted }]}>{item.qty}</Text> : null}
                    <Text style={[type.figureSm, { color: colors.ink, textAlign: 'right' }]}>{item.amount}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <DashedRule />
          {tax && tax.length > 0 && (
            <View style={{ gap: space[1] }}>
              {tax.map((line, i) => (
                <View key={`${line.label}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
                  <Text style={[type.figureSm, { color: colors.inkMuted }]}>{line.label}</Text>
                  <Text style={[type.figureSm, { color: colors.inkMuted }]}>{line.amount}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[2] }}>
            <Text style={[type.headline, { color: colors.ink }]}>{totalLabel ?? t('receiptCard.total')}</Text>
            <Text
              style={[type.figureXl, { fontSize: TOTAL_FONT_SIZE, lineHeight: TOTAL_LINE_HEIGHT, color: colors.ink, flexShrink: 1 }]}
              adjustsFontSizeToFit
              numberOfLines={1}>
              {total}
            </Text>
          </View>
        </View>
        <TornEdge />
      </View>

      {images?.map((uri, i) => (
        <Image
          key={uri}
          source={{ uri }}
          accessibilityLabel={t('receiptCard.photo', { n: i + 1 })}
          resizeMode="cover"
          style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.paperSunken }}
        />
      ))}
    </View>
  );
}
