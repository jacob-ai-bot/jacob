"use client";
import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { trpcClient } from "~/trpc/client";
import { type User } from "~/server/db/tables/users.table";
import { Button } from "~/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/app/_components/ui/dropdown-menu";

export const userColumns: ColumnDef<
  User & {
    isTeamAdmin: boolean;
    teamAdminAccountId: number | null;
    accountId: number | null;
  }
>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "login",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Login
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "dashboardEnabled",
    header: "Enabled",
  },
  {
    accessorKey: "isTeamAdmin",
    header: "Is Team Admin",
    cell: ({ row }) => (row.original.isTeamAdmin ? "Yes" : "No"),
  },
  {
    accessorKey: "teamAdminAccountId",
    header: "Team Admin",
    cell: ({ row }) => {
      const teamAdmins = row.table.options.meta.teamAdmins as Array<{
        accountId: number;
        name: string;
      }>;
      const { id, teamAdminAccountId } = row.original;

      return (
        <select
          value={teamAdminAccountId ?? ""}
          onChange={async (e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            await trpcClient.users.setTeamAdminAccountId.mutate({
              userId: id,
              teamAdminAccountId: value,
            });
            window.location.reload();
          }}
        >
          <option value="">None</option>
          {teamAdmins.map((admin) => (
            <option key={admin.accountId} value={admin.accountId}>
              {admin.name}
            </option>
          ))}
        </select>
      );
    },
  },
  {
    id: "actions",
    size: 1,
    cell: ({ row }) => {
      const { id, dashboardEnabled, isTeamAdmin, accountId } = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                await trpcClient.users.setDashboardEnabled.mutate({
                  id,
                  enabled: !dashboardEnabled,
                });
                // Since we don't have a client-side parent component, we just refresh for now
                window.location.reload();
              }}
            >
              {dashboardEnabled ? "Disable Dashboard" : "Enable Dashboard"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                if (!accountId) return;
                await trpcClient.users.setIsTeamAdmin.mutate({
                  userId: id,
                  isTeamAdmin: !isTeamAdmin,
                });
                window.location.reload();
              }}
            >
              {isTeamAdmin ? "Unset Team Admin" : "Set as Team Admin"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
