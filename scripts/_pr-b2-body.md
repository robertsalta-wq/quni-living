## Summary
Batch 2 colour cleanup on top of #125/#126:

- Map high-value remaining hexes + exact rgba tints to tokens
- New tokens: `--quni-coral-soft` (`#FFF8F0`), `--quni-input-border` (`#D8D3C7`) + Tailwind `admin-*` aliases
- Extend `batch1-canonical-hex` lint ban list to cover Batch 2 values
- Refresh `arbitraryHexLegacy.json` (44 files still have marketing/long-tail arbitrary hex)

### Mapped
| Hex | Token |
|---|---|
| `#FF6B6B` | `--quni-coral` (AI UI drift) |
| `#F4F3EC` | `--quni-surface-3` |
| `#F8F6F1` | `--quni-surface-2` |
| `#FEF3C7` | `--quni-warning-bg` |
| `#FEF2F2` | `--quni-danger-bg` |
| `#F1EEEA` | `--quni-lifecycle-deferred-bg` |
| `#0D5C4A` | `--quni-success-strong` |
| `#FFF8F0` / `#FFF5F4` / `#FFF5F5` | `--quni-coral-soft` |
| `#D8D3C7` | `--quni-input-border` |
| exact `rgba(255,111,97,0.08/0.15/0.25)` + navy tint `0.08` | tint tokens |

### Deferred (Batch 2b / later)
Marketing one-offs, social brand logos, FT6600 `#D85A30`, Landlord AI dark theme, chart palettes, trust-green `#376256`, etc.

## Test plan
- [x] `npm run lint:app-chrome`
- [x] `npm run lint:opacity`
- [x] vitest appChromeLintGuard
- [x] `npx tsc -b --noEmit`

Stacked on `tokens/ban-batch1-hex` (#126).
