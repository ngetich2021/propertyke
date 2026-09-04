import { requireUser } from "@/lib/dal";
import { ACCOUNT_TABS, ADMIN_SECTIONS, type AccountTab, type AdminSectionKey } from "@/lib/nav";
import { getAccessibleSections } from "@/lib/permissions";
import { NavLink } from "@/components/layout/AppNav";
import { AccountOverview } from "@/components/sections/account/AccountOverview";
import { OrdersSection } from "@/components/sections/OrdersSection";
import { AdvertiseSection } from "@/components/sections/AdvertiseSection";
import { AddPropertySection } from "@/components/sections/AddPropertySection";
import { SettingsSection } from "@/components/sections/SettingsSection";
import { AdminSection } from "@/components/sections/admin/AdminSection";
import { getPendingAdCount } from "@/lib/actions/ads";
import { getPendingReportCount } from "@/lib/actions/reports";
import { getPendingListingCount } from "@/lib/actions/listings";

export async function AccountSection({
  atab,
  section,
}: {
  atab: AccountTab;
  section: AdminSectionKey;
}) {
  const user = await requireUser();
  const accessibleSections = getAccessibleSections(user);
  const canSeeAdmin = accessibleSections.length > 0;
  const visibleSections = ADMIN_SECTIONS.filter((s) => accessibleSections.includes(s.key));
  // A staff account delegated e.g. only "reports" has no business landing on
  // "roles" -- the page-level default (see app/page.tsx) and the nav link
  // below both point there, so fall back to whatever this user can actually
  // see instead of bouncing them out via requireSection's redirect.
  const effectiveSection = accessibleSections.includes(section) ? section : accessibleSections[0];

  const counts: Partial<Record<AdminSectionKey, number>> =
    canSeeAdmin && atab === "admin"
      ? await (async () => {
          const [ads, reports, lands, properties, housetolet] = await Promise.all([
            getPendingAdCount(),
            getPendingReportCount(),
            getPendingListingCount("LAND"),
            getPendingListingCount("PROPERTY"),
            getPendingListingCount("RENTAL"),
          ]);
          return { ads, reports, lands, properties, housetolet };
        })()
      : {};

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <NavLink href="/?tab=account&atab=overview" active={atab === "overview"}>
          overview
        </NavLink>
        {ACCOUNT_TABS.filter((t) => t.key !== "overview").map((t) => (
          <NavLink key={t.key} href={`/?tab=account&atab=${t.key}`} active={atab === t.key}>
            {t.label}
          </NavLink>
        ))}
        {canSeeAdmin && (
          <NavLink
            href={`/?tab=account&atab=admin&section=${effectiveSection}`}
            active={atab === "admin"}
            danger
          >
            admin
          </NavLink>
        )}
      </div>

      {canSeeAdmin && atab === "admin" && (
        <div className="flex flex-wrap items-center gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          {visibleSections.map((s) => (
            <NavLink
              key={s.key}
              href={`/?tab=account&atab=admin&section=${s.key}`}
              active={effectiveSection === s.key}
            >
              {s.label}
              {!!counts[s.key] && ` (${counts[s.key]})`}
            </NavLink>
          ))}
        </div>
      )}

      {atab === "overview" && <AccountOverview user={user} />}
      {atab === "orders" && <OrdersSection />}
      {atab === "advertise" && <AdvertiseSection />}
      {atab === "add-property" && <AddPropertySection />}
      {atab === "settings" && <SettingsSection user={user} />}
      {atab === "admin" && canSeeAdmin && <AdminSection section={effectiveSection} />}
    </div>
  );
}
