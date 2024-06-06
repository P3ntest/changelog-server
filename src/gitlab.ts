import { z } from "zod";

export const GitlabMergeRequestEvent = z.object({
  object_kind: z.literal("merge_request"),
  object_attributes: z.object({
    id: z.number(),
    title: z.string(),
    action: z.union([z.literal("merge"), z.string()]),
    url: z.string(),
  }),
});

export const GitlabReleaseEvent = z.object({
  object_kind: z.literal("release"),
  action: z.union([z.literal("create"), z.string()]),
  url: z.string(),
  name: z.string(),
});
