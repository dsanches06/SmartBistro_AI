import { z } from "zod";

const ChefItemSchema = z.object({
  item_id: z
    .preprocess((val) => {
      if (val == null || val === "") return undefined;
      const parsed = Number(val);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
    }, z.number().int().positive())
    .optional(),
  name: z.string().min(1),
  quantity: z.preprocess(
    (val) => Number(val ?? 1),
    z.number().int().positive(),
  ),
  price: z.preprocess((val) => Number(val), z.number().nonnegative()),
  unavailable: z.preprocess((val) => {
    if (val === "" || val == null) return false;
    if (typeof val === "string")
      return String(val).trim().toLowerCase() === "true";
    return Boolean(val);
  }, z.boolean()),
  reason: z.preprocess(
    (val) => {
      if (val == null || String(val).trim() === "") return null;
      return String(val);
    },
    z.union([z.string(), z.null()]),
  ),
});

const ChefResponseSchema = z.object({
  kitchen_sequence: z.array(z.string().min(1)).min(1),
  sections: z.record(z.array(z.string().min(1)).min(1)),
  stock_status: z.preprocess(
    (val) => {
      if (typeof val !== "string") return val;
      const normalized = String(val).trim().toLowerCase();
      if (normalized === "ok") return "ok";
      if (normalized === "partial") return "partial";
      return val;
    },
    z.enum(["ok", "partial"]),
  ),
  stock_alerts: z
    .array(
      z.object({
        ingredient: z.string().min(1),
        available: z.preprocess((val) => Number(val), z.number().nonnegative()),
      }),
    )
    .default([]),
  unavailable_items: z
    .array(
      z.object({
        item_id: z
          .preprocess((val) => Number(val), z.number().int().positive())
          .optional(),
        name: z.string().min(1).optional(),
        reason: z.preprocess(
          (val) => {
            if (val == null || String(val).trim() === "") return null;
            return String(val);
          },
          z.union([z.string(), z.null()]),
        ).optional(),
      }),
    )
    .optional(),
  estimated_minutes: z.preprocess(
    (val) => Number(val),
    z.number().int().nonnegative(),
  ),
  items: z.array(ChefItemSchema).min(1),
  notes: z.preprocess(
    (val) => {
      if (val == null || String(val).trim() === "") return null;
      return String(val);
    },
    z.union([z.string(), z.null()]),
  ),
});

export { ChefItemSchema, ChefResponseSchema };