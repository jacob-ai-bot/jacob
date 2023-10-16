import { Request, Response } from "express";
import { NotFoundError } from "pqb";
import { db } from "../db/db";

export async function createAccessTokenKeys(_: Request, res: Response) {
  try {
    const { readKey, writeKey } = await db.tokens.create({});

    res.status(200).json({ data: { readKey, writeKey } });
  } catch (error) {
    res.status(500).json({ errors: [`${error}`] });
  }
}

export async function getAccessToken(req: Request, res: Response) {
  const { readKey } = req.params;

  try {
    const accessToken = await db.tokens
      .where({ readKey })
      .whereNot({ accessToken: null })
      .get("accessToken")
      .delete();

    res.status(200).json({ data: { accessToken } });
  } catch (error) {
    console.log(error);
    if (error instanceof NotFoundError) {
      return res.status(404).json({ errors: ["Not Found"] });
    }
    res.status(500).json({ errors: [`${error}`] });
  }
}

export async function postAccessToken(req: Request, res: Response) {
  const { writeKey } = req.params;
  const { accessToken } = req.body;

  console.log({ writeKey, accessToken });

  try {
    const rowsUpdated = await db.tokens
      .findBy({ writeKey, accessToken: null })
      .update({ accessToken });

    console.log({ rowsUpdated });

    if (rowsUpdated === 0) {
      return res.status(404).json({ errors: ["Not Found"] });
    } else {
      res.status(200).json({ data: {} });
    }
  } catch (error) {
    res.status(500).json({ errors: [`${error}`] });
  }
}
