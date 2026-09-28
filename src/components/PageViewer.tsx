import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/theme';

import { Chip } from './Chip';
import { ZoomableImage } from './ZoomableImage';

/**
 * The receipt photos on the review screen: one page at a time, pinch to zoom; page chips switch
 * pages (swiping would fight panning a zoomed page).
 */
export function PageViewer({ uris, height }: { uris: string[]; height: number }) {
  const { t } = useTranslation();
  const { colors, space, radius } = useTheme();
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);

  if (uris.length === 0) return null;
  const current = Math.min(page, uris.length - 1);

  return (
    <View style={{ gap: space[2] }}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.paperSunken }}>
        {width > 0 && (
          <ZoomableImage
            key={uris[current]}
            uri={uris[current]}
            width={width}
            height={height}
            accessibilityLabel={`${t('photos.page', { n: current + 1, count: uris.length })}. ${t('zoom.hint')}`}
          />
        )}
      </View>
      {uris.length > 1 && (
        <View style={{ flexDirection: 'row', gap: space[2], justifyContent: 'center' }}>
          {uris.map((uri, i) => (
            <Chip key={uri} selected={i === current} onPress={() => setPage(i)}>
              {t('photos.page', { n: i + 1, count: uris.length })}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}
