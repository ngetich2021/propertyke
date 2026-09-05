"use client";

import { useActionState } from "react";
import { MoreVertical, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { UserAccessEditor } from "./UserAccessEditor";
import { updateUserProfileAsAdmin } from "@/lib/actions/users";
import type { AdminSectionKey } from "@/lib/nav";
import type { UserRole } from "@/app/generated/prisma/client";

export function UserActionsMenu({
  userId,
  currentName,
  currentPhone,
  currentBusinessName,
  currentRole,
  currentPermissions,
  currentRoleId,
  roles,
  showAccessEditor,
}: {
  userId: string;
  currentName: string | null;
  currentPhone: string | null;
  currentBusinessName: string | null;
  currentRole: UserRole;
  currentPermissions: AdminSectionKey[];
  currentRoleId: string | null;
  roles: { id: string; name: string }[];
  // Role/duty changes are a privilege-escalation risk, so unlike the profile
  // fields above (open to anyone with the delegable "users" duty), this part
  // is admin-only -- same rule as "roles" itself never being delegable (see
  // DELEGABLE_SECTIONS). A non-admin "users"-duty holder simply doesn't see
  // this section rather than seeing controls that would fail to save.
  showAccessEditor: boolean;
}) {
  const [profileState, profileAction] = useActionState(updateUserProfileAsAdmin, undefined);

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Manage user"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MoreVertical size={16} />
      </PopoverTrigger>
      {/* See RoleActionsMenu for why popup clicks need stopPropagation --
          same portal-bubbles-through-the-component-tree issue applies here. */}
      <PopoverContent align="end" className="w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Manage user</p>
          <PopoverClose
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={14} />
          </PopoverClose>
        </div>

        <form action={profileAction} className="flex flex-col gap-1.5 border-t border-zinc-200 pt-2.5 pb-2.5 dark:border-zinc-800">
          <input type="hidden" name="userId" value={userId} />
          <label className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500">
            Name
            <input
              name="name"
              required
              defaultValue={currentName ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          {profileState?.fieldErrors?.name && (
            <p className="text-xs text-red-600 dark:text-red-400">{profileState.fieldErrors.name[0]}</p>
          )}
          <label className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500">
            Phone
            <input
              name="phone"
              defaultValue={currentPhone ?? ""}
              placeholder="+254…"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          {profileState?.fieldErrors?.phone && (
            <p className="text-xs text-red-600 dark:text-red-400">{profileState.fieldErrors.phone[0]}</p>
          )}
          <label className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500">
            Business name
            <input
              name="businessName"
              defaultValue={currentBusinessName ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          {profileState?.fieldErrors?.businessName && (
            <p className="text-xs text-red-600 dark:text-red-400">{profileState.fieldErrors.businessName[0]}</p>
          )}
          {profileState?.error && <p className="text-xs text-red-600 dark:text-red-400">{profileState.error}</p>}
          <SubmitButton
            pendingLabel="Saving…"
            className="mt-1 self-end rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save profile
          </SubmitButton>
        </form>

        {showAccessEditor && (
          <div className="border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
            <UserAccessEditor
              userId={userId}
              currentRole={currentRole}
              currentPermissions={currentPermissions}
              currentRoleId={currentRoleId}
              roles={roles}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
