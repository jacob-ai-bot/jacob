import { createCallerFactory, createTRPCRouter } from "./trpc";
import { githubRouter } from "./routers/github";
import { eventsRouter } from "./routers/events";
import { todoRouter } from "./routers/todos";
import { codebaseContextRouter } from "./routers/codebaseContext";
import { onboardingRouter } from "./routers/onboarding";
import { chatRouter } from "./routers/chat";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  github: githubRouter,
  events: eventsRouter,
  todos: todoRouter,
  codebaseContext: codebaseContextRouter,
  onboarding: onboardingRouter,
  chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
