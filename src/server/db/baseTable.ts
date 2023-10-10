import { createBaseTable } from "orchid-orm";
import { zodSchemaProvider } from "orchid-orm-schema-to-zod";

export const BaseTable = createBaseTable({
  columnTypes: (t) => ({
    ...t,
    text: (min = 0, max = Infinity) => t.text(min, max),
    timestamp: <P extends number>(precision?: P) =>
      t.timestamp<P>(precision).asNumber(),
  }),
  schemaProvider: zodSchemaProvider,
});
