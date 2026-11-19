from odoo import fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    ff_advanced_discount_enabled = fields.Boolean(
        string="Advanced Discounts",
        default=True,
        help="Allow cashiers to enter percentage or fixed manual discounts in the POS.",
    )
    ff_discount_max_percentage = fields.Float(
        string="Maximum Discount Percentage",
        default=100.0,
        help="Maximum percentage accepted by the advanced discount controls. Use 0 for no percentage discount.",
    )
    ff_discount_max_amount = fields.Float(
        string="Maximum Discount Amount",
        default=0.0,
        help="Optional maximum fixed discount in the POS currency. A zero value means no fixed-amount cap.",
    )
