import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ScopePhase, ScopeDeliverable, Role } from "@/lib/types";
import {
  calculateClientDayRate,
  calculateTotalCostPerDay,
  calculateGrossProfit,
  calculateProfitMargin,
} from "@/lib/calculations";

const fontsDir = path.join(process.cwd(), "public/fonts");

Font.register({
  family: "PP Neue Montreal",
  fonts: [
    {
      src: path.join(fontsDir, "PPNeueMontreal-Regular.ttf"),
      fontWeight: 400,
    },
    {
      src: path.join(fontsDir, "PPNeueMontreal-Medium.ttf"),
      fontWeight: 500,
    },
    {
      src: path.join(fontsDir, "PPNeueMontreal-Bold.ttf"),
      fontWeight: 600,
    },
  ],
});

const c = {
  ink: "#0a0a0a",
  inkSecondary: "#737373",
  inkMuted: "#a3a3a3",
  surface: "#f7f7f5",
  accent: "#30ffab",
  accentDeep: "#229980",
  border: "#eaeaea",
  borderStrong: "#d4d4d4",
  white: "#ffffff",
  red: "#dc2626",
  orange: "#d97706",
  green: "#229980",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "PP Neue Montreal",
    fontSize: 8,
    color: c.ink,
    backgroundColor: c.white,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoMark: {
    width: 12,
    height: 12,
    backgroundColor: c.accent,
    borderRadius: 2,
    marginRight: 6,
  },
  logoText: {
    fontSize: 10,
    fontWeight: 600,
    color: c.ink,
    letterSpacing: -0.3,
  },
  confBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  confText: {
    fontSize: 7,
    fontWeight: 600,
    color: c.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  label: {
    fontSize: 7,
    fontWeight: 500,
    color: c.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: c.ink,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 10,
    color: c.inkSecondary,
    marginBottom: 4,
  },
  meta: {
    fontSize: 7,
    color: c.inkMuted,
    marginBottom: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginVertical: 14,
  },
  accentBar: {
    width: 24,
    height: 2,
    backgroundColor: c.accent,
    borderRadius: 1,
    marginBottom: 8,
  },
  phaseName: {
    fontSize: 11,
    fontWeight: 600,
    color: c.ink,
    marginBottom: 6,
  },
  phaseBlock: {
    marginBottom: 18,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.borderStrong,
    paddingBottom: 4,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 4,
  },
  tableFooter: {
    flexDirection: "row",
    backgroundColor: c.surface,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  colName: { width: 130 },
  colRole: { width: 55, textAlign: "right" },
  colTotal: { width: 50, textAlign: "right" },
  colCost: { width: 65, textAlign: "right" },
  colNotes: { flex: 1, paddingLeft: 6 },
  thText: { fontSize: 6, fontWeight: 500, color: c.inkMuted, textTransform: "uppercase", letterSpacing: 0.3 },
  cellText: { fontSize: 8, color: c.ink },
  cellMuted: { fontSize: 8, color: c.inkSecondary },
  cellBold: { fontSize: 8, fontWeight: 600, color: c.ink },
  cellNotes: { fontSize: 7, color: c.inkMuted, fontStyle: "italic" },
  // Summary box
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 4,
    padding: 12,
  },
  summaryLabel: { fontSize: 7, color: c.inkSecondary, marginBottom: 3 },
  summaryValue: { fontSize: 16, fontWeight: 600, color: c.ink, letterSpacing: -0.3 },
  marginGreen: { color: c.green },
  marginOrange: { color: c.orange },
  marginRed: { color: c.red },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 6, color: c.inkMuted },
});

type Props = {
  clientName: string;
  projectName: string;
  date: string;
  versionName: string | null;
  phases: ScopePhase[];
  roles: Role[];
  overheadPerDay: number;
};

function fmtCurrency(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function abbreviate(title: string): string {
  const map: Record<string, string> = {
    "Founder/Technical Director": "Founder",
    "Senior Developer": "Sr Dev",
    "Project Manager": "PM",
    "Senior Designer": "Sr Design",
    "Mid-Level Designer": "Mid Design",
    "Account Manager": "AM",
    "Mid-Level Developer": "Mid Dev",
  };
  return map[title] ?? title.split(" ")[0];
}

export function InternalBudgetPDF({
  clientName,
  projectName,
  date,
  versionName,
  phases,
  roles,
  overheadPerDay,
}: Props) {
  // Pick top 4 roles that have any allocations to fit the page
  const usedRoleIds = new Set<string>();
  for (const p of phases) {
    for (const d of p.deliverables) {
      for (const [rid, days] of Object.entries(d.role_allocations)) {
        if (days > 0) usedRoleIds.add(rid);
      }
    }
  }
  const displayRoles = roles.filter((r) => usedRoleIds.has(r.id));

  function calcHours(d: ScopeDeliverable): number {
    return Object.values(d.role_allocations).reduce((s, v) => s + (v || 0) * 8, 0);
  }

  function calcCost(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((s, [rid, days]) => {
      const r = roles.find((x) => x.id === rid);
      if (!r || !days) return s;
      return s + days * calculateTotalCostPerDay(Number(r.base_cost_day), overheadPerDay);
    }, 0);
  }

  function calcInv(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((s, [rid, days]) => {
      const r = roles.find((x) => x.id === rid);
      if (!r || !days) return s;
      return s + days * calculateClientDayRate(Number(r.base_cost_day), overheadPerDay, Number(r.markup_pct));
    }, 0);
  }

  let totalHours = 0, totalCost = 0, totalInv = 0;
  for (const p of phases) {
    for (const d of p.deliverables) {
      totalHours += calcHours(d);
      totalCost += calcCost(d);
      totalInv += calcInv(d);
    }
  }
  const profit = calculateGrossProfit(totalInv, totalCost);
  const margin = calculateProfitMargin(profit, totalInv);

  const marginStyle = margin > 30 ? s.marginGreen : margin >= 15 ? s.marginOrange : s.marginRed;

  const nonEmpty = phases.filter((p) => p.deliverables.length > 0);

  return (
    <Document>
      <Page size="A4" style={s.page} orientation="landscape">
        {/* Top bar */}
        <View style={s.topBar}>
          <View style={s.logoRow}>
            <View style={s.logoMark} />
            <Text style={s.logoText}>Shrink Studio</Text>
          </View>
          <View style={s.confBadge}>
            <Text style={s.confText}>Confidential — Internal Use Only</Text>
          </View>
        </View>

        {/* Header */}
        <Text style={s.label}>Internal Project Budget</Text>
        <Text style={s.title}>{projectName}</Text>
        <Text style={s.subtitle}>{clientName}</Text>
        <Text style={s.meta}>
          {date}{versionName ? `  ·  ${versionName}` : ""}
        </Text>

        {/* Summary */}
        <View style={s.summaryGrid}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Total Internal Cost</Text>
            <Text style={s.summaryValue}>{fmtCurrency(totalCost)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Client Investment</Text>
            <Text style={s.summaryValue}>{fmtCurrency(totalInv)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Gross Profit</Text>
            <Text style={s.summaryValue}>{fmtCurrency(profit)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Profit Margin</Text>
            <Text style={[s.summaryValue, marginStyle]}>{margin.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Budget phases */}
        {nonEmpty.map((phase) => {
          let phaseHours = 0, phaseCost = 0;
          for (const d of phase.deliverables) {
            phaseHours += calcHours(d);
            phaseCost += calcCost(d);
          }

          return (
            <View key={phase.id} style={s.phaseBlock} wrap={false}>
              <View style={s.accentBar} />
              <Text style={s.phaseName}>{phase.name}</Text>

              {/* Table header */}
              <View style={s.tableHeader}>
                <View style={s.colName}><Text style={s.thText}>Deliverable</Text></View>
                {displayRoles.map((r) => (
                  <View key={r.id} style={s.colRole}>
                    <Text style={s.thText}>{abbreviate(r.title)} hrs</Text>
                  </View>
                ))}
                <View style={s.colTotal}><Text style={s.thText}>Hours</Text></View>
                <View style={s.colCost}><Text style={s.thText}>Cost</Text></View>
                <View style={s.colNotes}><Text style={s.thText}>Notes</Text></View>
              </View>

              {/* Rows */}
              {phase.deliverables.map((d) => (
                <View key={d.id} style={s.tableRow}>
                  <View style={s.colName}><Text style={s.cellText}>{d.name}</Text></View>
                  {displayRoles.map((r) => {
                    const hrs = (d.role_allocations[r.id] || 0) * 8;
                    return (
                      <View key={r.id} style={s.colRole}>
                        <Text style={s.cellMuted}>{hrs > 0 ? hrs : ""}</Text>
                      </View>
                    );
                  })}
                  <View style={s.colTotal}>
                    <Text style={s.cellText}>{calcHours(d) > 0 ? calcHours(d) : ""}</Text>
                  </View>
                  <View style={s.colCost}>
                    <Text style={s.cellText}>{calcCost(d) > 0 ? fmtCurrency(calcCost(d)) : ""}</Text>
                  </View>
                  <View style={s.colNotes}>
                    <Text style={s.cellNotes}>{d.internal_notes || ""}</Text>
                  </View>
                </View>
              ))}

              {/* Subtotal */}
              <View style={s.tableFooter}>
                <View style={s.colName}><Text style={s.cellBold}>{phase.name} Total</Text></View>
                {displayRoles.map((r) => {
                  let roleHrs = 0;
                  for (const d of phase.deliverables) roleHrs += (d.role_allocations[r.id] || 0) * 8;
                  return (
                    <View key={r.id} style={s.colRole}>
                      <Text style={s.cellBold}>{roleHrs > 0 ? roleHrs : ""}</Text>
                    </View>
                  );
                })}
                <View style={s.colTotal}><Text style={s.cellBold}>{phaseHours}</Text></View>
                <View style={s.colCost}><Text style={s.cellBold}>{fmtCurrency(phaseCost)}</Text></View>
                <View style={s.colNotes}><Text style={s.cellText}></Text></View>
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Internal use only — Shrink Studio</Text>
          <Text style={s.footerText}>{date}</Text>
        </View>
        <Text
          style={{ position: "absolute", bottom: 25, left: 0, right: 0, textAlign: "center", fontSize: 6, color: c.inkMuted }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
