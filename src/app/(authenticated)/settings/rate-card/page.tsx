import { createServerClient } from "@/lib/supabase/server";
import { calculateOverheadPerDay } from "@/lib/calculations";
import { RateCardClient } from "./RateCardClient";

export default async function RateCardPage() {
  const supabase = await createServerClient();

  const [{ data: roles }, { data: overheadItems }, { data: settings }] =
    await Promise.all([
      supabase
        .from("roles")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase.from("overhead_items").select("monthly_cost"),
      supabase
        .from("settings")
        .select("*")
        .eq("key", "annual_billable_days"),
    ]);

  const annualBillableDays = settings?.[0]?.value
    ? Number(settings[0].value)
    : 220;

  const totalMonthlyOverhead = (overheadItems ?? []).reduce(
    (sum, i) => sum + Number(i.monthly_cost),
    0
  );

  const overheadPerDay = calculateOverheadPerDay(
    totalMonthlyOverhead,
    annualBillableDays
  );

  return (
    <RateCardClient
      initialRoles={roles ?? []}
      overheadPerDay={overheadPerDay}
    />
  );
}
