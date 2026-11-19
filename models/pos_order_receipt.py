from odoo import models


class PosOrderReceipt(models.AbstractModel):
    _inherit = "pos.order.receipt"

    def _order_receipt_generate_line_data(self):
        lines = super()._order_receipt_generate_line_data()
        for line, data in zip(self.lines, lines):
            data["ff_discount_type"] = line.ff_discount_type
            data["ff_discount_value_display"] = (
                self._order_receipt_format_currency(line.ff_discount_value)
                if line.ff_discount_type == "fixed"
                else False
            )
        return lines
