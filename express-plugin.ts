import { NextFunction } from "express";
import { ViteDevServer } from "vite";

export default function express(path: string) {
  return {
    name: "vite3-plugin-express",
    configureServer: async (server: ViteDevServer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use(async (req: any, res: any, next: NextFunction) => {
        process.env["VITE"] = "true";
        try {
          const { app } = await server.ssrLoadModule(path);
          app(req, res, next);
        } catch (err) {
          console.error(err);
        }
      });
    },
  };
}
