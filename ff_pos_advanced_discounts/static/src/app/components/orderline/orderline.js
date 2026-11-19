import { patch } from "@web/core/utils/patch";
import { formatCurrency } from "@web/core/currency";
import { Orderline } from "@point_of_sale/app/components/orderline/orderline";

patch(Orderline.prototype, {
    get lineScreenValues() {
        const values = super.lineScreenValues;
        if (!values || !this.line) {
            return values;
        }
        return {
            ...values,
            ffFixedDiscount:
                this.line.ff_discount_type === "fixed"
                    ? formatCurrency(this.line.ff_discount_value || 0, this.line.currency.id)
                    : false,
        };
    },
});
