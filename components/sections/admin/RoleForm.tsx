"use client";

import { useActionState } from "react";
import { updateRole } from "@/lib/actions/users";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function RoleForm({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [state, action] = useActionState(updateRole, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <SubmitButton
        pendingLabel="…"
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Update
      </SubmitButton>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
