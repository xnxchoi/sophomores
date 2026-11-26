# Palette r3: states not exercised

These states are reviewed in the source only. None has a live caller, so none was measured on screen.

| Surface | State | Source figure | Why it was not measured |
| --- | --- | --- | --- |
| `HA_Badge` destructive (`src/components/ui/badge.tsx`) | Dark: Titanium ink on a 70% Deep Cinnabar fill over the dark ground | About 5.06:1 with a solid Deep Cinnabar fill. The 70% fill is untested. | No page renders a destructive `HA_Badge`. |
| `Badge`, `Button` and `Alert` destructive (`src/components/ui/`) | Neutral ink on a red tint, with a Deep Cinnabar border or icon as the mark | Ink is the role foreground on page grounds | No page renders the destructive variant. |
| `TwoFactorCard` code field (`src/components/auth/second-factor.tsx`) | Resting border uses the control rule (Pewter) | 3.54:1 on Titanium, 4.13:1 on Carbon | No caller in production. |
