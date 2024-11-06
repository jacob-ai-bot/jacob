import { createBaseTable } from "orchid-orm";
import { zodSchemaProvider } from "orchid-orm-schema-to-zod";

export const BaseTable = createBaseTable({
  columnTypes: (t) => ({
    ...t,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    text: (min: number = 0, max: number = Infinity) => t.text(min, max),
    timestamp: <P extends number>(precision?: P) =>
      t.timestamp<P>(precision).asNumber(),
  }),
  schemaProvider: zodSchemaProvider,
});
