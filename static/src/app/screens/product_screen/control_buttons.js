import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/components/popups/number_popup/number_popup";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";

patch(ControlButtons.prototype, {
    clickDiscount() {
        if (!this.pos.config.ff_advanced_discount_enabled) {
            return super.clickDiscount(...arguments);
        }
        const order = this.pos.getOrder();
        const startingType = order.ff_order_discount_type === "fixed" ? "fixed" : "percent";
        const startingValue = order.ff_order_discount_value || this.pos.config.discount_pc || 0;
        this.dialog.add(NumberPopup, {
            title: _t("Order discount"),
            startingValue,
            startingType,
            types: [
                { name: "fixed", symbol: this.pos.currency.symbol },
                { name: "percent", symbol: "%" },
            ],
            getPayload: (num, type) => {
                const value = this.pos.parseValidFloat(num.toString());
                this.pos.applyDiscount(value, type, order);
            },
            formatDisplayedValue: (value, type) =>
                type === "fixed"
                    ? this.pos.formatCurrency(this.pos.parseValidFloat(String(value ?? "")))
                    : `${value} %`,
        });
    },
});
