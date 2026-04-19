// Barrel that lazy-loads recharts primitives via next/dynamic so the ~100 KB
// library stays out of the initial admin bundle. Import from this file
// instead of "recharts" directly on any client-rendered page. SSR is off
// because recharts needs `window` to measure container dimensions.

import dynamic from "next/dynamic";

// Generic helper: `T` is whatever component recharts exports for that name —
// we hand it back unchanged so callers keep the original prop types.
const lazy = <T>(pick: (m: typeof import("recharts")) => T): T =>
  dynamic(() =>
    import("recharts").then((m) => pick(m) as unknown as React.ComponentType<Record<string, unknown>>),
    { ssr: false },
  ) as unknown as T;

export const BarChart = lazy((m) => m.BarChart);
export const Bar = lazy((m) => m.Bar);
export const LineChart = lazy((m) => m.LineChart);
export const Line = lazy((m) => m.Line);
export const PieChart = lazy((m) => m.PieChart);
export const Pie = lazy((m) => m.Pie);
export const Cell = lazy((m) => m.Cell);
export const XAxis = lazy((m) => m.XAxis);
export const YAxis = lazy((m) => m.YAxis);
export const CartesianGrid = lazy((m) => m.CartesianGrid);
export const Tooltip = lazy((m) => m.Tooltip);
export const Legend = lazy((m) => m.Legend);
export const ResponsiveContainer = lazy((m) => m.ResponsiveContainer);
