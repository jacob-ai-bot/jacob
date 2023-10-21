import { Request, Response } from "express";

export const newIssueForFigmaFile = async (req: Request, res: Response) => {
  const { verb } = req.params;

  console.log(`newIssueForFigmaFile: ${verb}`);

  if (!req.body) {
    res.status(400).send("Missing request body");
    return;
  }

  res.status(200).send(JSON.stringify({ data: { success: true } }));
};
