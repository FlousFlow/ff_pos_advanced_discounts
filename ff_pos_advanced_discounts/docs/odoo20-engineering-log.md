## 2026-11-19 — ff_pos_advanced_discounts 20.0.1.0.0

- Inspected `/Users/mohamedgamal/Desktop/odoo20`, `point_of_sale`, `pos_discount`, POS related-model serialization, OWL control areas, account tax helpers, receipt generation and POS tests.
- Chosen design: inherit `pos.order`, `pos.order.line`, `pos.config`, and `res.config.settings`; use Odoo's native `discount` percentage as a derived tax-engine input while preserving the entered fixed/percentage definition in dedicated fields.
- Global discounts delegate to `pos_discount`'s `accountTaxHelpers.prepare_global_discount_lines` flow. No core files or independent tax engine are changed.
- Fixed line values are converted to an equivalent percentage against the no-discount tax-included line total so taxes and payable totals remain aligned.
- Odoo module installation and focused model tests passed on database `ff_adv_clean20`; browser/tour tests and production deployment remain release gates.
