"use server";
import Image from "next/image";
import { cache } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession, UserRole } from "~/server/auth";
import { SignOutButton } from "~/app/_components/SignOutButton";
import { db } from "~/server/db/db";
import { type Project } from "~/server/db/tables/projects.table";
import { type User } from "~/server/db/tables/users.table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/app/_components/ui/table";

const getProjects = cache(async () => {
  return db.projects.order({ repoFullName: "ASC" }).all();
});

const getUsers = cache(async () => {
  return db.users.order({ login: "ASC" }).all();
});

interface ProjectsTableProps {
  projects: Project[];
}

function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <Table className="caption-top">
      <TableCaption>Projects</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Repo</TableHead>
          <TableHead className="text-right">Enabled</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell className="font-medium">{project.id}</TableCell>
            <TableCell>{project.repoFullName}</TableCell>
            <TableCell className="text-right">
              {project.agentEnabled ? "YES" : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface UsersTableProps {
  users: User[];
}

function UsersTable({ users }: UsersTableProps) {
  return (
    <Table className="caption-top">
      <TableCaption>Users</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Login</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Enabled</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.id}</TableCell>
            <TableCell>{user.login}</TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="text-right">
              {user.dashboardEnabled ? "YES" : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function AdminPage() {
  const session = await getServerAuthSession();

  // Redirect if not admin
  if (session?.user?.role !== UserRole.admin) {
    redirect(`/dashboard`);
  }

  const [projects, users] = await Promise.all([getProjects(), getUsers()]);

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
          <div className="grid grid-cols-2">
            <ProjectsTable projects={projects} />
            <UsersTable users={users} />
          </div>
        </div>
      </div>
    </main>
  );
}
