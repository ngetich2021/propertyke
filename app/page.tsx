import { ListingTypeSection } from "@/components/sections/ListingTypeSection";
import { AccountSection } from "@/components/sections/AccountSection";
import { isTab, isAccountTab, isAdminSection, type Tab, type AccountTab, type AdminSectionKey } from "@/lib/nav";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; atab?: string; section?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = isTab(params.tab) ? params.tab : "lands";
  const atab: AccountTab = isAccountTab(params.atab) ? params.atab : "overview";
  const section: AdminSectionKey = isAdminSection(params.section) ? params.section : "roles";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <TabContent tab={tab} atab={atab} section={section} />
    </main>
  );
}

function TabContent({
  tab,
  atab,
  section,
}: {
  tab: Tab;
  atab: AccountTab;
  section: AdminSectionKey;
}) {
  switch (tab) {
    case "lands":
      return <ListingTypeSection type="LAND" />;
    case "properties":
      return <ListingTypeSection type="PROPERTY" />;
    case "rentals":
      return <ListingTypeSection type="RENTAL" />;
    case "account":
      return <AccountSection atab={atab} section={section} />;
  }
}
