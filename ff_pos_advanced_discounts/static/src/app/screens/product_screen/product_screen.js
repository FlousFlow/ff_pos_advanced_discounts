import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";

patch(ProductScreen.prototype, {
    onNumpadClick(buttonValue) {
        const line = this.currentOrder?.getSelectedOrderline();
        if (
            buttonValue === "discount" &&
            this.pos.config.ff_advanced_discount_enabled &&
            line &&
            !line.isServiceFeeLine() &&
            !line.isDiscountLine
        ) {
            this.numberBuffer.capture();
            this.numberBuffer.reset();
            return this.pos.openAdvancedLineDiscountDialog(line);
        }
        return super.onNumpadClick(...arguments);
    },
});
