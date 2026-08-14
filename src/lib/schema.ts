import { z } from "zod";

const targetCspSchema = z
  .object({
    connectSrc: z.enum(["'none'", "'self'"]).default("'none'"),
    wasm: z.boolean().default(false),
  })
  .default({ connectSrc: "'none'", wasm: false });

export const ChallengeMeta = z.object({
  slug: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
  order: z.number().int().min(1).max(99),
  act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  cat: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().max(120),
  vulnClass: z.string().min(1),
  cwe: z.string().optional(),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1)).min(1),
  flagHash: z.string().regex(/^[a-f0-9]{64}$/),
  frameHeight: z.number().int().min(200).max(900),
  mobileOk: z.boolean().default(false),
  targetCsp: targetCspSchema,
  status: z.enum(["draft", "ready"]).default("draft"),
});

export type ChallengeMeta = z.infer<typeof ChallengeMeta>;
