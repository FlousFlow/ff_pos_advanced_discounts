import { patch } from "@web/core/utils/patch";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";

patch(TicketScreen.prototype, {
    getRefundLinesDetails(refundDetail, destinationOrder) {
        const values = super.getRefundLinesDetails(...arguments);
        const source = refundDetail.line;
        if (source.ff_discount_type === "fixed") {
            const quantity = Math.abs(refundDetail.qty);
            const sourceQuantity = Math.abs(source.qty) || 1;
            const fixedValue = (source.ff_discount_value || 0) * quantity / sourceQuantity;
            const gross = Math.abs((source.price_unit || 0) * quantity);
            values.ff_discount_type = fixedValue ? "fixed" : "none";
            values.ff_discount_value = fixedValue;
            values.ff_original_price_unit = source.ff_original_price_unit || source.price_unit;
            values.discount = gross ? (fixedValue / gross) * 100 : 0;
        } else if (source.ff_discount_type === "percent") {
            values.ff_discount_type = source.ff_discount_value ? "percent" : "none";
            values.ff_discount_value = source.ff_discount_value || 0;
            values.ff_original_price_unit = source.ff_original_price_unit || source.price_unit;
        }
        return values;
    },

    async onDoRefund() {
        const source = this.getSelectedOrder();
        await super.onDoRefund(...arguments);
        const destination = this.pos.getOrder();
        if (
            source?.ff_order_discount_type === "fixed" &&
            destination?.is_refund &&
            destination !== source
        ) {
            const sourceLines = source.getOrderlines().filter((line) => line.isGlobalDiscountApplicable());
            const destinationLines = destination.getOrderlines().filter((line) => line.isGlobalDiscountApplicable());
            const sourceTotal = Math.abs(source.getPriceWithOptions({ lines: sourceLines }).taxDetails.total_amount_no_rounding || 0);
            const destinationTotal = Math.abs(destination.getPriceWithOptions({ lines: destinationLines }).taxDetails.total_amount_no_rounding || 0);
            const proportional = sourceTotal ? Math.min(source.ff_order_discount_value * destinationTotal / sourceTotal, destinationTotal) : 0;
            await this.pos.applyDiscount(proportional, "fixed", destination);
        }
    },
});
