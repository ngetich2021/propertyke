"use client";

import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import type { User } from "@/app/generated/prisma/client";

export function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <Modal title="User details" onClose={onClose}>
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">{user.name ?? "—"}</h3>
            <p className="text-zinc-500">{user.email}</p>
          </div>
          <StatusBadge status={user.role} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Phone</p>
            {user.phone ? (
              <RevealPhoneButton phone={user.phone} className="underline" />
            ) : (
              <p className="text-zinc-500">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Business name</p>
            <p>{user.businessName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Joined</p>
            <p>{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">User ID</p>
            <p className="truncate text-zinc-500" title={user.id}>
              {user.id}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
