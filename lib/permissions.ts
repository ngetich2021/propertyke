import { ADMIN_SECTIONS, type AdminSectionKey } from "@/lib/nav";

// "roles" (who gets which duties) is never delegable -- only a full ADMIN
// can hand out or revoke duties, so a delegated staff account can never
// escalate itself or grant others access. See the `permissions` field on
// User in prisma/schema.prisma.
export const DELEGABLE_SECTIONS: AdminSectionKey[] = ADMIN_SECTIONS.filter(
  (s) => s.key !== "roles"
).map((s) => s.key);

export function parsePermissions(permissions: string): AdminSectionKey[] {
  try {
    const parsed = JSON.parse(permissions);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is AdminSectionKey => DELEGABLE_SECTIONS.includes(p));
  } catch {
    return [];
  }
}

type PermissionUser = {
  role: string;
  permissions: string;
  // Present (possibly null) wherever a caller fetched the relation; absent
  // callers (e.g. an assignee lookup that didn't `include` it) are treated
  // as "no custom role", falling back to `permissions` -- see call sites.
  customRole?: { permissions: string } | null;
};

// An ADMIN has every duty implicitly. Anyone else uses their assigned named
// Role's duties if they have one, otherwise whatever's been delegated to
// them ad hoc (and never "roles" -- see DELEGABLE_SECTIONS).
export function getAccessibleSections(user: PermissionUser): AdminSectionKey[] {
  if (user.role === "ADMIN") return ADMIN_SECTIONS.map((s) => s.key);
  if (user.customRole) return parsePermissions(user.customRole.permissions);
  return parsePermissions(user.permissions);
}

export function hasSectionAccess(user: PermissionUser, section: AdminSectionKey): boolean {
  return getAccessibleSections(user).includes(section);
}
