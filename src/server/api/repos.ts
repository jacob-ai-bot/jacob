import { type Request, type Response } from "express";
import { getAllRepos } from "./utils";

export async function getRepos(req: Request, res: Response) {
  const { authorization } = req.headers;
  const token: string | undefined = (authorization ?? "").trim().split(" ")[1];
  if (!token) {
    return res.status(401).json({ errors: ["Unauthorized"] });
  }
  try {
    const repos = await getAllRepos(token);
    return res.status(200).json(repos);
  } catch (error) {
    return res.status(500).json({ errors: [String(error)] });
  }
}
