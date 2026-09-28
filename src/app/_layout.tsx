import '@/i18n';

import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startScanQueue } from '@/services/scan-queue';
import { ensureSession } from '@/services/supabase';
import { processQueuedReceipt } from '@/store/scan';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme, colors, type } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Anonymous session for parse-receipt, and the offline scan queue (retries when back online).
  useEffect(() => {
    void ensureSession();
    return startScanQueue(processQueuedReceipt);
  }, []);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: colors.paper, card: colors.paperRaised, text: colors.ink, border: colors.rule, primary: colors.stamp },
  };

  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.paper },
    headerShadowVisible: false,
    headerTintColor: colors.stampInk,
    headerTitleStyle: { fontFamily: type.headline.fontFamily, fontSize: type.headline.fontSize, color: colors.ink },
    headerBackButtonDisplayMode: 'minimal',
  } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="receipt/[id]" options={header} />
          <Stack.Screen name="receipt/new" options={{ ...header, presentation: 'modal' }} />
          <Stack.Screen name="scan/review" options={header} />
          <Stack.Screen name="scan/capture" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="dev/components" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
