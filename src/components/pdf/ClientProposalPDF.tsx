import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
} from "@react-pdf/renderer";
import type { ScopePhase, ScopeDeliverable } from "@/lib/types";
import { calculateClientDayRate } from "@/lib/calculations";

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

// Shrink branding: light bg, dark ink, mint accent
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
};

const s = StyleSheet.create({
  page: {
    fontFamily: "PP Neue Montreal",
    fontSize: 9,
    color: c.ink,
    backgroundColor: c.white,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  logoMark: {
    width: 16,
    height: 16,
    backgroundColor: c.accent,
    borderRadius: 3,
    marginRight: 8,
  },
  logoText: {
    fontSize: 13,
    fontWeight: 600,
    color: c.ink,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 8,
    fontWeight: 500,
    color: c.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    color: c.ink,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: c.inkSecondary,
    marginBottom: 6,
  },
  meta: {
    fontSize: 8,
    color: c.inkMuted,
    marginBottom: 24,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginVertical: 20,
  },
  accentBar: {
    width: 30,
    height: 3,
    backgroundColor: c.accent,
    borderRadius: 2,
    marginBottom: 12,
  },
  phaseName: {
    fontSize: 13,
    fontWeight: 600,
    color: c.ink,
    marginBottom: 8,
  },
  phaseBlock: {
    marginBottom: 22,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.borderStrong,
    paddingBottom: 5,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 6,
  },
  tableFooter: {
    flexDirection: "row",
    backgroundColor: c.surface,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  colName: { flex: 1 },
  colDays: { width: 60, textAlign: "right" },
  colInv: { width: 100, textAlign: "right" },
  thText: { fontSize: 7, fontWeight: 500, color: c.inkMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  cellText: { fontSize: 9, color: c.ink },
  cellMuted: { fontSize: 9, color: c.inkSecondary },
  cellBold: { fontSize: 9, fontWeight: 600, color: c.ink },
  summaryBox: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  grandLabel: { fontSize: 9, color: c.inkSecondary, marginBottom: 3 },
  grandValue: { fontSize: 26, fontWeight: 600, color: c.ink, letterSpacing: -0.5 },
  grandDaysLabel: { fontSize: 9, color: c.inkSecondary, marginBottom: 3, textAlign: "right" },
  grandDaysValue: { fontSize: 16, fontWeight: 600, color: c.inkSecondary, textAlign: "right" },
  disclaimer: { fontSize: 7, color: c.inkMuted, marginTop: 6 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: c.inkMuted },
  footerLink: { fontSize: 7, color: c.accentDeep, textDecoration: "none" },
});

type Props = {
  clientName: string;
  projectName: string;
  date: string;
  versionName: string | null;
  phases: ScopePhase[];
  roles: { id: string; base_cost_day: number; markup_pct: number }[];
  overheadPerDay: number;
};

function fmtCurrency(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDays(n: number): string {
  if (!n) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function ClientProposalPDF({
  clientName,
  projectName,
  date,
  versionName,
  phases,
  roles,
  overheadPerDay,
}: Props) {
  function calcDays(d: ScopeDeliverable): number {
    return Object.values(d.role_allocations).reduce((s, v) => s + (v || 0), 0);
  }

  function calcInv(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((s, [rid, days]) => {
      const r = roles.find((x) => x.id === rid);
      if (!r || !days) return s;
      return s + days * calculateClientDayRate(Number(r.base_cost_day), overheadPerDay, Number(r.markup_pct));
    }, 0);
  }

  function phaseTotals(p: ScopePhase) {
    let days = 0, inv = 0;
    for (const d of p.deliverables) { days += calcDays(d); inv += calcInv(d); }
    return { days, inv };
  }

  let grandDays = 0, grandInv = 0;
  for (const p of phases) { const t = phaseTotals(p); grandDays += t.days; grandInv += t.inv; }

  const nonEmpty = phases.filter((p) => p.deliverables.length > 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoMark} />
          <Text style={s.logoText}>Shrink Studio</Text>
        </View>

        {/* Header */}
        <Text style={s.label}>Project Proposal</Text>
        <Text style={s.title}>{projectName}</Text>
        <Text style={s.subtitle}>{clientName}</Text>
        <Text style={s.meta}>
          {date}{versionName ? `  ·  ${versionName}` : ""}
        </Text>

        <View style={s.divider} />

        {/* Scope */}
        <Text style={s.label}>Scope of Work</Text>

        {nonEmpty.map((phase) => {
          const totals = phaseTotals(phase);
          return (
            <View key={phase.id} style={s.phaseBlock} wrap={false}>
              <View style={s.accentBar} />
              <Text style={s.phaseName}>{phase.name}</Text>
              <View style={s.tableHeader}>
                <View style={s.colName}><Text style={s.thText}>Deliverable</Text></View>
                <View style={s.colDays}><Text style={s.thText}>Days</Text></View>
                <View style={s.colInv}><Text style={s.thText}>Investment</Text></View>
              </View>
              {phase.deliverables.map((d) => (
                <View key={d.id} style={s.tableRow}>
                  <View style={s.colName}><Text style={s.cellText}>{d.name}</Text></View>
                  <View style={s.colDays}><Text style={s.cellMuted}>{fmtDays(calcDays(d))}</Text></View>
                  <View style={s.colInv}><Text style={s.cellText}>{fmtCurrency(calcInv(d))}</Text></View>
                </View>
              ))}
              <View style={s.tableFooter}>
                <View style={s.colName}><Text style={s.cellBold}>{phase.name} Subtotal</Text></View>
                <View style={s.colDays}><Text style={s.cellBold}>{fmtDays(totals.days)}</Text></View>
                <View style={s.colInv}><Text style={s.cellBold}>{fmtCurrency(totals.inv)}</Text></View>
              </View>
            </View>
          );
        })}

        <View style={s.divider} />

        {/* Investment Summary */}
        <Text style={s.label}>Investment Summary</Text>
        <View style={s.summaryBox}>
          <View>
            <Text style={s.grandLabel}>Total Investment</Text>
            <Text style={s.grandValue}>{fmtCurrency(grandInv)}</Text>
          </View>
          <View>
            <Text style={s.grandDaysLabel}>Total Days</Text>
            <Text style={s.grandDaysValue}>{fmtDays(grandDays)}</Text>
          </View>
        </View>
        <Text style={s.disclaimer}>
          All prices are in GBP and exclude VAT. This proposal is valid for 30 days from the date above.
        </Text>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Prepared by Shrink Studio · <Link src="https://shrink.studio" style={s.footerLink}>shrink.studio</Link>
          </Text>
          <Text style={s.footerText}>{date}</Text>
        </View>
        <Text
          style={{ position: "absolute", bottom: 30, left: 0, right: 0, textAlign: "center", fontSize: 7, color: c.inkMuted }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
