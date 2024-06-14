import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("users", (t) => ({
    onboardingStatus: t.enum("onboarding_status").default("none"),
  }));
});
