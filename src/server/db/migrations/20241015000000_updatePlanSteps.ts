import { change } from "../dbScript";

const planningActionTypeValues = ["EditExistingCode", "CreateNewCode"] as [
  string,
  ...string[],
];

change(async (db, up) => {
  if (up) {
    await db.createEnum(
      "planning_action_type_values",
      planningActionTypeValues,
    );
  }

  await db.changeTable("plan_steps", (t) => ({
    type: t.add(t.enum("planning_action_type_values")),
    title: t.add(t.text()),
    isActive: t.add(t.boolean().default(true)),
    dependencies: t.add(t.text().nullable()),
    filePath: t.change(t.text().nullable(), t.text()),
    stepNumber: t.drop(t.integer()),
  }));

  if (!up) {
    await db.dropEnum("planning_action_type_values", planningActionTypeValues);
  }
});
