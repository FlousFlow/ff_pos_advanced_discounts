import { patch } from "@web/core/utils/patch";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { _t } from "@web/core/l10n/translation";

patch(PosOrderline.prototype, {
    setup(vals) {
        super.setup(...arguments);
        this.ff_discount_type = this.ff_discount_type || "none";
        this.ff_discount_value = this.ff_discount_value || 0;
        this.ff_original_price_unit = this.ff_original_price_unit || 0;
        if (this.ff_discount_type === "fixed") {
            this._ffSyncEffectiveDiscount();
        }
    },

    get ffAdvancedDiscountEnabled() {
        return Boolean(this.config?.ff_advanced_discount_enabled);
    },

    _ffNoDiscountTotalIncluded() {
        if (!this.order_id) {
            return Math.abs((this.price_unit || 0) * (this.qty || 0));
        }
        const data = this.order_id.getPriceWithOptions({
            lines: [this],
            baseLineOpts: { discount: 0 },
        });
        return Math.abs(data.taxDetails.total_amount_no_rounding || 0);
    },

    _ffSyncEffectiveDiscount() {
        if (!this.ffAdvancedDiscountEnabled) {
            return;
        }
        if (this.ff_discount_type === "percent") {
            this.discount = Math.max(0, Math.min(100, Number(this.ff_discount_value) || 0));
        } else if (this.ff_discount_type === "fixed") {
            const gross = this._ffNoDiscountTotalIncluded();
            this.discount = gross ? Math.max(0, Math.min(100, (this.ff_discount_value / gross) * 100)) : 0;
        }
        this.order_id?.triggerRecomputeAllPrices();
    },

    setAdvancedDiscount(value, type = "percent") {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return { title: _t("Invalid discount"), body: _t("Discount values must be zero or greater.") };
        }
        if (!this.ffAdvancedDiscountEnabled) {
            return { title: _t("Advanced discounts disabled"), body: _t("Enable Advanced Discounts in the POS configuration first.") };
        }
        const config = this.config;
        if (type === "percent" && parsed > (config.ff_discount_max_percentage ?? 100)) {
            return { title: _t("Discount limit"), body: _t("The discount exceeds the configured percentage limit.") };
        }
        if (type === "fixed") {
            const gross = this._ffNoDiscountTotalIncluded();
            if (parsed > gross + this.currency.rounding / 2) {
                return { title: _t("Discount limit"), body: _t("A fixed line discount cannot exceed the line total.") };
            }
            if (config.ff_discount_max_amount && parsed > config.ff_discount_max_amount) {
                return { title: _t("Discount limit"), body: _t("The discount exceeds the configured amount limit.") };
            }
        }
        this.ff_discount_type = parsed ? type : "none";
        this.ff_discount_value = parsed;
        this.ff_original_price_unit = parsed ? this.price_unit : 0;
        if (!parsed) {
            this.discount = 0;
        } else {
            this._ffSyncEffectiveDiscount();
        }
        this.order_id?.triggerRecomputeAllPrices();
        return true;
    },

    setDiscount(value) {
        if (this.ffAdvancedDiscountEnabled && !this._ffSettingNativeDiscount) {
            return this.setAdvancedDiscount(value, "percent");
        }
        return super.setDiscount(...arguments);
    },

    setQuantity(...args) {
        const result = super.setQuantity(...args);
        if (result === true && this.ff_discount_type === "fixed") {
            this._ffSyncEffectiveDiscount();
        }
        return result;
    },

    setUnitPrice(...args) {
        super.setUnitPrice(...args);
        if (this.ff_discount_type === "fixed") {
            this._ffSyncEffectiveDiscount();
        }
    },

    canBeMergedWith(orderline) {
        if (
            this.ff_discount_type !== orderline.ff_discount_type ||
            this.ff_discount_value !== orderline.ff_discount_value
        ) {
            return false;
        }
        return super.canBeMergedWith(...arguments);
    },
});
