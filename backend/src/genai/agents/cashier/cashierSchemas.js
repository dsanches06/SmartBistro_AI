import { z } from "zod";

const CashierResponseSchema = z.object({
  success: z.preprocess((val) => {
    if (val === true) return true;
    if (typeof val === "string")
      return ["true", "yes", "ok", "1"].includes(
        String(val).trim().toLowerCase(),
      );
    return Boolean(val);
  }, z.literal(true)),
  order_summary: z.preprocess(
    (val) => {
      const summary = String(val ?? "").trim();
      return summary || "Pedido confirmado com sucesso.";
    },
    z.string().min(1),
  ),
  invoice: z.object({
    subtotal_amount: z.preprocess((val) => Number(val), z.number().nonnegative()),
    tax_rate: z.preprocess((val) => Number(val), z.number().nonnegative()),
    tax_amount: z.preprocess((val) => Number(val), z.number().nonnegative()),
    total_amount: z.preprocess((val) => Number(val), z.number().nonnegative()),
  }),
  payment: z.object({
    method: z.string().min(1),
    status: z.string().min(1),
  }),
  notes: z.preprocess(
    (val) => {
      if (val == null || String(val).trim() === "") return null;
      return String(val);
    },
    z.union([z.string(), z.null()]),
  ),
  stock_warnings: z.array(z.string()).optional(),
  final_status: z
    .preprocess(
      (val) => {
        if (val == null) return "ready";
        const v = String(val).trim().toLowerCase();
        if (v === "ready" || v === "ready_with_warnings") return v;
        return val;
      },
      z.enum(["ready", "ready_with_warnings"]),
    )
    .optional(),
});

export { CashierResponseSchema };