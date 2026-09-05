"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { Modal } from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createCustomRole, updateCustomRole, deleteCustomRole } from "@/lib/actions/customRoles";
import { DUTY_GROUPS, SECTION_LABEL } from "@/lib/dutyGroups";
import type { AdminSectionKey } from "@/lib/nav";

export type RoleWithUserCount = { id: string; name: string; permissions: AdminSectionKey[]; userCount: number };

function PopoverHeaderRow({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between pb-1">
      <p className="text-sm font-semibold">{title}</p>
      <PopoverClose
        aria-label="Close"
        className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <X size={14} />
      </PopoverClose>
    </div>
  );
}

function DutyCheckboxes({ defaultPermissions }: { defaultPermissions: AdminSectionKey[] }) {
  return (
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
              <Checkbox name="permissions" value={s} defaultChecked={defaultPermissions.includes(s)} />
              {SECTION_LABEL.get(s)}
            </label>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function NameField({ error, defaultValue }: { error?: string; defaultValue?: string }) {
  return (
    <>
      <input
        name="name"
        required
        defaultValue={defaultValue}
        placeholder="Role name, e.g. Support agent"
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}

function CreateRoleButton() {
  const [state, action] = useActionState(createCustomRole, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) formRef.current?.reset();
      }}
    >
      <PopoverTrigger className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
        <Plus size={14} /> New role
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeaderRow title="New role" />
        <form ref={formRef} action={action} className="flex flex-col gap-2.5 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <NameField error={state?.fieldErrors?.name?.[0]} />
          <DutyCheckboxes defaultPermissions={[]} />
          {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
          <SubmitButton
            pendingLabel="Creating…"
            className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Create role
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function EditRoleButton({ role }: { role: RoleWithUserCount }) {
  const [state, action] = useActionState(updateCustomRole, undefined);

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Edit ${role.name}`}
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <Pencil size={14} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeaderRow title="Edit role" />
        <form action={action} className="flex flex-col gap-2.5 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <input type="hidden" name="roleId" value={role.id} />
          <NameField error={state?.fieldErrors?.name?.[0]} defaultValue={role.name} />
          <DutyCheckboxes defaultPermissions={role.permissions} />
          {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
          <SubmitButton
            pendingLabel="Saving…"
            className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save changes
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function DeleteRoleButton({ role }: { role: RoleWithUserCount }) {
  const [state, action] = useActionState(deleteCustomRole, undefined);

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Delete ${role.name}`}
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
      >
        <Trash2 size={14} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-medium">Delete &ldquo;{role.name}&rdquo;?</p>
        <p className="mt-1 text-xs text-zinc-500">
          {role.userCount > 0
            ? `${role.userCount} ${role.userCount === 1 ? "person" : "people"} assigned this role will fall back to their own individually delegated duties.`
            : "No one is currently assigned this role."}
        </p>
        {state?.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        <form action={action} className="mt-2.5 flex justify-end gap-2">
          <input type="hidden" name="roleId" value={role.id} />
          <PopoverClose className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Cancel
          </PopoverClose>
          <SubmitButton
            pendingLabel="Deleting…"
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// Reusable, named duty sets an ADMIN manages here once and then assigns to
// any number of USER accounts from that user's own row (see
// RoleActionsMenu's "Custom role" select) -- the alternative to picking
// ad-hoc duties one person at a time.
//
// Collapsed behind a single button + Modal instead of an always-open card:
// this list is usually empty or short, so giving it a permanent chunk of
// the Roles page regardless was mostly wasted vertical space.
export function CustomRolesManager({ roles }: { roles: RoleWithUserCount[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <Plus size={14} /> Custom roles
        {roles.length > 0 && <Badge variant="secondary">{roles.length}</Badge>}
      </button>
      {open && (
        <Modal title="Custom roles" onClose={() => setOpen(false)} maxWidthClassName="max-w-lg">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">Reusable duty sets, assignable to any user from their row&apos;s menu.</p>
              <CreateRoleButton />
            </div>
            {roles.length === 0 ? (
              <p className="text-sm text-zinc-500">No custom roles yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge variant="secondary">{role.name}</Badge>
                      <span className="truncate text-xs text-zinc-500">
                        {role.permissions.length === 0
                          ? "No duties yet"
                          : role.permissions.map((p) => SECTION_LABEL.get(p)).join(", ")}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {role.userCount} {role.userCount === 1 ? "user" : "users"}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <EditRoleButton role={role} />
                      <DeleteRoleButton role={role} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
