import { createServerClient } from "@/lib/supabase/server";
import { OverheadClient } from "./OverheadClient";

export default async function OverheadPage() {
  const supabase = await createServerClient();

  const [{ data: items }, { data: settings }] = await Promise.all([
    supabase
      .from("overhead_items")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("settings").select("*").eq("key", "annual_billable_days"),
  ]);

  const annualBillableDays = settings?.[0]?.value
    ? Number(settings[0].value)
    : 220;

  return (
    <OverheadClient
      initialItems={items ?? []}
      initialBillableDays={annualBillableDays}
    />
  );
}
