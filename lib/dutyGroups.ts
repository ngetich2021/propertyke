import { ADMIN_SECTIONS, type AdminSectionKey } from "@/lib/nav";

// The 12 delegable duties (everything but "roles" -- see lib/permissions.ts)
// grouped into three tabs purely for browsability, shared by the per-user
// duty editor (RoleActionsMenu) and the named-role editor (CustomRolesManager)
// so both present the exact same groupings.
export const DUTY_GROUPS: { key: string; label: string; sections: AdminSectionKey[] }[] = [
  { key: "listings", label: "Listings", sections: ["lands", "properties", "housetolet", "ads", "reports"] },
  { key: "customers", label: "Customers", sections: ["users", "orders", "support", "tours", "feedback"] },
  { key: "insights", label: "Insights", sections: ["revenue", "health"] },
];

export const SECTION_LABEL = new Map(ADMIN_SECTIONS.map((s) => [s.key, s.label]));
