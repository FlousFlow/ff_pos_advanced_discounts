from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    pos_ff_advanced_discount_enabled = fields.Boolean(
        related="pos_config_id.ff_advanced_discount_enabled", readonly=False
    )
    pos_ff_discount_max_percentage = fields.Float(
        related="pos_config_id.ff_discount_max_percentage", readonly=False
    )
    pos_ff_discount_max_amount = fields.Float(
        related="pos_config_id.ff_discount_max_amount", readonly=False
    )
