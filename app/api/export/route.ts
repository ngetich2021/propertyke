import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/dal";
import { parseAdMedia } from "@/lib/adMedia";
import type { ListingType } from "@/app/generated/prisma/client";

function toXlsxResponse(filename: string, rows: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function adminListingsRows(type: ListingType) {
  const listings = await prisma.listing.findMany({
    where: { type },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });
  return listings.map((l) => ({
    ID: l.id,
    Title: l.title,
    Owner: l.owner.name ?? "",
    OwnerEmail: l.owner.email,
    OwnerPhone: l.owner.phone ?? "",
    Price: l.price,
    Currency: l.currency,
    Status: l.status,
    Address: l.address ?? "",
    Days: l.days,
    FeeAmount: l.feeAmount ?? "",
    LiveUntil: l.endDate ? l.endDate.toISOString() : "",
    Created: l.createdAt.toISOString(),
  }));
}

export async function GET(request: NextRequest) {
  const dataset = request.nextUrl.searchParams.get("dataset");

  switch (dataset) {
    case "users": {
      await requireAdmin();
      const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
      return toXlsxResponse(
        "users.xlsx",
        users.map((u) => ({
          ID: u.id,
          Name: u.name ?? "",
          Email: u.email,
          Phone: u.phone ?? "",
          Role: u.role,
          Joined: u.createdAt.toISOString(),
        }))
      );
    }
    case "ads": {
      await requireAdmin();
      const ads = await prisma.ad.findMany({
        include: { listing: true, owner: true },
        orderBy: { createdAt: "desc" },
      });
      return toXlsxResponse(
        "ads.xlsx",
        ads.map((a) => ({
          ID: a.id,
          Company: a.companyName ?? "",
          Product: a.productName ?? "",
          Description: a.productDescription ?? "",
          Contact: a.companyContact ?? "",
          Listing: a.listing.title,
          Owner: a.owner.email,
          Amount: a.amount,
          Days: a.days,
          Target: a.targetMode === "EVERYWHERE" ? "Everywhere (2x)" : `${a.targetRadiusKm}km radius`,
          Repeat: a.repeatEnabled ? `${a.repeatCount}x/day` : "No",
          MediaCount: parseAdMedia(a.media).length,
          Status: a.status,
          LiveUntil: a.endDate ? a.endDate.toISOString() : "",
          Created: a.createdAt.toISOString(),
        }))
      );
    }
    case "payments": {
      await requireAdmin();
      const payments = await prisma.payment.findMany({
        where: { status: "SUCCESS" },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
      const SOURCE_LABEL: Record<string, string> = {
        LISTING_CREATE: "Listing",
        LISTING_EXTEND: "Listing addition",
        AD_CREATE: "Ads",
        AD_EXTEND: "Ads addition",
        VERIFICATION: "Verification",
      };
      return toXlsxResponse(
        "payments.xlsx",
        payments.map((p) => ({
          Time: p.createdAt.toISOString(),
          Name: p.user.name ?? p.user.email,
          Tel: p.phone,
          MpesaCode: p.mpesaReceipt ?? "",
          Source: SOURCE_LABEL[p.purpose] ?? p.purpose,
          Amount: p.amount,
        }))
      );
    }
    case "reports": {
      await requireAdmin();
      const reports = await prisma.report.findMany({
        include: { listing: { include: { owner: true } }, reporter: true },
        orderBy: { createdAt: "desc" },
      });
      return toXlsxResponse(
        "reports.xlsx",
        reports.map((r) => ({
          ID: r.id,
          Listing: r.listing.title,
          ListingOwnerEmail: r.listing.owner.email,
          ListingOwnerPhone: r.listing.owner.phone ?? "",
          Reporter: r.reporter.email,
          ReporterPhone: r.reporter.phone ?? "",
          Reason: r.reason,
          Status: r.status,
          Created: r.createdAt.toISOString(),
        }))
      );
    }
    case "lands":
      await requireAdmin();
      return toXlsxResponse("lands.xlsx", await adminListingsRows("LAND"));
    case "properties":
      await requireAdmin();
      return toXlsxResponse("properties.xlsx", await adminListingsRows("PROPERTY"));
    case "housetolet":
      await requireAdmin();
      return toXlsxResponse("housetolet.xlsx", await adminListingsRows("RENTAL"));
    case "orders": {
      await requireAdmin();
      const orders = await prisma.order.findMany({
        include: { listing: { include: { owner: true } }, buyer: true },
        orderBy: { createdAt: "desc" },
      });
      return toXlsxResponse(
        "orders.xlsx",
        orders.map((o) => ({
          ID: o.id,
          Listing: o.listing.title,
          Buyer: o.buyer.email,
          BuyerPhone: o.contactPhone,
          PreferredContact: o.contactMethod,
          Seller: o.listing.owner.email,
          Amount: o.amount,
          Status: o.status,
          Message: o.message ?? "",
          Created: o.createdAt.toISOString(),
        }))
      );
    }
    case "my-orders": {
      const user = await requireUser();
      const [asBuyer, asOwner] = await Promise.all([
        prisma.order.findMany({
          where: { buyerId: user.id },
          include: { listing: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.order.findMany({
          where: { listing: { ownerId: user.id } },
          include: { listing: true, buyer: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      return toXlsxResponse("my-orders.xlsx", [
        ...asBuyer.map((o) => ({
          Role: "Buyer",
          Listing: o.listing.title,
          Counterparty: "",
          Amount: o.amount,
          Status: o.status,
          Created: o.createdAt.toISOString(),
        })),
        ...asOwner.map((o) => ({
          Role: "Owner",
          Listing: o.listing.title,
          Counterparty: o.buyer.email,
          Amount: o.amount,
          Status: o.status,
          Created: o.createdAt.toISOString(),
        })),
      ]);
    }
    case "my-ads": {
      const user = await requireUser();
      const ads = await prisma.ad.findMany({
        where: { ownerId: user.id },
        include: { listing: true },
        orderBy: { createdAt: "desc" },
      });
      return toXlsxResponse(
        "my-ads.xlsx",
        ads.map((a) => ({
          Product: a.productName ?? "",
          Listing: a.listing.title,
          Amount: a.amount,
          Days: a.days,
          MediaCount: parseAdMedia(a.media).length,
          Status: a.status,
          LiveUntil: a.endDate ? a.endDate.toISOString() : "",
          Created: a.createdAt.toISOString(),
        }))
      );
    }
    default:
      return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });
  }
}
