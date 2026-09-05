"use client";

import { useActionState, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateRole, updatePermissions } from "@/lib/actions/users";
import { assignCustomRole } from "@/lib/actions/customRoles";
import { DUTY_GROUPS, SECTION_LABEL } from "@/lib/dutyGroups";
import type { AdminSectionKey } from "@/lib/nav";
import type { UserRole } from "@/app/generated/prisma/client";

// The Role (User/Admin) + named custom role + ad-hoc duty controls, shared
// by RoleActionsMenu (the Roles panel's per-user popover) and
// UserActionsMenu (the Users panel's per-user popover) -- both need the
// exact same access-editing UI, just embedded under a different header.
export function UserAccessEditor({
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
  const [roleState, roleAction] = useActionState(updateRole, undefined);
  const [permState, permAction] = useActionState(updatePermissions, undefined);
  const [customRoleState, customRoleAction] = useActionState(assignCustomRole, undefined);
  // Tracks the select's live value (not just the saved one) so the duties
  // section below switches between "pick a role" and "check ad-hoc duties"
  // the moment you choose, instead of only after hitting Save.
  const [selectedRoleId, setSelectedRoleId] = useState(currentRoleId ?? "");
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div>
      <form action={roleAction} className="flex items-center justify-between gap-2 pb-2.5">
        <input type="hidden" name="userId" value={userId} />
        <span className="text-xs font-medium text-zinc-500">Role</span>
        <div className="flex items-center gap-1.5">
          <select
            name="role"
            defaultValue={currentRole}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <SubmitButton
            pendingLabel="…"
            className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save
          </SubmitButton>
        </div>
      </form>
      {roleState?.error && <p className="pb-2 text-xs text-red-600 dark:text-red-400">{roleState.error}</p>}

      {currentRole === "ADMIN" ? (
        <p className="border-t border-zinc-200 pt-2.5 text-xs text-zinc-500 dark:border-zinc-800">
          Admins have every duty automatically.
        </p>
      ) : (
        <div className="border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <form action={customRoleAction} className="flex items-center justify-between gap-2 pb-2.5">
            <input type="hidden" name="userId" value={userId} />
            <span className="text-xs font-medium text-zinc-500">Custom role</span>
            <div className="flex items-center gap-1.5">
              <select
                name="roleId"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">None (ad-hoc duties)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <SubmitButton
                pendingLabel="…"
                className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save
              </SubmitButton>
            </div>
          </form>
          {customRoleState?.error && (
            <p className="pb-2 text-xs text-red-600 dark:text-red-400">{customRoleState.error}</p>
          )}

          {selectedRole ? (
            <p className="border-t border-zinc-200 pt-2.5 text-xs text-zinc-500 dark:border-zinc-800">
              Duties come from the &ldquo;{selectedRole.name}&rdquo; role. Manage what it can access from the
              Custom roles list on the Roles tab.
            </p>
          ) : (
            <form action={permAction} className="border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
              <input type="hidden" name="userId" value={userId} />
              <p className="mb-2 text-xs font-medium text-zinc-500">Delegated duties</p>
              <Tabs defaultValue={DUTY_GROUPS[0].key}>
                <TabsList className="w-full">
                  {DUTY_GROUPS.map((g) => (
                    <TabsTrigger key={g.key} value={g.key} className="flex-1">
                      {g.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {DUTY_GROUPS.map((g) => (
                  <TabsContent key={g.key} value={g.key} className="flex flex-col gap-1.5 pt-2.5">
                    {g.sections.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <Checkbox name="permissions" value={s} defaultChecked={currentPermissions.includes(s)} />
                        {SECTION_LABEL.get(s)}
                      </label>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
              {permState?.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{permState.error}</p>}
              <SubmitButton
                pendingLabel="Saving…"
                className="mt-2.5 w-full rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save duties
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
