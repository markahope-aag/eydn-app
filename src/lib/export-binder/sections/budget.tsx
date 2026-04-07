import React from "react";
import type { Styles } from "../styles";
import { rowStyle, money } from "../styles";
import type { Wedding, Expense, BudgetCategory } from "../types";
import { SectionHeader, Footer } from "./shared";

type BudgetProps = {
  wedding: Wedding;
  expenseList: Expense[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function buildBudgetCategories(expenseList: Expense[]): Map<string, BudgetCategory> {
  const categories = new Map<string, BudgetCategory>();
  for (const e of expenseList) {
    const cat = e.category || "Uncategorized";
    const existing = categories.get(cat) || { estimated: 0, paid: 0 };
    existing.estimated += e.estimated || 0;
    existing.paid += e.amount_paid || 0;
    categories.set(cat, existing);
  }
  return categories;
}

export function BudgetPage({ wedding, expenseList, s, PdfPage, Text, View }: BudgetProps) {
  const budgetCategories = buildBudgetCategories(expenseList);

  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Budget Summary" s={s} Text={Text} View={View} />
        {expenseList.length === 0 ? (
          <Text style={s.mutedText}>No expenses tracked yet.</Text>
        ) : (
          <>
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Category</Text>
                <Text style={[s.tableHeaderCell, { width: 100, textAlign: "right" as const }]}>Estimated</Text>
                <Text style={[s.tableHeaderCell, { width: 100, textAlign: "right" as const }]}>Paid</Text>
                <Text style={[s.tableHeaderCell, { width: 100, textAlign: "right" as const }]}>Remaining</Text>
              </View>
              {Array.from(budgetCategories.entries()).map(([cat, vals], i) => (
                <View key={i} style={rowStyle(s, i)} wrap={false}>
                  <Text style={[s.tableCellBold, { flex: 1 }]}>{cat}</Text>
                  <Text style={[s.tableCell, { width: 100, textAlign: "right" as const }]}>
                    {money(vals.estimated)}
                  </Text>
                  <Text style={[s.tableCell, { width: 100, textAlign: "right" as const }]}>
                    {money(vals.paid)}
                  </Text>
                  <Text style={[s.tableCell, { width: 100, textAlign: "right" as const }]}>
                    {money(vals.estimated - vals.paid)}
                  </Text>
                </View>
              ))}
              {/* Grand total row */}
              <View style={s.totalRow}>
                <Text style={[s.totalCell, { flex: 1 }]}>TOTAL</Text>
                <Text style={[s.totalCell, { width: 100, textAlign: "right" as const }]}>
                  {money(Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0))}
                </Text>
                <Text style={[s.totalCell, { width: 100, textAlign: "right" as const }]}>
                  {money(Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.paid, 0))}
                </Text>
                <Text style={[s.totalCell, { width: 100, textAlign: "right" as const }]}>
                  {money(
                    Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0) -
                    Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.paid, 0)
                  )}
                </Text>
              </View>
            </View>

            {wedding.budget && (
              <View style={{ marginTop: 12 }}>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Total Budget:</Text>
                  <Text style={s.infoValue}>{money(wedding.budget)}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Total Estimated:</Text>
                  <Text style={s.infoValue}>
                    {money(Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0))}
                  </Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Budget Left:</Text>
                  <Text style={s.infoValue}>
                    {money(wedding.budget - Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0))}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
