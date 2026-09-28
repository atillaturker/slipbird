import { Image } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MAX_SCALE = 4;

type Props = {
  uri: string;
  width: number;
  height: number;
  accessibilityLabel: string;
};

/** A receipt page you can pinch to zoom, pan while zoomed, and double-tap to reset. */
export function ZoomableImage({ uri, width, height, accessibilityLabel }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const clampPan = (value: number, size: number, s: number) => {
    'worklet';
    const limit = (size * (s - 1)) / 2;
    return Math.min(limit, Math.max(-limit, value));
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) reset();
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      x.value = clampPan(savedX.value + e.translationX, width, scale.value);
      y.value = clampPan(savedY.value + e.translationY, height, scale.value);
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => reset());

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={{ width, height, overflow: 'hidden' }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}>
        <Animated.View style={[{ width, height }, style]}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
