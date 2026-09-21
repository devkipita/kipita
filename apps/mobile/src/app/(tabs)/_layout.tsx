import React from 'react';
import { Tabs } from 'expo-router';
import { TopBar } from '@/components/shared/TopBar';
import { FloatingTabBar } from '@/components/shared/FloatingTabBar';
import { FloatingChatBubble } from '@/components/core/FloatingChatBubble';
import { useLocale } from '@/hooks';

export default function TabLayout() {
  const { t } = useLocale();
  
  return (
    <>
      <TopBar />
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tabs.Screen name="home" options={{ title: t('home') }} />
        <Tabs.Screen name="trips" options={{ title: t('trips') }} />
        <Tabs.Screen name="alerts" options={{ title: t('alerts') }} />
        <Tabs.Screen name="profile" options={{ title: t('profile') }} />
      </Tabs>
      <FloatingChatBubble />
    </>
  );
}
