## Flaresmith Design Polish (Nov 24 2025)

### Summary
This iteration applied dark mode first styling and marketing polish across the web apps.

### Changes Implemented
1. Dark mode default initialization script in `apps/web/app/layout.tsx`.
2. Added `FeatureCard` component and marketing pages `/features` and `/pricing`.
3. Introduced shared glass & gradient utilities in `user-web` and `admin-web` `globals.css`.
4. Upgraded Tailwind configs (`darkMode`, animate plugin, design tokens) for `user-web` & `admin-web`.
5. Refactored dashboards with glass cards + gradient hero sections.
6. Added footer component with product/resources links.
7. Adjusted color variable maps for improved contrast in dark backgrounds.

### Follow Ups
- Evaluate accessibility contrast ratios after palette adjustments.
- Consider extracting shared marketing components into `packages/ui` if reused.
- Reinstate theme toggle after resolving `next-themes` compatibility.

### Verification
Screenshots captured for: main dashboard, user dashboard, admin portal, features, pricing pages.

### Spec Alignment
Design improvements align with spec-first workflow; no schema or contract changes were required.
