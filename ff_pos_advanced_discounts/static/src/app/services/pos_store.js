import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/components/popups/number_popup/number_popup";
import { SelectionPopup } from "@point_of_sale/app/components/popups/selection_popup/selection_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { makeAwaitable } from "@point_of_sale/app/utils/make_awaitable_dialog";
import { PosStore } from "@point_of_sale/app/services/pos_store";

const types = [
    { name: "fixed", symbol: "" },
    { name: "percent", symbol: "%" },
];

patch(PosStore.prototype, {
    async openAdvancedDiscountScope(line, order = this.getOrder()) {
        const choices = [{
            id: "order",
            label: _t("Discount on the whole order"),
            isSelected: false,
            item: "order",
        }];
        if (line && !line.isDiscountLine && !line.isServiceFeeLine()) {
            choices.unshift({
                id: "line",
                label: _t("Discount on selected item"),
                isSelected: false,
                item: "line",
            });
        }
        const target = await makeAwaitable(this.dialog, SelectionPopup, {
            title: _t("Choose discount scope"),
            list: choices,
        });
        if (target === "line") {
            return this.openAdvancedLineDiscountDialog(line);
        }
        if (target === "order") {
            return this.openAdvancedOrderDiscountDialog(order);
        }
    },

    openAdvancedOrderDiscountDialog(order = this.getOrder()) {
        const startingType = order.ff_order_discount_type === "fixed" ? "fixed" : "percent";
        const startingValue = order.ff_order_discount_value || this.config.discount_pc || 0;
        this.dialog.add(NumberPopup, {
            title: _t("Order discount"),
            startingValue,
            startingType,
            types: [
                { name: "fixed", symbol: this.currency.symbol },
                { name: "percent", symbol: "%" },
            ],
            getPayload: (num, type) => {
                const value = this.parseValidFloat(num.toString());
                this.applyDiscount(value, type, order);
            },
            formatDisplayedValue: (value, type) =>
                type === "fixed"
                    ? this.formatCurrency(this.parseValidFloat(String(value ?? "")))
                    : `${value} %`,
        });
    },

    _ffValidateOrderDiscount(value, type, order) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return _t("Discount values must be zero or greater.");
        }
        if (type === "percent" && parsed > (this.config.ff_discount_max_percentage ?? 100)) {
            return _t("The discount exceeds the configured percentage limit.");
        }
        if (type === "fixed") {
            const lines = order.getOrderlines().filter((line) => line.isGlobalDiscountApplicable());
            const eligible = Math.abs(
                order.getPriceWithOptions({ lines }).taxDetails.total_amount_no_rounding || 0
            );
            if (parsed > eligible + this.currency.rounding / 2) {
                return _t("A fixed order discount cannot exceed the eligible order total.");
            }
            if (this.config.ff_discount_max_amount && parsed > this.config.ff_discount_max_amount) {
                return _t("The discount exceeds the configured amount limit.");
            }
        }
        return false;
    },

    applyAdvancedLineDiscount(line, value, type) {
        const result = line.setAdvancedDiscount(value, type);
        if (result !== true) {
            this.dialog.add(AlertDialog, result);
        }
        return result;
    },

    openAdvancedLineDiscountDialog(line) {
        const startingType = line.ff_discount_type === "fixed" ? "fixed" : "percent";
        const startingValue = line.ff_discount_value || 0;
        this.dialog.add(NumberPopup, {
            title: _t("Line discount"),
            startingValue,
            startingType,
            types: types.map((item) => ({ ...item, symbol: item.name === "fixed" ? this.currency.symbol : "%" })),
            getPayload: (num, type) => {
                const value = this.parseValidFloat(num.toString());
                this.applyAdvancedLineDiscount(line, value, type);
            },
            formatDisplayedValue: (value, type) =>
                type === "fixed"
                    ? this.formatCurrency(this.parseValidFloat(String(value ?? "")))
                    : `${value} %`,
        });
    },

    async applyDiscount(value, type = "percent", order = this.getOrder()) {
        if (!order?.config?.ff_advanced_discount_enabled) {
            return super.applyDiscount(...arguments);
        }
        const error = this._ffValidateOrderDiscount(value, type, order);
        if (error) {
            this.dialog.add(AlertDialog, { title: _t("Invalid discount"), body: error });
            return false;
        }
        const result = await super.applyDiscount(...arguments);
        order.ff_order_discount_type = value ? type : "none";
        order.ff_order_discount_value = value || 0;
        order.triggerRecomputeAllPrices();
        return result;
    },
});
