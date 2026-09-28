import { Tabs } from 'expo-router';
import { useState } from 'react';

import { ScanMenu } from '@/components/ScanMenu';
import { TabBar } from '@/components/TabBar';
import { useScanActions } from '@/store/scan';

export default function TabsLayout() {
  const actions = useScanActions();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} onScan={() => void actions.scan()} onScanLongPress={() => setMenuOpen(true)} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="receipts" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="budgets" />
      </Tabs>
      <ScanMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onImport={() => void actions.importPhotos()}
        onScanQr={actions.scanQr}
      />
    </>
  );
}
