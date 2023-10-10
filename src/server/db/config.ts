import "dotenv/config";

const database = {
  databaseURL: process.env.DATABASE_URL,
};
if (!database.databaseURL) throw new Error("DATABASE_URL is missing in .env");

const testDatabase = {
  databaseURL: process.env.DATABASE_TEST_URL,
};

const allDatabases = [database];

if (testDatabase.databaseURL) {
  allDatabases.push(testDatabase);
}

export const config = {
  allDatabases,
  database: process.env.NODE_ENV === "test" ? testDatabase : database,
};
