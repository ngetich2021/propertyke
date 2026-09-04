export type Tab = "lands" | "properties" | "rentals" | "account";

// The listing category a given browsing tab corresponds to, if any --
// used to scope the header ad slot to whatever's actually being browsed.
export const TAB_LISTING_TYPE = {
  lands: "LAND",
  properties: "PROPERTY",
  rentals: "RENTAL",
} as const;

export type AccountTab =
  | "overview"
  | "orders"
  | "advertise"
  | "add-property"
  | "settings"
  | "admin";

export type AdminSectionKey =
  | "roles"
  | "revenue"
  | "ads"
  | "users"
  | "lands"
  | "properties"
  | "housetolet"
  | "reports"
  | "orders"
  | "support"
  | "tours"
  | "health";

export const BASE_TABS: { key: Tab; label: string }[] = [
  { key: "lands", label: "Lands" },
  { key: "properties", label: "properties" },
  { key: "rentals", label: "rentals" },
  { key: "account", label: "account" },
];

export const ACCOUNT_TABS: { key: AccountTab; label: string }[] = [
  { key: "overview", label: "overview" },
  { key: "orders", label: "orders" },
  { key: "advertise", label: "advertise" },
  { key: "add-property", label: "add property" },
  { key: "settings", label: "settings" },
];

export const ADMIN_SECTIONS: { key: AdminSectionKey; label: string }[] = [
  { key: "roles", label: "roles" },
  { key: "revenue", label: "revenue" },
  { key: "ads", label: "ads" },
  { key: "users", label: "users" },
  { key: "lands", label: "lands" },
  { key: "properties", label: "properties" },
  { key: "housetolet", label: "housetolet" },
  { key: "reports", label: "reports" },
  { key: "orders", label: "orders" },
  { key: "support", label: "support" },
  { key: "tours", label: "tours" },
  { key: "health", label: "health" },
];

export function isTab(value: string | undefined): value is Tab {
  return BASE_TABS.some((t) => t.key === value);
}

export function isAccountTab(value: string | undefined): value is AccountTab {
  return [...ACCOUNT_TABS, { key: "admin" as const }].some((t) => t.key === value);
}

export function isAdminSection(value: string | undefined): value is AdminSectionKey {
  return ADMIN_SECTIONS.some((s) => s.key === value);
}
