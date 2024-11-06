import { createBaseTable } from "orchid-orm";
import { zodSchemaProvider } from "orchid-orm-schema-to-zod";

export const BaseTable = createBaseTable({
  columnTypes: (t) => ({
    ...t,
    text: (min: number = 0, max: number = Infinity) => t.text(min, max),
    timestamp: <P extends number>(precision?: P) =>
      t.timestamp<P>(precision).asNumber(),
    bigint: () => t.bigint(),
  }),
  schemaProvider: zodSchemaProvider,
});
