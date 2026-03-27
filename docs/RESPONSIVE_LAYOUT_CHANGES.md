# Responsive Layout Changes

All changes use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) so they only affect mobile viewports. Desktop layout is unchanged.

## Global / Shared

| File | Change |
|------|--------|
| `src/app/dashboard/layout.tsx` | Main content padding: `p-8` → `p-4 sm:p-6 md:p-8` |
| `src/components/GlobalHeader.tsx` | Added `pl-16 md:pl-6` so hamburger menu doesn't overlap logo on mobile |

## Dashboard Overview

**File**: `src/app/dashboard/page.tsx`

- Upcoming task cards: changed from single-row flex to two-row layout — title on top, badge + date on second line
- Task title gets `truncate` to prevent overflow

## Tasks

| File | Change |
|------|--------|
| `page.tsx` | Header: `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center justify-between gap-3` |
| `page.tsx` | View toggle buttons: added `flex-wrap` |
| `page.tsx` | Add-task modal form grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `TaskList.tsx` | Drag handles: `hidden sm:block` (hidden on mobile) |
| `TaskList.tsx` | Task items: split into two rows — top row (priority + status + title), bottom row (category + guide + date + delete) with `flex-wrap` |
| `TaskList.tsx` | Title gets `truncate` class |
| `TaskFilters.tsx` | Filters collapse behind a "Filter" button by default; badge shows active count |

## Vendors

| File | Change |
|------|--------|
| `page.tsx` | Header: `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center justify-between gap-3` |
| `page.tsx` | Vendor cards: split into two rows — top (photo + name + status), bottom (price + email + details + delete) with `flex-wrap` |
| `page.tsx` | Photo avatars: `w-10 h-10 sm:w-12 sm:h-12` |
| `[id]/page.tsx` | Status pipeline: added `flex-wrap sm:flex-nowrap`, smaller text `text-[11px] sm:text-[12px]` |
| `directory/page.tsx` | Search + filter row: `flex gap-3` → `flex flex-col sm:flex-row gap-3` |
| `directory/page.tsx` | Filter selects: `grid grid-cols-2 sm:flex sm:flex-wrap` with `w-full sm:w-auto` |

## Budget

**File**: `src/app/dashboard/budget/page.tsx`

- Add expense form: `flex gap-3` → `flex flex-col sm:flex-row gap-3`
- Table headers: `hidden sm:grid` (hidden on mobile)
- Expense rows: `grid grid-cols-[...]` → `flex flex-col sm:grid sm:grid-cols-[...]`

## Guests

**File**: `src/app/dashboard/guests/page.tsx`

- Header: added responsive stacking `flex flex-col sm:flex-row`

## Seating

**File**: `src/app/dashboard/seating/page.tsx`

- Header: added responsive stacking
- Ceremony altar section: `px-8 pt-8 pb-6` → `px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6`
- Altar box: `min-w-[280px]` → `min-w-0 sm:min-w-[280px] w-full sm:w-auto`, padding `px-4 sm:px-10`
- Aisle section: `px-8 py-6` → `px-4 sm:px-8 py-4 sm:py-6`

## Day-Of Planner

**File**: `src/app/dashboard/day-of/page.tsx`

- Header: added responsive stacking
- Card padding: `p-8` → `p-4 sm:p-6 md:p-8`

## Page Headers — Responsive Stacking

All changed from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center justify-between gap-3`:

- `src/app/dashboard/mood-board/page.tsx`
- `src/app/dashboard/website/page.tsx`
- `src/app/dashboard/wedding-party/page.tsx`
- `src/app/dashboard/rehearsal-dinner/page.tsx`

## Mood Board

**File**: `src/app/dashboard/mood-board/page.tsx`

- Placeholder grid: `grid-cols-3` → `grid-cols-2 sm:grid-cols-3`

## Rehearsal Dinner

**File**: `src/app/dashboard/rehearsal-dinner/page.tsx`

- Time input: `w-[130px]` → `w-full sm:w-[130px]`

## Pricing

**File**: `src/app/dashboard/pricing/page.tsx`

- Card padding: `p-8` → `p-4 sm:p-6 md:p-8`

## Vendor Portal

**File**: `src/app/dashboard/vendor-portal/page.tsx`

- Two form grids: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- Stat text: `text-3xl` → `text-2xl sm:text-3xl`

## Admin Pages

| File | Change |
|------|--------|
| `admin/vendors/page.tsx` | Import results grid: `grid-cols-2 sm:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `admin/placements/page.tsx` | Two form grids: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |

## Landing Page

**File**: `src/app/page.tsx`

- Logo height: 24px → 30px (accommodates new ring mark logo)
