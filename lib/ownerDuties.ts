// The delegable duties for an individual (non-admin) account's own "Team"
// (see OwnerInvite/OwnerDelegation in schema.prisma) -- entirely separate
// from AdminSectionKey/DELEGABLE_SECTIONS, which govern site-wide admin
// access. These three map to the actual owner-facing surfaces that exist
// today: My listings, Advertise, and the Owner tab of Orders.
export type OwnerDutyKey = "listings" | "ads" | "orders";

export const OWNER_DUTIES: { key: OwnerDutyKey; label: string; description: string }[] = [
  { key: "listings", label: "Listings", description: "Create, edit, and reactivate your listings." },
  { key: "ads", label: "Ads", description: "Create, edit, and extend your ad campaigns." },
  { key: "orders", label: "Orders", description: "View and respond to inquiries on your listings." },
];

const OWNER_DUTY_KEYS: OwnerDutyKey[] = OWNER_DUTIES.map((d) => d.key);

export function parseOwnerScopes(scopes: string): OwnerDutyKey[] {
  try {
    const parsed = JSON.parse(scopes);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is OwnerDutyKey => OWNER_DUTY_KEYS.includes(p));
  } catch {
    return [];
  }
}
