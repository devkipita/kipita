import React, { useCallback, useEffect, useState } from "react";
import { AppState, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "@/lib/query/client";
import { setupQueryLifecycle } from "@/lib/query/lifecycle";
import { gateway } from "@/lib/realtime/gateway";
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

  const hydrateSession = useCallback(
    async (
      session: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"],
    ) => {
      if (!session) {
        setUser(null);
        setSession(null);
        gateway.stop();
        return;
      }

      // ── 1) Apply the session immediately — never block the app on a profile
      //        fetch. We always have a real auth id, so downstream user-scoped
      //        queries and realtime are valid right away.
      setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      // Authorise the realtime socket so RLS-scoped channels work.
      supabase.realtime.setAuth(session.access_token);

      const authId = session.user.id;
      // Seed a minimal-but-valid user (real id — never "") so nothing breaks
      // while the full profile loads in the background.
      const existing = useAuthStore.getState().user;
      if (!existing || existing.id !== authId) {
        setUser({
          id: authId,
          full_name: session.user.user_metadata?.full_name ?? "",
          first_name: session.user.user_metadata?.first_name ?? null,
          last_name: session.user.user_metadata?.last_name ?? null,
          phone: session.user.phone ?? null,
          email: session.user.email ?? null,
          avatar_url: null,
          city: null,
          is_verified: false,
          rating: 0,
          total_trips: 0,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
          profile_prompt_dismissed_at: null,
        } as any);
      }
      gateway.start(authId);

      // ── 2) Enrich with the DB profile in the background, with a timeout so a
      //        slow/hung RPC can never freeze the experience.
      try {
        const rpc = supabase.rpc("current_user_profile");
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("profile-timeout")), 6000),
        );
        const { data: profiles, error } = (await Promise.race([
          rpc,
          timeout,
        ])) as Awaited<typeof rpc>;
        if (error) throw error;

        const profile = profiles?.[0];
        if (profile) {
          setUser({
            ...profile,
            email: session.user.email ?? null,
            phone: session.user.phone ?? null,
          } as any);
        }
      } catch (error) {
        // Keep the seeded user; the app stays usable and we retry on next focus.
        console.warn("Profile enrichment deferred:", error);
      }
    },
    [setSession, setUser],
  );

  useEffect(() => {
    let mounted = true;

    const bootstrapSession = async () => {
      const { data } = await supabase.auth.getSession();
      // Apply the session synchronously, but DON'T await profile enrichment —
      // the splash lifts as soon as we know the session, not 6s later.
      void hydrateSession(data.session);
      if (!mounted) return;
      setSessionReady(true);
    };

    void bootstrapSession();

    const exchangeAuthCode = async (url: string | null) => {
      if (!url) {
        return;
      }

      try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get("code");

        if (!code) {
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          throw error;
        }
      } catch (error) {
        console.warn("Failed to exchange auth callback code", error);
      }
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateSession(session).finally(() => {
        if (mounted) {
          setSessionReady(true);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
      appStateSubscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, [hydrateSession]);

  // Bridge connectivity + foreground into React Query and the offline banner.
  useEffect(() => setupQueryLifecycle(), []);

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
