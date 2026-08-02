"use client";

import { useState } from "react";
import type { Listing } from "@/app/generated/prisma/client";
import { cloudinaryThumb, formatMoney, parseImages } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListingDetailModal } from "@/components/listings/ListingDetailModal";

export function ListingCard({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const images = parseImages(listing.images);
  const thumbnail = images[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 text-left transition-shadow hover:shadow-md dark:border-zinc-800"
      >
        <div className="flex h-36 items-center justify-center bg-zinc-100 dark:bg-zinc-900">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cloudinaryThumb(thumbnail, 300)}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-zinc-400">No image</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold">{listing.title}</h3>
            <StatusBadge status={listing.status} />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{listing.address ?? "Location not set"}</p>
          <p className="mt-auto text-sm font-bold">
            {formatMoney(listing.type === "RENTAL" ? listing.rentPerMonth ?? listing.price : listing.price, listing.currency)}
            {listing.type === "RENTAL" ? " / month" : ""}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {listing.bedrooms != null && `${listing.bedrooms} bed`}
            {listing.bathrooms != null && ` · ${listing.bathrooms} bath`}
            {listing.acreage != null && `${listing.acreage} acres`}
          </p>
        </div>
      </button>

      {open && <ListingDetailModal listingId={listing.id} onClose={() => setOpen(false)} />}
    </>
  );
}
