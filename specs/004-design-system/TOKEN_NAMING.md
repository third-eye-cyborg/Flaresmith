# Token Naming Conventions (FR-020)

This document defines mandatory naming rules for all design tokens used in the CloudMake unified cross-platform design system.

## Canonical Pattern

```
<namespace>.<descriptor>.<scale>
```

Where:
- `namespace` ∈ { `primary`, `accent`, `semantic`, `glass`, `elevation`, `spacing`, `radius`, `typography` }
- `descriptor` = kebab-case or dot-delimited semantic grouping (lowercase letters, digits, `-`, `.`)
- `scale` = numeric intensity or step (2–3 digits for colors & elevation, 1–3 digits for spacing/typography when applicable)

RegEx (strict primary form):
```
^(primary|accent|semantic|glass|elevation|spacing|radius|typography)\.[a-z0-9.-]+\.[0-9]{2,3}$
```

### Semantic Exceptions
Certain semantic tokens omit a numeric scale, reflecting categorical meaning instead of graded intensity:
```
semantic.error
semantic.warning
semantic.success
semantic.info
```
Regex for exceptions:
```
^semantic\.(error|warning|success|info)$
```
These must map internally to base color scales (e.g., `primary.red.600`) during generation; consumers never hard-code those underlying specifics.

## Namespaces
| Namespace    | Purpose | Examples |
|--------------|---------|----------|
| primary      | Brand & core palette | `primary.blue.500`, `primary.gray.200` |
| accent       | Secondary emphasis hues | `accent.teal.400` |
| semantic     | State/meaning tokens | `semantic.error`, `semantic.success` |
| glass        | Liquidglass effect parameters | `glass.blur.16`, `glass.opacity.40` |
| elevation    | Shadow depth & layer surfaces | `elevation.surface.100`, `elevation.card.200` |
| spacing      | Layout intervals (converted to rem/em) | `spacing.inline.08`, `spacing.block.16` |
| radius       | Border radii scales | `radius.small.04`, `radius.xl.24` |
| typography   | Font size/line-height tracking | `typography.body.16`, `typography.caption.12` |

## Scaling Rules
- **Color**: Use industry standard steps (50,100,...900) or brand-tuned intermediate values (e.g., 450). Avoid single-digit scales.
- **Elevation**: 1–9 mapped to 3-digit multiples (e.g., `100`, `200`) for API uniformity.
- **Spacing**: Represent tenths of rem in two digits (e.g., `spacing.inline.08` → `0.5rem` if base = 16px). Internal generator performs conversion.
- **Radius**: Use two-digit pixel values without unit; generation layer maps to `rem`.
- **Typography**: Numeric value corresponds to pixel base size; generator maps to modular scale + line-height pairing.

## Reserved Descriptors
Within each namespace certain descriptors are reserved for internal layering and MUST NOT be repurposed:
- `primary.surface.*`, `primary.text.*`
- `glass.blur.*`, `glass.opacity.*`, `glass.saturation.*`
- `elevation.surface.*` (structural levels)
- `spacing.grid.*` (future layout system)
- `typography.scale.*` (internal modular scale definition)

## Forbidden Patterns
| Pattern | Reason | Resolution |
|---------|--------|-----------|
| `primaryButton` | CamelCase; violates dot & kebab segmentation | Use `semantic.button.primary` (then scale) |
| `accentBlue500` | Missing separators | Use `accent.blue.500` |
| `color.primary.blue.500` | Extra `color` prefix | Remove redundant prefix |
| `semantic.danger.500` | Semantic + numeric invalid | Use `semantic.error` or `primary.red.500` if color only |

## Derivation & Mapping
1. Input author defines tokens following naming pattern.
2. Generation script maps tokens → platform artifacts:
   - Tailwind theme extension (CSS variables `--token-name`)
   - NativeWind mapped classes
   - UI primitives access through semantic props (never raw hex).
3. Overrides validate new token names; rejection codes:
   - `DESIGN_TOKEN_NAME_INVALID`
   - `DESIGN_TOKEN_NAME_RESERVED`

## Migration Guidance
When replacing inline literals:
- Convert hex `#0ea5e9` by locating nearest `accent.teal.<scale>` token via color distance.
- Replace spacing `10px` by locating `spacing.inline.10` or nearest defined step.
- For typography `16px`, map to `typography.body.16`.
- Prefer semantic tokens (`semantic.success`) over direct brand color in UI states.

## ESLint Enforcement
`no-inline-styles` flags literals and suggests CSS variable placeholder: `var(--<suggested-token>)`.
`no-reserved-namespaces` ensures new token literal references adhere to regex or semantic exceptions.

Enhancement roadmap:
- Phase 10: Mode-aware naming (`primary.dark.blue.500`) extended via merge utility.
- Future: Contrast-aware auto-suggestion (choose nearest passing AA token).

## Examples
Valid:
```
primary.blue.500
spacing.inline.12
radius.xl.24
typography.caption.12
semantic.success
glass.blur.16
```
Invalid:
```
Primary.Blue.500      # capital letters
primary.blue500       # missing delimiter
primary.blue.five     # non-numeric scale
semantic.success.500  # numeric scale on semantic category
spacing.12            # missing descriptor
```

## Decision Log References
- D-001 Hash normalization
- D-002 Liquidglass capability fallback
- D-003 OKLCH contrast calculation
- D-005 Token merge layering order
- D-009 Circular reference detection

---
Maintainer: Design System Working Group
Version: 1.0.0 (Initial)
Last Updated: 2025-11-23
