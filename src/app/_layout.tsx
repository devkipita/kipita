import React, { useEffect, useState } from "react";
import { AppState, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";
import { useTheme } from "@/hooks";
import { useAuthStore } from "@/store";
import { supabase } from "@/lib/supabase";
import { SheetOrchestrator } from "@/components/shared/SheetOrchestrator";
import { OfflineBanner } from "@/components/feedback/OfflineBanner";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

function RootLayoutInner() {
  const { colors, isDark } = useTheme();
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [sessionReady, setSessionReady] = useState(false);

  const [fontsLoaded, fontsError] = useFonts({
    "DM Sans": DMSans_400Regular,
    "DM Sans Medium": DMSans_500Medium,
    "DM Sans SemiBold": DMSans_600SemiBold,
    "DM Sans Bold": DMSans_700Bold,
    "DM Sans ExtraBold": DMSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsError) throw fontsError;
  }, [fontsError]);

  useEffect(() => {
    let mounted = true;

    const bootstrapSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        const { data: profiles } = await supabase.rpc("current_user_profile");
        const profile = profiles?.[0];

        if (profile) {
          setUser({
            ...profile,
            email: data.session.user.email ?? null,
            phone: data.session.user.phone ?? null,
          } as any);
        }
      }

      if (!mounted) return;
      setSessionReady(true);
    };

    void bootstrapSession();

    const exchangeAuthCode = async (url: string | null) => {
      const code = url ? new URL(url).searchParams.get("code") : null;
      if (code) await supabase.auth.exchangeCodeForSession(code);
    };

    void Linking.getInitialURL().then(exchangeAuthCode);
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      void exchangeAuthCode(url);
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void supabase.auth.startAutoRefresh();
        } else {
          void supabase.auth.stopAutoRefresh();
        }
      },
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        const { data: profiles } = await supabase.rpc("current_user_profile");
        const profile = profiles?.[0];
        if (profile) {
          setUser({
            ...profile,
            email: session.user.email ?? null,
            phone: session.user.phone ?? null,
          } as any);
        }
      } else {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
      appStateSubscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, [setSession, setUser]);

  useEffect(() => {
    if (!fontsLoaded || !sessionReady) return;

    setLoading(false);
    void SplashScreen.hideAsync();
  }, [fontsLoaded, sessionReady, setLoading]);

  if (!fontsLoaded || !sessionReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      />
      <SheetOrchestrator />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutInner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
