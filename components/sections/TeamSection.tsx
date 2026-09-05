import { getMyTeam, getMyManagedAccounts } from "@/lib/actions/team";
import { parseOwnerScopes } from "@/lib/ownerDuties";
import { TeamManager } from "./TeamManager";

export async function TeamSection() {
  const [{ invites, delegations }, managed] = await Promise.all([getMyTeam(), getMyManagedAccounts()]);

  return (
    <TeamManager
      invites={invites.map((i) => ({ id: i.id, email: i.email, createdAt: i.createdAt }))}
      members={delegations.map((d) => ({
        delegationId: d.id,
        managerName: d.manager.name,
        managerEmail: d.manager.email,
        scopes: parseOwnerScopes(d.scopes),
      }))}
      managedAccounts={managed.map((d) => ({
        ownerName: d.owner.name,
        ownerEmail: d.owner.email,
        ownerBusinessName: d.owner.businessName,
        scopes: parseOwnerScopes(d.scopes),
      }))}
    />
  );
}
