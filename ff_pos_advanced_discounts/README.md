# POS Advanced Discounts (`ff_pos_advanced_discounts`)

Flous Flow's Odoo 20 Community extension for controlled manual POS discounts.

## Features

- One percentage or fixed monetary discount per order line.
- One percentage or fixed monetary discount per POS order.
- Fixed line discounts apply to the whole line and are recalculated when quantity changes.
- Global discounts reuse the installed `pos_discount` tax-aware allocation engine.
- Structured values survive POS offline storage, synchronization, refunds and receipt generation.
- Optional per-POS percentage and fixed-amount limits.

## Installation

1. Add the module directory to an Odoo 20 addons path.
2. Install **POS Advanced Discounts**. The standard `point_of_sale` and `pos_discount` modules are installed as dependencies.
3. In POS settings, enable **Global Discounts** and configure a discount product, then enable **Advanced Discounts**.

## Usage

- Select a line and press the native `%` control. Choose Percentage or Fixed Amount.
- Press the native **Discount** control to apply an order-level discount.
- Enter `0` to remove the active discount.

The fixed amount is a customer-facing reduction in the active POS currency. Tax computation, cash rounding, invoices, session entries and payment validation remain native Odoo operations.

## Compatibility notes

The module does not patch Odoo core. It inherits POS models and OWL components and stores the entered definition separately from Odoo's derived `discount` percentage. Standard discounts remain unchanged when Advanced Discounts is disabled.

## Tests

The module includes Odoo model tests and is intended to be run with the standard POS test suite on a disposable database. Browser/tour testing is required for final release validation.

## Changelog

### 20.0.1.0.0

- Initial release for Odoo 20 Community.
