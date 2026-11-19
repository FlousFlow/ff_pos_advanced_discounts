import { test, expect } from "@odoo/hoot";
import { setupPosEnv } from "@point_of_sale/../tests/unit/utils";
import { definePosModels } from "@point_of_sale/../tests/unit/data/generate_model_definitions";
import { getSingleProductOrder } from "@point_of_sale/../tests/unit/accounting/utils";

definePosModels();

test("fixed line discounts keep their entered amount when quantity changes", async () => {
    const store = await setupPosEnv();
    store.config.ff_advanced_discount_enabled = true;
    store.config.ff_discount_max_percentage = 100;
    store.config.ff_discount_max_amount = 0;

    const order = await getSingleProductOrder(store, "Fixed discount product", 200);
    const line = order.getSelectedOrderline();

    expect(line.setAdvancedDiscount(100, "fixed")).toBe(true);
    expect(line.ff_discount_type).toBe("fixed");
    expect(line.ff_discount_value).toBe(100);
    expect(line.discount).toBe(50);

    line.setQuantity(5, true);
    expect(line.ff_discount_value).toBe(100);
    expect(line.discount).toBe(10);
    expect(order.priceIncl).toBe(900);
});
