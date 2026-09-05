import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { getManagedOwnerIds } from "@/lib/ownerAccess";
import { OwnerOrdersTable, BuyerOrdersTable } from "./OrdersTables";

export async function OrdersSection() {
  const user = await requireUser();
  const managedOwnerIds = await getManagedOwnerIds(user.id, "orders");
  // A team member (see OwnerDelegation) with the "orders" duty sees a
  // merged view: inquiries on their own listings plus every owner's who
  // granted them that duty -- each row's actual owner is shown via
  // OwnerOrdersTable's badge.
  const ownerIds = [user.id, ...managedOwnerIds];

  const [asBuyer, asOwner] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: user.id },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { listing: { ownerId: { in: ownerIds } } },
      include: { listing: { include: { owner: true } }, buyer: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <DownloadExcelLink dataset="my-orders" />
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">Orders received on your listings</h3>
        <p className="mb-2 text-xs text-zinc-500">Click a row for buyer contact details and to update its status.</p>
        <OwnerOrdersTable orders={asOwner} currentUserId={user.id} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">Your inquiries</h3>
        <p className="mb-2 text-xs text-zinc-500">Click a row for full details.</p>
        <BuyerOrdersTable orders={asBuyer} />
      </section>
    </div>
  );
}
