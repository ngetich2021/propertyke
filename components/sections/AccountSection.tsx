import { requireUser } from "@/lib/dal";
import { ACCOUNT_TABS, ADMIN_SECTIONS, type AccountTab, type AdminSectionKey } from "@/lib/nav";
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
  const isAdmin = user.role === "ADMIN";

  const counts: Partial<Record<AdminSectionKey, number>> =
    isAdmin && atab === "admin"
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
        {isAdmin && (
          <NavLink
            href="/?tab=account&atab=admin&section=roles"
            active={atab === "admin"}
            danger
          >
            admin
          </NavLink>
        )}
      </div>

      {isAdmin && atab === "admin" && (
        <div className="flex flex-wrap items-center gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          {ADMIN_SECTIONS.map((s) => (
            <NavLink
              key={s.key}
              href={`/?tab=account&atab=admin&section=${s.key}`}
              active={section === s.key}
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
      {atab === "admin" && <AdminSection section={section} />}
    </div>
  );
}
