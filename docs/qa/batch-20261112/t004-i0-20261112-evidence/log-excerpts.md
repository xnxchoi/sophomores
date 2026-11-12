# Retained log-summary excerpts

Excerpts below are selected from actual checkout-local logs, not re-created command output. Full logs are intentionally not committed. Receipts retain measured result/resource fields only; command lines and path-bearing fields are excluded. Paths outside the checkout are redacted.

## initial-red

Source: `.tmp/t004-i0/red-core.log.137rhgac.log`; raw-log SHA-256 `58ffdf2d7603827e9281327b2309fa7d7b6f24f127b90b5bef0a1034dd2d7b44`.

```text
✖ commerce must not return a known receipt when native COMMIT rejects (1.534541ms)
✖ commerce must not expose a known domain rejection when native ROLLBACK rejects (0.888125ms)
✖ commerce must reject session consumption by inner commitTransaction (0.672375ms)
✖ commerce must reject session consumption by inner rollbackTransaction (0.56025ms)
✖ commerce must stop before a Local API pool fallback after request ownership loss (0.562666ms)
ℹ tests 8
ℹ suites 0
ℹ pass 3
ℹ fail 5
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1374.122958
```

## initial-green

Source: `.tmp/t004-i0/green-core.log.0a1vw3vt.log`; raw-log SHA-256 `f35cfede762416cc561a0be22d3de0035a7d8d66f8cb52240b0a13e6ba4b7ae1`.

```text
ℹ tests 33
ℹ suites 0
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1165.297042
```

## initial-typecheck-oom

Source: `.tmp/t004-i0/typecheck.log.7wkf227k.log`; raw-log SHA-256 `c2f659670b358c5256ba9556e6b8515cef18d115c6d4a5638df925673a694713`.

```text
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

## initial-default

Source: `.tmp/t004-i0/final-default.log.h5dfjzp_.log`; raw-log SHA-256 `4c78acc31b6fa3945741fe8a65c4b2309ea350dd5259879a1a7cfd3d08d74240`.

```text
✖ deferred styling: article grid preserves its columns and readable type (24.763209ms)
✖ deferred styling: verification loops, account indicators and toast avoid CSS clocks (1.253667ms)
ℹ tests 2672
ℹ suites 1
ℹ pass 2631
ℹ fail 2
ℹ cancelled 0
ℹ skipped 39
ℹ todo 0
ℹ duration_ms 192357.36475
```

## pre-review-typecheck

Source: `.tmp/t004-i0/pre-review-typecheck.log.w0vpjtma.log`; raw-log SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

```text
(No log output; successful exit is recorded in the corresponding receipt.)
```

## cycle1-red

Source: `.tmp/t004-i0/cycle1-red.log.n5hdoku2.log`; raw-log SHA-256 `7605ca6abab34a30c24eeb1904a796ced3860710c8f14701b7f474d7ce1593a0`.

```text
✖ official 400 preserves its exact response after acknowledged rollback (5.144167ms)
✖ official 401 preserves its exact response after acknowledged rollback (0.937ms)
✖ official 403 preserves its exact response after acknowledged rollback (4.06275ms)
✖ official 404 preserves its exact response after acknowledged rollback (1.255917ms)
✖ official 409 preserves its exact response after acknowledged rollback (0.976417ms)
✖ official 500 preserves its exact response after acknowledged rollback (0.768625ms)
✖ official 503 preserves its exact response after acknowledged rollback (0.689834ms)
✖ official 409 stays outcome-unknown/503 with rejected-rollback (5.520458ms)
✖ official 409 stays outcome-unknown/503 with absent-session (1.178208ms)
✖ unwrapped confirmation requires the private native owner before provider work or writes (5.60375ms)
ℹ tests 16
ℹ suites 0
ℹ pass 6
ℹ fail 10
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1220.653708
```

## cycle1-green

Source: `.tmp/t004-i0/cycle1-commerce.log.iirw6ekc.log`; raw-log SHA-256 `1243efce9a0b6d1fd18efc59f00f4766c9d3a51a38ea178e86bb1dff5aeb7eee`.

```text
ℹ tests 411
ℹ suites 0
ℹ pass 410
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 21073.267875
```

## cycle1-typecheck

Source: `.tmp/t004-i0/cycle1-typecheck.log.375b3vjf.log`; raw-log SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

```text
(No log output; successful exit is recorded in the corresponding receipt.)
```

## cycle1-default

Source: `.tmp/t004-i0/cycle1-default.log.icfwpa8s.log`; raw-log SHA-256 `f1c82da37f22166140ec1e3eaf34137854a77d357c487c677a3689729676ac19`.

```text
✖ deferred styling: article grid preserves its columns and readable type (24.213042ms)
✖ deferred styling: verification loops, account indicators and toast avoid CSS clocks (1.053792ms)
ℹ tests 2683
ℹ suites 1
ℹ pass 2642
ℹ fail 2
ℹ cancelled 0
ℹ skipped 39
ℹ todo 0
ℹ duration_ms 192838.721125
```
