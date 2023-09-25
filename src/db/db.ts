import { orchidORM } from "orchid-orm";
import { config } from "./config";

export const db = orchidORM(config.database, {});
