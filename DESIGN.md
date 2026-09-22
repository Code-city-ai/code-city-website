---
name: "Code City — Sign-in"
description: "Route-scoped visual system for /sign-in; not authority for public marketing or other admin screens."
colors:
  entrance-bg: "#080b0f"
  ivory: "#edf0ed"
  muted: "#a2aab2"
  input-line: "#626b74"
  input-line-hover: "#89959f"
  input-bg: "#0e1319"
  input-bg-focus: "#121a22"
  input-line-focus: "#a5b7c6"
  focus-ring: "#d5e1e9"
  placeholder: "#939da7"
  label: "#d3d8dc"
  button-ink: "#10171d"
  button-hover: "#fff"
  headline-secondary: "#a3adb6"
  project-label: "#cbd1d5"
  reset-label: "#c4cbd1"
  help-emphasis: "#cdd4d9"
  divider: "#242c34"
  footer-divider: "#22292f"
  footer-label: "#959fa7"
  selection: "#b7c4cd"
  scrollbar: "#58636d"
  caret: "#f8a087"
  error-bg: "#241b18"
  error-line: "#775347"
  error-text: "#ffd0bc"
  success-bg: "#15211c"
  success-line: "#425d51"
  success-text: "#bfdccd"
  brand-orange: "#f55029"
  brand-blue: "#147dc0"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(32px, 3vw, 44px)"
    fontWeight: 500
    lineHeight: 1.19
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    lineHeight: 1.8
  world-body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    lineHeight: 1.8
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  action:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  helper:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    lineHeight: 1.85
  footer:
    fontFamily: "Manrope, sans-serif"
    fontSize: "10px"
    letterSpacing: ".02em"
rounded:
  control: "8px"
  icon-button: "4px"
spacing:
  field-gap: "10px"
  form-gap: "24px"
  input-inline: "16px"
  button-inline: "20px"
  form-top: "42px"
  mobile-form-top: "32px"
  page-inline: "clamp(24px, 5.6vw, 88px)"
components:
  button-primary:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.button-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  button-reset:
    backgroundColor: "transparent"
    textColor: "{colors.reset-label}"
    padding: "5px 0"
  button-password:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.icon-button}"
    height: "44px"
    width: "44px"
  input:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "54px"
  input-focus:
    backgroundColor: "{colors.input-bg-focus}"
  return-link:
    textColor: "{colors.muted}"
  feedback-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-text}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  feedback-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
---

# Design System: Code City — Sign-in

## Overview

**Creative North Star: "The Sculptural Entrance"**

This system governs only the implemented /sign-in route: src/admin/pages/Login.jsx and src/admin/signin.css. Public marketing, password-update pages, project selection, fixed-code entry, and all other admin surfaces retain their existing design authority. A root-level document is not permission to spread this visual replacement across the website.

The entrance pairs near-black ink, soft ivory, silver material edges, and restrained Manrope typography. Space and clear controls carry the task; a nested architectural frame supplies the futuristic character. Existing Code City branding and authentic project icons preserve identity. These are visual decisions, not evidence of authentication, email delivery, authorization, or cloud runtime readiness.

**Key Characteristics:**

- Near-black canvas with ivory action emphasis.
- Lightly rounded rectangular controls with visible boundaries.
- One code-native metallic sculpture and authentic existing identity assets.
- Quiet state transitions with reduced-motion support.

## Colors

A cool neutral palette keeps the form quiet while ivory makes the primary action unmistakable. Frontmatter values are normative; names below explain their roles.

### Primary

- **Ivory:** heading ink and the primary button surface; button-ink reverses the text within it.
- **Code City orange and blue:** the existing Brand mark only. The orange caret is its own observed token.

### Neutral

- **Entrance background:** the full route canvas; input-bg provides a slight tonal step for fields.
- **Muted and label:** distinguish explanation from persistent field labels without relying on placeholder text.
- **Input line / hover / focus:** visible field boundaries in each state. The reviewed resting boundary is input-line and hover uses input-line-hover; do not revert to the earlier faint edge.
- **Focus ring:** a separate keyboard outline, shared by links, buttons, and inputs.
- **Dividers:** structural lines under the access note and above the footer, distinct from interactive field edges.
- **Error and success families:** warm error and green success feedback, each with its own text, border, and fill.

The inline sculpture owns its metal, edge, and inner gradients locally in Login.jsx. These illustration stops are not general-purpose UI colors or another theme.

## Typography

**Display and body font:** Manrope, with sans-serif fallback. The variable font is self-hosted from public/fonts/manrope-latin.woff2, with a declared weight range of 400–700 and font-display: swap. Provenance is recorded in public/fonts/README.md; the SIL Open Font License is public/fonts/Manrope-OFL.txt. The font was retrieved from Google Fonts on 2026-09-22; no runtime third-party font request is needed.

The display and form heading use medium weight with tight tracking; small, calm labels preserve the account workflow's priority. The desktop display uses the display token and the form heading uses headline. Body supports the form description; world-body supports the artwork caption, limited to 37ch. Label, action, helper, and footer cover controls, instructions, and the small closing rail. The brand is reused at 12px, weight 700, and .16em tracking on this route.

Responsive type stays local: the world heading is 32px at widths up to 1050px; at 760px it becomes 21px with 1.3 line height and -.025em tracking. At 370px it is 19px. The form heading becomes 40px at 760px. Do not make these artwork-specific responsive sizes a global heading scale.

## Layout

The route is a full-height flex canvas (100svh). Header and footer cap at 1360px; the main grid caps at 1240px. Desktop columns use 1.12fr / 1fr with a fluid gap from 64px to 144px. The form caps at 380px; its containing panel uses 50px vertical padding. The header is at least 112px high and the footer at least 76px. Forms use the field-gap, form-gap, and form-top tokens.

At 1050px and below, the columns become equal with a 48px gap and a 320px sculpture. At 760px and below, the form is the first grid row, the form width caps at 420px, page gutters are 24px, and the header is 92px high. The artwork becomes a compact second-row composition: 104px / 1fr, 16px gap, a 144px by 160px sculpture, and smaller project signatures. Its caption is hidden. Footer content stacks. At 370px and below, gutters become 20px and the artwork column tightens to 84px. At 1600px and above, the desktop sculpture grows from 390px to 450px high.

These are implementation-specific composition rules for this entrance. They do not define the public website or dashboard grid.

## Elevation & Depth

Controls and containers are flat. There are no ambient card shadows or blurred glass panels. Depth comes from the inline SVG's nested arches, metal gradients, and subtle opacity changes. The input autofill inset shadow is a color correction, not an elevation token.

The sculpture arrives once over 1400ms using cubic-bezier(.16, 1, .3, 1), moving from 18px below and opacity .6 to its resting state. Control transitions last 180ms with ease. Primary-button hover lifts 2px and active returns it to baseline. The shared brand retains its existing brief rise animation. Under prefers-reduced-motion: reduce, all animation and transitions inside .signin-page are removed.

## Shapes

Inputs, primary buttons, and feedback use the control radius; the password toggle uses the smaller icon-button radius. Fields are 54px high; the primary button has a 56px minimum height. The password toggle is 44px square. The return link and reset button maintain a 44px minimum interaction height. The arched geometry belongs to the illustration; it does not turn controls into pills.

## Components

### Primary action

An ivory rectangle with dark text and an inline arrow. It uses button-primary tokens; hover switches to button-hover and lifts 2px, while active returns to baseline. A disabled button uses .55 opacity and a not-allowed cursor. Loading changes the label to “Authenticating” and shows the existing spinner. A missing auth configuration disables submission.

### Fields and password visibility

Email and password retain visible labels and native autocomplete. Fields use input-line at rest, input-line-hover on hover, and input-line-focus with input-bg-focus on focus. Keyboard focus adds a 2px focus-ring outline offset by 5px. Placeholder and caret colors are separately defined. Password text reserves 52px at the right for the 44px reveal toggle. The toggle's accessible label changes between “Show password” and “Hide password.”

### Reset and navigation

The existing home-linked Brand and “Back to Code City” are the header navigation; this route has no new menu or tabs. The return link gains ivory text on hover. “Set or reset password” is an inline action under the fields with a 44px minimum height, underlining on hover. It uses the email already entered and remains the single setup/reset path on this page.

### Feedback and access note

Errors use role=alert, success messages use role=status, and text wraps anywhere to avoid overflow. Existing error descriptions remain associated with the inputs. The access note is a small lock icon and two lines separated from setup help by a top divider; it explains separate project codes without introducing a second sign-in form. No card or chip primitive exists on this surface.

### Sculpture and project signatures

The decorative SVG in Login.jsx is code-native, aria-hidden, and non-focusable. It is not a raster asset. Project signatures reuse public/brands/orc-app.png and public/brands/trade-city-app.png at 36px on desktop and 28px on mobile, paired with visible project names. Empty image alt text avoids repeating those adjacent labels. No new raster was produced for this redesign. Treat these existing files as the canonical project identity assets; retain their existing source provenance and do not invent licensing or creation claims. UI glyphs reuse lucide-react; the Brand component remains canonical.

## Do's and Don'ts

### Do:

- Do keep this system scoped to /sign-in and its .signin-page descendants.
- Do reuse the existing Brand component and canonical ORC and Trade City icons.
- Do preserve visible labels, focus indication, password visibility, reset access, loading, and feedback states.
- Do preserve the account-to-project-to-fixed-code workflow and its existing auth implementation.

### Don't:

- Don't restyle public marketing or other admin screens from this document.
- Don't add duplicate sign-in, project-selection, or password-reset surfaces.
- Don't replace the canonical project icons with generated approximations.
- Don't treat visual completion or success copy as proof of email delivery, auth readiness, or deployed workspaces.
