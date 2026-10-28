# Figget rules v2: audit follow-up

Implemented after the 2026-10-28 economy audit. The accompanying
[benchmark data](figget-v2-benchmark.json) records the exact model source hash.
These outcomes use an idle human in sanctuary and fixed populations on the same
spatial map; seeds vary bot decisions and starting jitter. They are not live FPS
measurements or proof of optimal policies against a human.

## Addressed

- Full packs have storage, withdrawal and intentional disposal actions. Bots
  reserve useful supplies, mask infeasible choices and manage excess stock.
- Depot repair is independent of food supply. Full stores can be repaired, and
  expiry time/material holdings are visible. Public stores hold all materials.
- Descendants get new IDs, with actual transfers from funded parents. Historical
  buildings retain their builders and lineages; no reused-slot ownership occurs.
- Useful reserves and health replace unbounded activity payouts. Food provenance
  follows withdrawals and transport; public benefit is credited when food is
  actually eaten. Bot observations include pack and material constraints.
- Ordinary food use requires 25 missing health, with a ten-health emergency rule.
  Controls expose resource pressure independently of explicit bot population.
- Performance adaptation affects drawing frequency without deleting agents or
  changing economic conditions. Resource budgets scale with chosen population.
- Human attacks and bot decisions have a one-second cadence. One ore loads three
  shots. Protection-aware selection handles overlapping actors. Death loses all
  remaining ore/ammunition, removing positive-return suicide mining for ore.
- Learning and evolutionary selection have separate switches for fair controls.
  Turn priority rotates, and individual and cumulative outcome counters are separate.
- Rule-v1 saves migrate positions, inventories, buildings and learned preferences
  into a new save key. The original record remains untouched. Compiled-browser
  regression tests cover this path and the full-depot/inventory controls.

## Nine thirty-minute worlds

For each of 64, 128 and 512 bots, seeds 7, 42 and 99 were run with learning and
selection enabled. Across all nine:

- All final model states validated.
- Every food/timber/ore ledger discrepancy was exactly zero.
- No bot ended timber-locked with 30 wood and no food or ore.
- No meal restored under five health.

| Bots | Mean healing per food, range across seeds | Useful shared meals, range |
|---|---:|---:|
| 64 | 27.79–27.93 / 30 | 460–475 |
| 128 | 27.66–27.93 / 30 | 1,043–1,244 |
| 512 | 26.80–27.12 / 30 | 4,540–5,537 |

The original seed-42 audit measured mean healing of 4.08 at 128 bots and 7.76 at
512 bots. This comparison reflects changed rules and policies together; it does
not isolate learning as the sole cause.

## Matched controls

Evolution was disabled in six additional 128-bot, thirty-minute runs. Each seed
was run with learning on and off, keeping initial resources, starting policies,
terrain and population matched. The fixed control retains the starting policy
and exploration rather than updating Q values.

| Seed | Shared meals, learning / fixed | Deaths, learning / fixed |
|---|---:|---:|
| 7 | 1,080 / 521 | 117 / 222 |
| 42 | 1,058 / 632 | 127 / 248 |
| 99 | 847 / 615 | 111 / 238 |

Learning produced more shared meals and fewer deaths in these samples. Final
mean health was not uniformly higher; these metrics describe different aspects
of survival and cooperation. This is encouraging local evidence, not a universal
claim about strategic strength.

## Remaining limits

This remains a gathering, storage and combat economy. There are no prices,
contracts, production chains or capture-based territorial returns. Same-lineage
non-aggression is a prescribed rule. Regional growth scales with population,
but physical crowding and access still vary, so difficulty is not identical at
every population. Evolution can favour certain regions and can erase lineages.
Those effects should be judged through play rather than hidden behind Q counts.
