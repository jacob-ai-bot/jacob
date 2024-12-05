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

export const userColumns: ColumnDef<User>[] = [
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
    header: "Team Admin Status",
    cell: ({ row }) => {
      const { id, isTeamAdmin } = row.original;
      const [enabled, setEnabled] = React.useState(isTeamAdmin);

      const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        setEnabled(newValue);
        await trpcClient.users.setIsTeamAdmin.mutate({
          userId: id,
          enabled: newValue,
        });
        window.location.reload();
      };

      return (
        <input type="checkbox" checked={enabled} onChange={handleChange} />
      );
    },
  },
  {
    id: "teamAdmin",
    header: "Assigned Team Admin",
    cell: ({ row }) => {
      const { id, teamAdminAccountId } = row.original;
      const [selectedTeamAdminId, setSelectedTeamAdminId] = React.useState(
        teamAdminAccountId || "",
      );
      const [teamAdmins, setTeamAdmins] = React.useState<
        { accountId: number; name: string }[]
      >([]);

      React.useEffect(() => {
        const fetchTeamAdmins = async () => {
          const data = await trpcClient.users.getTeamAdmins.query();
          setTeamAdmins(data);
        };
        fetchTeamAdmins();
      }, []);

      const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTeamAdminId =
          e.target.value !== "" ? parseInt(e.target.value) : null;
        setSelectedTeamAdminId(e.target.value);
        await trpcClient.users.setTeamAdminAccountId.mutate({
          userId: id,
          teamAdminAccountId: newTeamAdminId,
        });
        window.location.reload();
      };

      return (
        <select value={selectedTeamAdminId} onChange={handleChange}>
          <option value="">Select Team Admin</option>
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
      const { id, dashboardEnabled } = row.original;

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
              {dashboardEnabled ? "Disable" : "Enable"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
