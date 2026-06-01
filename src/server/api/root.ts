import {
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * Marketplace routers (skills, submissions, listings, …) will be added here
 * as the backend data layer is built.
 */
export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ ok: true })),
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 */
export const createCaller = createCallerFactory(appRouter);
