"use client";
import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { trpcClient } from "~/trpc/client";
import { type Project } from "~/server/db/tables/projects.table";
import { Button } from "~/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/app/_components/ui/dropdown-menu";

export const projectColumns: ColumnDef<Project>[] = [
  {
    accessorKey: "id",
    header: "ID",
    size: 4,
  },
  {
    accessorKey: "repoFullName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Repo
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "agentEnabled",
    header: "Enabled",
    size: 4,
  },
  {
    id: "actions",
    size: 1,
    cell: ({ row }) => {
      const { id, agentEnabled } = row.original;

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
                await trpcClient.projects.setAgentEnabled.mutate({
                  id,
                  enabled: !agentEnabled,
                });
                // Since we don't have a client-side parent component, we just refresh for now
                window.location.reload();
              }}
            >
              {agentEnabled ? "Disable" : "Enable"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
