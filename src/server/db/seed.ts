import { db } from "./db";

export const seed = async () => {
  // create records here

  await db.$close();
};
