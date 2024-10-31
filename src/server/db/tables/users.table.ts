import { BaseTable } from "../baseTable";
import { UserRole, OnboardingStatus } from "../enums";

const USER_ROLE_VALUES = Object.values(UserRole) as [UserRole, ...UserRole[]];
const ONBOARDING_STATUS_VALUES = Object.values(OnboardingStatus) as [
  OnboardingStatus,
  ...OnboardingStatus[],
];

export class UsersTable extends BaseTable {
  readonly table = "users";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    name: t.varchar(255).nullable(),
    email: t.varchar(255).nullable(),
    emailVerified: t
      .timestamp()
      .nullable()
      .parse((value) => (value ? new Date(value) : value))
      .as(t.integer()),
    image: t.text(0, Infinity).nullable(),
    login: t.text().nullable(),
    role: t.enum("user_role", USER_ROLE_VALUES).default(UserRole.USER),
    onboardingStatus: t
      .enum("onboarding_status", ONBOARDING_STATUS_VALUES)
      .default(OnboardingStatus.NONE),
    jiraToken: t.text().nullable(),
    ...t.timestamps(),
  }));
}
