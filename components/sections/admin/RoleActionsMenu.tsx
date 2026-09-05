"use client";

import { MoreVertical, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { UserAccessEditor } from "./UserAccessEditor";
import type { AdminSectionKey } from "@/lib/nav";
import type { UserRole } from "@/app/generated/prisma/client";

export function RoleActionsMenu({
  userId,
  currentRole,
  currentPermissions,
  currentRoleId,
  roles,
}: {
  userId: string;
  currentRole: UserRole;
  currentPermissions: AdminSectionKey[];
  currentRoleId: string | null;
  roles: { id: string; name: string }[];
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Manage role and duties"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MoreVertical size={16} />
      </PopoverTrigger>
      {/* This popup renders via a portal, so its DOM lives outside the
          table row -- but React still bubbles its synthetic click events
          through the component tree the portal was created in, which
          includes the row's own onClick (see ClickableUserRow). Without
          this, clicking blank space in the popup (not on a button/label
          isInteractiveRowClick already recognizes) would also open that
          row's detail modal. */}
      <PopoverContent align="end" className="w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Manage access</p>
          <PopoverClose
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={14} />
          </PopoverClose>
        </div>
        <div className="border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <UserAccessEditor
            userId={userId}
            currentRole={currentRole}
            currentPermissions={currentPermissions}
            currentRoleId={currentRoleId}
            roles={roles}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
