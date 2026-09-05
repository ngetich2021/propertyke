"use client";

import { useActionState, useRef, useState } from "react";
import { Mail, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { Modal } from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { inviteStaff, revokeStaffInvite } from "@/lib/actions/invites";
import { DUTY_GROUPS, SECTION_LABEL } from "@/lib/dutyGroups";
import type { InviteStatus } from "@/app/generated/prisma/client";

export type StaffInviteRow = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: InviteStatus;
  customRoleName: string | null;
  createdAt: Date;
};

const STATUS_BADGE: Record<InviteStatus, { label: string; variant: "secondary" | "default" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  REVOKED: { label: "Revoked", variant: "outline" },
};

function InviteStaffButton({ roles }: { roles: { id: string; name: string }[] }) {
  const [state, action] = useActionState(inviteStaff, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [customRoleId, setCustomRoleId] = useState("");

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          formRef.current?.reset();
          setRole("USER");
          setCustomRoleId("");
        }
      }}
    >
      <PopoverTrigger className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
        <Mail size={14} /> Invite staff
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Invite staff</p>
          <PopoverClose
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={14} />
          </PopoverClose>
        </div>
        <form ref={formRef} action={action} className="flex flex-col gap-2.5 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <input
            name="email"
            type="email"
            required
            placeholder="them@example.com"
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {state?.fieldErrors?.email && <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.email[0]}</p>}

          <label className="flex items-center justify-between text-xs font-medium text-zinc-500">
            Role
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="USER">User (with duties)</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          {role === "ADMIN" ? (
            <p className="text-xs text-zinc-500">Admins get every duty automatically.</p>
          ) : (
            <>
              <label className="flex items-center justify-between text-xs font-medium text-zinc-500">
                Custom role
                <select
                  name="roleId"
                  value={customRoleId}
                  onChange={(e) => setCustomRoleId(e.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">None (pick duties below)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              {!customRoleId && (
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
                          <Checkbox name="permissions" value={s} />
                          {SECTION_LABEL.get(s)}
                        </label>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </>
          )}

          {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
          <SubmitButton
            pendingLabel="Sending…"
            className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send invite
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [, action] = useActionState(revokeStaffInvite, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="inviteId" value={inviteId} />
      <SubmitButton
        pendingLabel="…"
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Revoke
      </SubmitButton>
    </form>
  );
}

// Pending/accepted/revoked admin-issued invites (see StaffInvite in
// schema.prisma) -- accepted automatically the moment the invited email
// signs in (lib/invites.ts), no click-through link required.
//
// Collapsed behind a single button + Modal instead of an always-open card:
// this list is usually empty or short, so giving it a permanent chunk of
// the Roles page regardless was mostly wasted vertical space.
export function StaffInvitesManager({
  invites,
  roles,
}: {
  invites: StaffInviteRow[];
  roles: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const pendingCount = invites.filter((i) => i.status === "PENDING").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <Mail size={14} /> Staff invites
        {pendingCount > 0 && <Badge variant="secondary">{pendingCount}</Badge>}
      </button>
      {open && (
        <Modal title="Staff invites" onClose={() => setOpen(false)} maxWidthClassName="max-w-lg">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">Invite someone by email -- access activates the moment they sign in.</p>
              <InviteStaffButton roles={roles} />
            </div>
            {invites.length === 0 ? (
              <p className="text-sm text-zinc-500">No invites sent yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm">{invite.email}</span>
                      <Badge variant={invite.role === "ADMIN" ? "default" : "secondary"}>{invite.role}</Badge>
                      {invite.customRoleName && <Badge variant="outline">{invite.customRoleName}</Badge>}
                      <Badge variant={STATUS_BADGE[invite.status].variant}>{STATUS_BADGE[invite.status].label}</Badge>
                    </div>
                    {invite.status === "PENDING" && <RevokeInviteButton inviteId={invite.id} />}
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
