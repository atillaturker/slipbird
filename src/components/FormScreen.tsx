import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Dimensions, Keyboard, LayoutAnimation, Platform, ScrollView, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { keyboardOverlap, keyboardTopEdge, scrollTargetFor } from '@/lib/keyboard';
import { useTheme } from '@/theme';

const ANDROID = Platform.OS === 'android';
// iOS animates the keyboard; the layout follows it. Android reports the final position only.
const MIN_KEYBOARD_ANIMATION_MS = 150;

/** Tells the enclosing form to scroll the focused field into view (fields call it when they gain focus). */
const FocusScrollContext = createContext<() => void>(() => undefined);
export function useFocusScroll(): () => void {
  return useContext(FocusScrollContext);
}

/**
 * How many pixels of `containerRef`'s bottom the keyboard covers. Works from the keyboard's own events and the
 * container's position in the window, so it does not depend on the window being resized (edge-to-edge Android
 * is not) or on header heights (KeyboardAvoidingView needs those as an offset).
 */
function useKeyboardOverlap(containerRef: RefObject<View | null>): number {
  const [overlap, setOverlap] = useState(0);
  const { bottom: bottomInset } = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const apply = (next: number, animationMs?: number) => {
      if (Platform.OS === 'ios' && animationMs !== undefined) {
        LayoutAnimation.configureNext({ duration: Math.max(animationMs, MIN_KEYBOARD_ANIMATION_MS), update: { type: LayoutAnimation.Types.keyboard } });
      }
      setOverlap(next);
    };

    const show = Keyboard.addListener(showEvent, (event) => {
      const node = containerRef.current;
      if (!node) return;
      node.measureInWindow((_x, y, _width, height) => {
        const top = keyboardTopEdge(event.endCoordinates, Dimensions.get('screen').height, bottomInset, ANDROID);
        apply(keyboardOverlap(y, height, top), event.duration);
      });
    });
    const hide = Keyboard.addListener(hideEvent, (event) => apply(0, event?.duration));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [containerRef, bottomInset]);

  return overlap;
}

type Props = {
  children: ReactNode;
  /** The primary action(s): stays visible directly above the keyboard, never scrolled away. */
  footer: ReactNode;
  /** For screens that scroll to a field themselves (e.g. review scrolls to the first flagged field). */
  scrollRef?: RefObject<ScrollView | null>;
};

/**
 * A form screen that stays usable with the keyboard open: the content scrolls, the focused field is brought
 * into view, and the footer (the primary button) rides above the keyboard on both iOS and Android.
 * Use as the root of a screen; it fills the space below the navigation header.
 */
export function FormScreen({ children, footer, scrollRef }: Props) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const rootRef = useRef<View>(null);
  const ownScrollRef = useRef<ScrollView>(null);
  const scroll = scrollRef ?? ownScrollRef;
  const contentRef = useRef<View>(null);
  const scrollY = useRef(0);
  const viewportHeight = useRef(0);
  const overlap = useKeyboardOverlap(rootRef);

  const scrollToFocused = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const content = contentRef.current;
    if (!input || !content) return;
    input.measureLayout(
      content,
      (_x, y, _width, height) => {
        const target = scrollTargetFor({ y, height }, { scrollY: scrollY.current, height: viewportHeight.current }, space[4]);
        if (target !== null) scroll.current?.scrollTo({ y: target, animated: true });
      },
      () => undefined,
    );
  }, [scroll, space]);

  // Fields report focus; the keyboard opening changes the viewport (onLayout below), which re-checks too.
  const onFieldFocus = useCallback(() => {
    requestAnimationFrame(scrollToFocused);
  }, [scrollToFocused]);

  const onScrollLayout = (event: LayoutChangeEvent) => {
    const changed = Math.abs(event.nativeEvent.layout.height - viewportHeight.current) > 1;
    viewportHeight.current = event.nativeEvent.layout.height;
    if (changed) scrollToFocused();
  };

  const keyboardOpen = overlap > 0;

  return (
    <FocusScrollContext.Provider value={onFieldFocus}>
      <View ref={rootRef} collapsable={false} style={{ flex: 1, backgroundColor: colors.paper, paddingBottom: overlap }}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          onLayout={onScrollLayout}>
          <View ref={contentRef} collapsable={false} style={{ padding: space[4], paddingBottom: space[6], gap: space[6] }}>
            {children}
          </View>
        </ScrollView>
        <View
          style={{
            paddingHorizontal: space[4],
            paddingTop: space[3],
            // The keyboard covers the safe area; without it, clear the home indicator / navigation bar.
            paddingBottom: keyboardOpen ? space[3] : Math.max(insets.bottom, space[3]),
            gap: space[2],
            borderTopWidth: 1,
            borderTopColor: colors.rule,
            backgroundColor: colors.paper,
          }}>
          {footer}
        </View>
      </View>
    </FocusScrollContext.Provider>
  );
}
