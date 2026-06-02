import { z } from "zod";

const MaitreItemSchema = z.object({
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
  price_corrected: z
    .preprocess((val) => {
      if (val == null || val === "") return false;
      if (typeof val === "string")
        return String(val).trim().toLowerCase() === "true";
      return Boolean(val);
    }, z.boolean())
    .optional(),
});

const MaitreResponseSchema = z.object({
  customer_name: z.string().min(1),
  customer_surname: z.preprocess(
    (val) => {
      if (val == null || String(val).trim() === "") return null;
      return String(val);
    },
    z.union([z.string().min(1), z.null()]),
  ),
  table_id: z.preprocess(
    (val) => {
      if (val == null || val === "") return null;
      return Number(val);
    },
    z.union([z.number().int().positive(), z.null()]),
  ),
  service_type: z.preprocess(
    (val) => {
      if (typeof val !== "string") return val;
      const normalized = String(val).trim().toLowerCase();
      if (
        ["table", "mesa", "dine-in", "dine in", "comer aqui"].includes(
          normalized,
        )
      )
        return "Table";
      if (
        [
          "takeaway",
          "take away",
          "para levar",
          "para fora",
          "to go",
          "away",
        ].includes(normalized)
      )
        return "Takeaway";
      return val;
    },
    z.enum(["Table", "Takeaway"]),
  ),
  allergy_restrictions: z.preprocess(
    (val) => {
      if (val == null || String(val).trim() === "") return null;
      return String(val);
    },
    z.union([z.string(), z.null()]),
  ),
  validation_status: z.preprocess(
    (val) => String(val).trim().toLowerCase(),
    z.enum(["valid", "invalid"]),
  ),
  invalid_items: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          item_id: z.any().optional(),
          name: z.string().min(1).optional(),
          reason: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  items: z.array(MaitreItemSchema).min(1),
  notes: z.preprocess(
    (val) => {
      if (val == null || String(val).trim() === "") return null;
      return String(val);
    },
    z.union([z.string(), z.null()]),
  ),
});

export { MaitreItemSchema, MaitreResponseSchema };