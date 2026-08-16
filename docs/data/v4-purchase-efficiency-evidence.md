# V4.1 purchase-efficiency evidence

## Static client source

- Client version: `1.0.1`
- IPA SHA-256: `0341bef051315f7827466d23f3e41900d06dfa3d4994c7ecc84a89f4d1e21dd8`
- Extraction mode: static asset inspection only. The application binary was not executed.
- Tables: `ShopProductTable`, `SpecialPackageTable`, `PopupPackageTable`, `RewardTable`

The recommendation ranking uses `SpecialPackageTable.Efficiency` only for products that contain that field. The first-purchase offer and direct currency products are excluded from this ranking because they do not provide a comparable `Efficiency` value.

## Price boundary

`ShopProductTable.PriceUSD` is retained as client-table evidence. A Korean won price is shown only when the same product identifier and price are currently visible on the official Korean App Store product page. No currency conversion is performed.

App Store check date: 2026-08-16

## Product projection

| Product ID | Client price | Client efficiency | Gold | Dice Core | Other known reward | Official KR price shown |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| `FIRST_PURCHASE` | $1.99 | n/a | 5,000 | 8 | Dice skin 1 | ₩3,300 |
| `SPC_SMALL_CHANGE_1` | $3.99 | 350 | 5,000 | 10 | | ₩6,600 |
| `SPC_SMALL_CHANGE_2` | $3.99 | 350 | 20,000 | 5 | | |
| `SPC_PAPERBAG` | $3.99 | 370 | 0 | 10 | Redesign item 1 | ₩6,600 |
| `SPC_CORE_TROPHY` | $3.99 | 360 | 25,000 | 0 | Additional reward 15 | |
| `SPC_REDESIGN_BUNDLE` | $7.99 | 400 | 30,000 | 12 | Redesign item 1 | ₩12,000 |
| `SPC_CORE_BUNDLE` | $8.99 | 510 | 10,000 | 30 | Additional reward 20 | |
| `SPC_GOLD_BUNDLE` | $9.99 | 500 | 70,000 | 15 | Additional reward 20 | |
| `TRG_LOOKS_GOOD` | $5.99 | 220 | 10,000 | 8 | | ₩9,900 |

`Efficiency` is a client data field. The site does not present it as a percentage, discount, return, or independently audited value.
