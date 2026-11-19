{
    "name": "POS Advanced Discounts",
    "summary": "Per-line and per-order percentage or fixed discounts",
    "description": """
Native Odoo Point of Sale extension for controlled manual discounts.

Cashiers can apply one percentage or fixed monetary discount to a line and one
percentage or fixed monetary discount to an order. The module stores the
entered definitions while delegating tax, rounding, invoicing, refunds and
session accounting to Odoo's existing POS and tax engines.
""",
    "category": "Sales/Point of Sale",
    "version": "20.0.1.0.1",
    "author": "Flous Flow",
    "website": "https://flousflow.com",
    "license": "LGPL-3",
    "images": ["static/description/cover.jpg"],
    "depends": ["point_of_sale", "pos_discount"],
    "data": [
        "views/pos_config_views.xml",
        "receipt/pos_order_receipt.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "ff_pos_advanced_discounts/static/src/app/**/*.js",
            "ff_pos_advanced_discounts/static/src/app/**/*.xml",
            "ff_pos_advanced_discounts/static/src/app/**/*.scss",
        ],
        "web.assets_tests": [
            "ff_pos_advanced_discounts/static/tests/**/*",
        ],
        "web.assets_unit_tests": [
            "ff_pos_advanced_discounts/static/tests/**/*",
        ],
    },
    "installable": True,
    "application": False,
}
