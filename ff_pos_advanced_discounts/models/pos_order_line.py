from odoo import _, api, fields, models
from odoo.exceptions import ValidationError
from odoo.tools import float_compare, float_is_zero


class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    ff_discount_type = fields.Selection(
        [("none", "None"), ("percent", "Percentage"), ("fixed", "Fixed Amount")],
        string="Advanced Discount Type",
        default="none",
        copy=True,
        help="The single manual discount definition entered for this POS line.",
    )
    ff_discount_value = fields.Float(
        string="Advanced Discount Value", default=0.0, copy=True
    )
    ff_original_price_unit = fields.Float(
        string="Original Unit Price", digits=0, copy=True
    )
    ff_discount_amount = fields.Monetary(
        string="Advanced Discount Amount",
        compute="_compute_ff_discount_amount",
        store=True,
        currency_field="currency_id",
        help="Effective customer-facing reduction before any order-level discount.",
    )

    @api.model
    def _load_pos_data_fields(self, config):
        fields_to_load = super()._load_pos_data_fields(config)
        for name in (
            "ff_discount_type",
            "ff_discount_value",
            "ff_original_price_unit",
            "ff_discount_amount",
        ):
            if name not in fields_to_load:
                fields_to_load.append(name)
        return fields_to_load

    def _ff_no_discount_total_included(self, qty=None):
        self.ensure_one()
        quantity = abs(self.qty if qty is None else qty)
        if float_is_zero(quantity, precision_rounding=self.currency_id.rounding):
            return 0.0
        taxes = self.tax_ids_after_fiscal_position.compute_all(
            self.price_unit,
            self.currency_id,
            quantity,
            product=self.product_id,
            partner=self.order_id.partner_id,
        )
        return abs(taxes["total_included"])

    def _ff_effective_percentage(self):
        self.ensure_one()
        if self.ff_discount_type == "percent":
            return max(0.0, min(100.0, self.ff_discount_value))
        if self.ff_discount_type != "fixed":
            return self.discount or 0.0
        gross = self._ff_no_discount_total_included()
        if float_is_zero(gross, precision_rounding=self.currency_id.rounding):
            return 0.0
        return max(0.0, min(100.0, self.ff_discount_value / gross * 100.0))

    @api.depends(
        "ff_discount_type",
        "ff_discount_value",
        "price_unit",
        "qty",
        "tax_ids",
        "order_id.fiscal_position_id",
    )
    def _compute_ff_discount_amount(self):
        for line in self:
            gross = line._ff_no_discount_total_included()
            if line.ff_discount_type == "fixed":
                line.ff_discount_amount = min(abs(line.ff_discount_value), gross)
            elif line.ff_discount_type == "percent":
                line.ff_discount_amount = gross * max(0.0, min(100.0, line.ff_discount_value)) / 100.0
            else:
                line.ff_discount_amount = 0.0

    def _ff_sync_discount_field(self):
        """Keep Odoo's native percentage field as the derived tax-engine input."""
        for line in self:
            if line.ff_discount_type not in ("percent", "fixed"):
                continue
            percentage = line._ff_effective_percentage()
            if float_compare(line.discount, percentage, precision_digits=6):
                super(PosOrderLine, line.with_context(ff_skip_sync=True)).write(
                    {"discount": percentage}
                )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("ff_discount_type") in ("percent", "fixed"):
                vals.setdefault("ff_original_price_unit", vals.get("price_unit", 0.0))
        lines = super().create(vals_list)
        lines._ff_sync_discount_field()
        return lines

    def write(self, vals):
        result = super().write(vals)
        if not self.env.context.get("ff_skip_sync") and {
            "ff_discount_type",
            "ff_discount_value",
            "price_unit",
            "qty",
            "tax_ids",
            "discount",
        } & set(vals):
            self._ff_sync_discount_field()
        return result

    @api.constrains("ff_discount_type", "ff_discount_value", "price_unit", "qty", "order_id")
    def _check_ff_discount(self):
        for line in self:
            if line.ff_discount_type == "none":
                if not float_is_zero(line.ff_discount_value, precision_rounding=line.currency_id.rounding):
                    raise ValidationError(_("An unused advanced discount must have a zero value."))
                continue
            if line.ff_discount_value < 0:
                raise ValidationError(_("Discount values cannot be negative."))
            config = line.order_id.config_id
            if config and not config.ff_advanced_discount_enabled:
                raise ValidationError(_("Advanced discounts are disabled for this Point of Sale."))
            if line.ff_discount_type == "percent":
                if line.ff_discount_value > config.ff_discount_max_percentage:
                    raise ValidationError(_("The line discount exceeds the configured percentage limit."))
            else:
                gross = line._ff_no_discount_total_included()
                if float_compare(line.ff_discount_value, gross, precision_rounding=line.currency_id.rounding) > 0:
                    raise ValidationError(_("A fixed line discount cannot exceed the line total."))
                if config.ff_discount_max_amount and float_compare(
                    line.ff_discount_value,
                    config.ff_discount_max_amount,
                    precision_rounding=line.currency_id.rounding,
                ) > 0:
                    raise ValidationError(_("The line discount exceeds the configured amount limit."))
