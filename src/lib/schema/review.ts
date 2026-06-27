import { z } from "zod";

/** Severity of a review finding. */
export const severitySchema = z.enum(["info", "warning", "critical"]);
export type Severity = z.infer<typeof severitySchema>;

/** Status of a review finding. */
export const reviewItemStatusSchema = z.enum(["pending", "submitted", "skipped"]);
export type ReviewItemStatus = z.infer<typeof reviewItemStatusSchema>;

/**
 * A single review finding produced by the AI (raw input).
 * Since this accepts the LLM output as-is, `id` / `status` are optional
 * (filled in on the server side).
 */
export const llmReviewItemSchema = z.object({
  id: z.string().optional(),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  side: z.enum(["RIGHT", "LEFT"]).default("RIGHT"),
  severity: severitySchema,
  category: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  codeSnippet: z.string().default(""),
  status: reviewItemStatusSchema.optional(),
});

/** Array schema for the LLM output. */
export const llmReviewItemsSchema = z.array(llmReviewItemSchema);

/**
 * A finalized review finding. `id` / `status` are required.
 * Used for persistence, API input/output, and the UI.
 */
export const reviewItemSchema = z.object({
  id: z.string().min(1),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  side: z.enum(["RIGHT", "LEFT"]).default("RIGHT"),
  severity: severitySchema,
  category: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  codeSnippet: z.string().default(""),
  status: reviewItemStatusSchema.default("pending"),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

/** Result of a single review run. */
export const reviewSessionSchema = z.object({
  id: z.string(),
  repo: z.string(),
  prNumber: z.number().int(),
  headSha: z.string(),
  promptUsed: z.string(),
  model: z.string(),
  items: z.array(reviewItemSchema),
  createdAt: z.string(),
});
export type ReviewSession = z.infer<typeof reviewSessionSchema>;
