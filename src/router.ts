import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  getReleases: publicProcedure.query(async () => {
    return ["hello"];
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
