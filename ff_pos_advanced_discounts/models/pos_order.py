from odoo import _, api, fields, models
from odoo.exceptions import ValidationError
from odoo.tools import float_compare, float_is_zero


class PosOrder(models.Model):
    _inherit = "pos.order"

    ff_order_discount_type = fields.Selection(
        [("none", "None"), ("percent", "Percentage"), ("fixed", "Fixed Amount")],
        string="Advanced Order Discount Type",
        default="none",
        copy=True,
    )
    ff_order_discount_value = fields.Float(
        string="Advanced Order Discount Value", default=0.0, copy=True
    )
    ff_order_discount_amount = fields.Monetary(
        string="Advanced Order Discount Amount",
        compute="_compute_ff_order_discount_amount",
        store=True,
        currency_field="currency_id",
        help="Entered order discount represented as an effective customer-facing reduction.",
    )

    @api.depends(
        "ff_order_discount_type",
        "ff_order_discount_value",
        "lines.price_subtotal_incl",
        "lines.product_id",
        "lines.qty",
    )
    def _compute_ff_order_discount_amount(self):
        for order in self:
            eligible = order.lines.filtered(lambda line: not order._ff_is_global_discount_line(line))
            subtotal = sum(eligible.mapped("price_subtotal_incl"))
            if order.ff_order_discount_type == "percent":
                order.ff_order_discount_amount = subtotal * max(0.0, min(100.0, order.ff_order_discount_value)) / 100.0
            elif order.ff_order_discount_type == "fixed":
                order.ff_order_discount_amount = min(abs(order.ff_order_discount_value), abs(subtotal))
            else:
                order.ff_order_discount_amount = 0.0

    def _ff_is_global_discount_line(self, line):
        self.ensure_one()
        service_fee_product = self.preset_id.service_fee_product_id if self.preset_id else False
        return bool(
            (self.config_id.discount_product_id and line.product_id == self.config_id.discount_product_id)
            or line._is_tip_line()
            or (service_fee_product and line.product_id == service_fee_product)
        )

    def _ff_eligible_total_included(self):
        self.ensure_one()
        return abs(sum(
            line._ff_no_discount_total_included() * (1.0 - (line.discount or 0.0) / 100.0)
            for line in self.lines.filtered(lambda line: not self._ff_is_global_discount_line(line))
        ))

    @api.constrains("ff_order_discount_type", "ff_order_discount_value", "lines")
    def _check_ff_order_discount(self):
        for order in self:
            value = order.ff_order_discount_value
            if order.ff_order_discount_type == "none":
                if not float_is_zero(value, precision_rounding=order.currency_id.rounding):
                    raise ValidationError(_("An unused advanced order discount must have a zero value."))
                continue
            if value < 0:
                raise ValidationError(_("Discount values cannot be negative."))
            config = order.config_id
            if config and not config.ff_advanced_discount_enabled:
                raise ValidationError(_("Advanced discounts are disabled for this Point of Sale."))
            if order.ff_order_discount_type == "percent":
                if value > config.ff_discount_max_percentage:
                    raise ValidationError(_("The order discount exceeds the configured percentage limit."))
            else:
                eligible = order._ff_eligible_total_included()
                if float_compare(value, eligible, precision_rounding=order.currency_id.rounding) > 0:
                    raise ValidationError(_("A fixed order discount cannot exceed the eligible order total."))
                if config.ff_discount_max_amount and float_compare(
                    value, config.ff_discount_max_amount, precision_rounding=order.currency_id.rounding
                ) > 0:
                    raise ValidationError(_("The order discount exceeds the configured amount limit."))
