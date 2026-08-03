import { requireAdmin } from "@/lib/dal";
import type { AdminSectionKey } from "@/lib/nav";
import { RolesPanel } from "./RolesPanel";
import { RevenuePanel } from "./RevenuePanel";
import { AdsPanel } from "./AdsPanel";
import { UsersPanel } from "./UsersPanel";
import { AdminListingsPanel } from "./AdminListingsPanel";
import { ReportsPanel } from "./ReportsPanel";
import { AdminOrdersPanel } from "./AdminOrdersPanel";

export async function AdminSection({ section }: { section: AdminSectionKey }) {
  await requireAdmin();

  switch (section) {
    case "roles":
      return <RolesPanel />;
    case "revenue":
      return <RevenuePanel />;
    case "ads":
      return <AdsPanel />;
    case "users":
      return <UsersPanel />;
    case "lands":
      return <AdminListingsPanel type="LAND" />;
    case "properties":
      return <AdminListingsPanel type="PROPERTY" />;
    case "housetolet":
      return <AdminListingsPanel type="RENTAL" />;
    case "reports":
      return <ReportsPanel />;
    case "orders":
      return <AdminOrdersPanel />;
  }
}
