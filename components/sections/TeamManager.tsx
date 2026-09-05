"use client";

import { useActionState, useRef } from "react";
import { UserPlus, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  inviteTeamMember,
  revokeTeamInvite,
  updateTeamMemberScopes,
  removeTeamMember,
} from "@/lib/actions/team";
import { OWNER_DUTIES, type OwnerDutyKey } from "@/lib/ownerDuties";

export type TeamInviteRow = { id: string; email: string; createdAt: Date };
export type TeamMemberRow = {
  delegationId: string;
  managerName: string | null;
  managerEmail: string;
  scopes: OwnerDutyKey[];
};
export type ManagedAccountRow = {
  ownerName: string | null;
  ownerEmail: string;
  ownerBusinessName: string | null;
  scopes: OwnerDutyKey[];
};

function DutyCheckboxes({ defaultScopes }: { defaultScopes: OwnerDutyKey[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {OWNER_DUTIES.map((d) => (
        <label key={d.key} className="flex items-start gap-2 text-sm">
          <Checkbox name="scopes" value={d.key} defaultChecked={defaultScopes.includes(d.key)} className="mt-0.5" />
          <span>
            {d.label}
            <span className="block text-xs text-zinc-500">{d.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function InviteTeamMemberButton() {
  const [state, action] = useActionState(inviteTeamMember, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) formRef.current?.reset();
      }}
    >
      <PopoverTrigger className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
        <UserPlus size={14} /> Invite to your team
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Invite to your team</p>
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
          <p className="text-xs font-medium text-zinc-500">What can they help with?</p>
          <DutyCheckboxes defaultScopes={[]} />
          {state?.fieldErrors?.scopes && <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.scopes[0]}</p>}
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
  const [, action] = useActionState(revokeTeamInvite, undefined);
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

function TeamMemberCard({ member }: { member: TeamMemberRow }) {
  const [scopesState, scopesAction] = useActionState(updateTeamMemberScopes, undefined);
  const [removeState, removeAction] = useActionState(removeTeamMember, undefined);

  return (
    <div className="rounded-md border border-zinc-200 p-2.5 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{member.managerName ?? member.managerEmail}</p>
          <p className="truncate text-xs text-zinc-500">{member.managerEmail}</p>
        </div>
        <form action={removeAction}>
          <input type="hidden" name="delegationId" value={member.delegationId} />
          <SubmitButton
            pendingLabel="…"
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Remove
          </SubmitButton>
        </form>
      </div>
      <form action={scopesAction} className="flex items-end justify-between gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
        <input type="hidden" name="delegationId" value={member.delegationId} />
        <DutyCheckboxes defaultScopes={member.scopes} />
        <SubmitButton
          pendingLabel="…"
          className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save
        </SubmitButton>
      </form>
      {scopesState?.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{scopesState.error}</p>}
      {removeState?.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{removeState.error}</p>}
    </div>
  );
}

// Your own team (people you've invited to help manage YOUR listings/ads/
// orders -- see OwnerInvite/OwnerDelegation in schema.prisma) plus, further
// down, a read-only list of any other accounts you yourself help manage.
// Entirely independent of the site-wide admin Roles system.
export function TeamManager({
  invites,
  members,
  managedAccounts,
}: {
  invites: TeamInviteRow[];
  members: TeamMemberRow[];
  managedAccounts: ManagedAccountRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Your team</h3>
            <p className="text-xs text-zinc-500">
              Invite people to help manage your listings, ads, or orders -- they keep their own account, this
              just adds yours alongside theirs.
            </p>
          </div>
          <InviteTeamMemberButton />
        </div>

        {invites.length > 0 && (
          <div className="mb-2 flex flex-col gap-1.5">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-2 rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700"
              >
                <span className="flex items-center gap-2">
                  {invite.email}
                  <Badge variant="secondary">Pending</Badge>
                </span>
                <RevokeInviteButton inviteId={invite.id} />
              </div>
            ))}
          </div>
        )}

        {members.length === 0 && invites.length === 0 ? (
          <p className="text-sm text-zinc-500">No team members yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <TeamMemberCard key={member.delegationId} member={member} />
            ))}
          </div>
        )}
      </div>

      {managedAccounts.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <h3 className="mb-2.5 text-sm font-semibold">Accounts you help manage</h3>
          <div className="flex flex-col gap-1.5">
            {managedAccounts.map((acc) => (
              <div
                key={acc.ownerEmail}
                className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm dark:border-zinc-800"
              >
                <span>{acc.ownerBusinessName ?? acc.ownerName ?? acc.ownerEmail}</span>
                <span className="flex gap-1">
                  {acc.scopes.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Their listings, ads, and orders show up alongside yours in Add property, Advertise, and Orders,
            wherever you&apos;ve been granted access.
          </p>
        </div>
      )}
    </div>
  );
}
