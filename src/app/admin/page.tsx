"use server";
import Image from "next/image";
import { cache } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession, UserRole } from "~/server/auth";
import { SignOutButton } from "~/app/_components/SignOutButton";
import { db } from "~/server/db/db";
import { DataTable } from "~/app/_components/ui/data-table";
import { projectColumns } from "./projectColumns";
import { userColumns } from "./userColumns";

const getProjects = cache(() => {
  return db.projects.order({ repoFullName: "ASC" }).all();
});

const getUsers = cache(async () => {
  const users = await db.users.order({ login: "ASC" }).all();
  const usersWithAccounts = await Promise.all(
    users.map(async (user) => {
      const account = await db.accounts.findByOptional({ userId: user.id });
      return {
        ...user,
        isTeamAdmin: account?.isTeamAdmin ?? false,
        teamAdminAccountId: account?.teamAdminAccountId ?? null,
        accountId: account?.id ?? null,
      };
    }),
  );
  return usersWithAccounts;
});

export default async function AdminPage() {
  const session = await getServerAuthSession();

  // Redirect if not admin
  if (session?.user?.role !== UserRole.admin) {
    redirect(`/dashboard`);
  }

  const [projects, users] = await Promise.all([getProjects(), getUsers()]);

  const teamAdmins = users
    .filter((user) => user.isTeamAdmin)
    .map((user) => ({
      accountId: user.accountId,
      name: user.name ?? user.login ?? "N/A",
    }));

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted p-4">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-background shadow-xl">
        <div className="p-12">
          <div className="mb-8 flex w-full flex-row items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-2">
              <Image
                src="/images/logo.svg"
                width={160}
                height={160}
                alt="JACoB Logo"
              />
              <h1 className="font-crimson text-4xl font-bold tracking-tight text-accent-foreground">
                Admin
              </h1>
            </div>
            <div className="flex flex-row items-center gap-4">
              <Link
                className="rounded-lg bg-blueGray-700 px-6 py-3 text-center text-sm font-medium text-white shadow-md transition duration-300 ease-in-out hover:bg-indigo-700"
                href="/dashboard"
              >
                Dashboard
              </Link>

              <p className="text-lg text-muted-foreground">
                Logged in as{" "}
                <span className="font-semibold">{session.user?.name}</span>
              </p>

              <SignOutButton />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <DataTable
              caption="Projects"
              columns={projectColumns}
              data={projects}
            />
            <DataTable
              caption="Users"
              columns={userColumns}
              data={users}
              meta={{ teamAdmins }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
