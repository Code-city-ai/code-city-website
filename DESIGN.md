---
name: Code City private project workspace
description: Existing administrator portal extended with Trade City reporting.
colors:
  portal-bg: "#080b11"
  portal-panel: "#0f141d"
  portal-text: "#f4f0e8"
  portal-muted: "#929cab"
  portal-line: "#28303c"
  portal-orange: "#f55029"
  project-accent: "#f4b35e"
  project-accent-hover: "#ffc87f"
  project-ink: "#211b13"
  portfolio-paper: "#e9dfcc"
  portfolio-ink: "#25251f"
typography:
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  workspace-heading:
    fontSize: "clamp(34px,3.6vw,52px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-.035em"
  panel-title:
    fontSize: "16px"
    fontWeight: 500
  financial-value:
    fontSize: "clamp(28px,3vw,40px)"
    fontWeight: 500
    letterSpacing: "-.03em"
rounded:
  control: "7px"
  navigation: "9px"
  report-panel: "12px"
  entrance: "14px"
spacing:
  compact: "12px"
  narrow-grid: "18px"
  grid: "24px"
  report-padding: "26px"
components:
  button-primary:
    backgroundColor: "{colors.project-accent}"
    textColor: "{colors.project-ink}"
    rounded: "{rounded.control}"
    padding: "15px 20px"
  button-primary-hover:
    backgroundColor: "{colors.project-accent-hover}"
  portfolio-panel:
    backgroundColor: "{colors.portfolio-paper}"
    textColor: "{colors.portfolio-ink}"
    rounded: "{rounded.report-panel}"
    padding: "26px"
---

# Design System: Code City private project workspace

## Overview

The private project workspace extends the existing Code City administrator portal: navy surfaces, warm white text, fine boundaries and persistent navigation. Trade City adds amber actions and chart ink, with a pale portfolio panel that establishes hierarchy without introducing a second application shell.

This is a scan of an established visual system and its implemented extension, not a new brand identity. Scope is the private administrator and project workspace; the public website remains a separate existing surface. The portfolio-led direction is a session implementation assumption recorded in `.impeccable/workspace-direction.md`, not a confirmed permanent owner aesthetic preference. No creative metaphor has been approved.

Source authority: `src/admin/admin.css` owns inherited portal tokens; `src/admin/projects/projects.css` owns the scoped amber token and extension styles. `AdminShell.jsx` owns navigation, and `src/admin/projects/` owns the project entrance, access form and reporting surface. These extracted tokens document those sources; they do not introduce a second runtime theme.

**Key Characteristics:**
- Inherited Code City navigation and Inter typography.
- Restrained amber actions against dark reporting surfaces.
- Tabular financial values and explicit unavailable states.
- Geometric DOM and SVG graphics with the existing Trade City logo.

## Colors

The private portal uses near-black navy and warm text. Code City's orange active-navigation rail remains intact; amber is the project action and chart accent. The pale portfolio surface creates a localized contrast with dark reporting panels. Muted text supports labels and secondary explanations; coral negative values and green reporting status supplement explicit text rather than replacing it.

**The Inherited Shell Rule.** Preserve the portal's existing navigation identity while applying project accents within the project surface.

## Typography

Inter and its existing system fallbacks serve the entire workspace. Workspace headings use medium weight and tight tracking; compact panel titles and small supporting labels keep reports dense. Financial values use tabular numerals. There is no new display font or font dependency. The Trade City heading, panel title and financial-value roles above are extracted from the extension; they do not replace every administrator heading.

## Layout

The existing desktop shell reserves 248px for navigation, or 82px when collapsed. At 980px and below it becomes a 260px off-canvas navigation drawer. Portal content uses its existing maximum width of 1600px and desktop padding of 32px 34px 54px.

Trade City pairs a flexible report column with a 280px side column and 24px gap. At 1200px the side column narrows to 245px and gaps to 18px. At 760px the report becomes one column while the portfolio and Nova panels sit side by side; at 460px those panels stack. Positions span the available width and scroll horizontally within their table container. Above 1600px the project surfaces cap at 1440px. Project selection and access use paired columns, stacking at 760px.

## Elevation & Depth

Reporting panels rely on tonal surfaces and thin borders rather than floating shadows. The inherited active navigation uses an inset orange rail. The existing mobile navigation drawer uses a structural shadow (`22px 0 60px rgba(0, 0, 0, 0.45)`). Do not mistake these private-workspace rules for a ban on the public site's existing decorative depth.

## Shapes

Controls use modest rounded corners; report panels use the report-panel radius, and paired entrance surfaces use the entrance radius. Runtime states use a pill outline. The chart is geometric SVG; project artwork uses CSS blocks and typography. The existing `/brands/trade-city.png` is reused. No new raster assets were created for this extension.

## Components

- **Navigation:** retain the shared portal sidebar, active rail, collapse behavior and mobile drawer. Project navigation extends it.
- **Access form:** visible labels, password fields, amber primary action, explicit error message and pending state. The administrator sign-in and owner-code gate remain distinct sequential steps.
- **Primary action:** warm amber with dark text, lighter hover fill and reduced opacity while disabled. Project controls use a 2px amber focus outline offset by 4px.
- **Report panel:** restrained bordered container with period buttons, large realized P&L, chart and supporting metrics. Selected periods use amber text against a darker amber tint and `aria-pressed`.
- **Chart:** a thin amber line plots recorded closes in record order, not uniform elapsed time. Pointer inspection and a labelled native range control share the readout. The range exposes the selected date and cumulative value through `aria-valuetext`; fewer than two valid points yields an explanation instead of an invented curve.
- **Portfolio panel:** pale background, dark tabular values and divided definition rows. Negative values retain contrast appropriate to the pale surface.
- **Nova state:** textual Reporting, Not reporting or Unverified status. This is backend-reported runtime visibility, with no order action.
- **Positions:** scoped column and row headings, symbol filter, right-aligned numeric cells and distinct absent-data, empty-account and no-match messages.

Motion stays brief: existing navigation transitions use 160–180ms; the project link arrow shifts over 180ms. Reduced-motion rules suppress the extension's arrow transition and loading rotations.

## Do's and Don'ts

- Do extend the existing portal shell and project routes.
- Do retain keyboard focus, labelled controls and textual chart readouts.
- Do distinguish unavailable, partial and verified data in the interface.
- Do reuse existing brand assets and keep fixture data clearly labelled.
- Don't duplicate navigation or create another login surface for the same flow.
- Don't replace missing financial values with fabricated zeroes or charts.
- Don't describe runtime visibility as permission to trade.
- Don't apply this private-workspace palette as a redesign mandate for the public site.
