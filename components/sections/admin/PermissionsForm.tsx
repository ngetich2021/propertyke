"use client";

import { useActionState } from "react";
import { updatePermissions } from "@/lib/actions/users";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { DELEGABLE_SECTIONS } from "@/lib/permissions";
import { ADMIN_SECTIONS } from "@/lib/nav";

const DELEGABLE_LABELS = ADMIN_SECTIONS.filter((s) => DELEGABLE_SECTIONS.includes(s.key));

// Lets an admin hand a regular USER access to specific admin sections
// (see lib/permissions.ts) without making them a full ADMIN. Only rendered
// for non-admin rows -- an ADMIN already has every duty implicitly.
export function PermissionsForm({
  userId,
  currentPermissions,
}: {
  userId: string;
  currentPermissions: string[];
}) {
  const [state, action] = useActionState(updatePermissions, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <input type="hidden" name="userId" value={userId} />
      {DELEGABLE_LABELS.map((s) => (
        <label key={s.key} className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            name="permissions"
            value={s.key}
            defaultChecked={currentPermissions.includes(s.key)}
          />
          {s.label}
        </label>
      ))}
      <SubmitButton
        pendingLabel="…"
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Save
      </SubmitButton>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
