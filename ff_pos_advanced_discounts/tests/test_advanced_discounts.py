from odoo import Command
from odoo.addons.point_of_sale.tests.common import CommonPosTest
from odoo.tests import tagged


@tagged("post_install", "-at_install")
class TestAdvancedDiscountModels(CommonPosTest):
    """Focused model checks; full UI/accounting flows use the standard POS tour stack."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.config = cls.pos_config_usd
        cls.config.write({
            "ff_advanced_discount_enabled": True,
            "ff_discount_max_percentage": 100,
            "ff_discount_max_amount": 0,
        })
        cls.config.open_ui()
        cls.session = cls.config.current_session_id
        if cls.session.state == "opening_control":
            cls.session.set_opening_control(0, None)
        cls.product = cls.env["product.product"].create({
            "name": "Advanced Discount Product",
            "available_in_pos": True,
            "list_price": 100,
            "pos_categ_ids": [Command.set(cls.cat_no_tax.ids)],
        })

    def _order(self, **values):
        return self.env["pos.order"].create({
            "session_id": self.session.id,
            "company_id": self.config.company_id.id,
            "config_id": self.config.id,
            "pricelist_id": self.config.pricelist_id.id,
            "amount_paid": 0,
            "amount_return": 0,
            "amount_tax": 0,
            "amount_total": 0,
            **values,
        })

    def test_fixed_line_definition_is_stored_and_derived(self):
        order = self._order()
        line = self.env["pos.order.line"].create({
            "order_id": order.id,
            "product_id": self.product.id,
            "qty": 5,
            "price_unit": 200,
            "price_subtotal": 1000,
            "price_subtotal_incl": 1000,
            "tax_ids": [Command.clear()],
            "ff_discount_type": "fixed",
            "ff_discount_value": 100,
        })
        self.assertEqual(line.ff_discount_type, "fixed")
        self.assertEqual(line.ff_discount_value, 100)
        self.assertAlmostEqual(line.discount, 10.0, places=4)

        line.qty = 2
        line._ff_sync_discount_field()
        self.assertAlmostEqual(line.discount, 25.0, places=4)

    def test_percentage_boundaries(self):
        order = self._order()
        line = self.env["pos.order.line"].create({
            "order_id": order.id,
            "product_id": self.product.id,
            "qty": 1,
            "price_unit": 100,
            "price_subtotal": 100,
            "price_subtotal_incl": 100,
            "tax_ids": [Command.clear()],
            "ff_discount_type": "percent",
            "ff_discount_value": 100,
        })
        self.assertEqual(line.discount, 100)
