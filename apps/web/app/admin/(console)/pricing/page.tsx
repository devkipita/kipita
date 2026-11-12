import { createClient } from "@/lib/supabase/server";
import { loadAudit } from "@/lib/admin/console.server";
import { SETTING_FALLBACKS } from "@/lib/platform";
import { PricingView, type PricingSettings } from "@/components/admin/console/PricingView";

export const metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};

export default async function AdminPricingPage() {
  const supabase = await createClient();
  const [{ data: rows }, log] = await Promise.all([
    supabase.from("platform_settings").select("key, value"),
    loadAudit("setting.update", 10),
  ]);

  const settings: PricingSettings = { ...SETTING_FALLBACKS };
  for (const row of rows ?? []) {
    const value = Number(row.value);
    if (row.key in settings && Number.isFinite(value)) settings[row.key as keyof PricingSettings] = value;
  }

  return <PricingView settings={settings} log={log.data ?? []} logError={log.error} />;
}
