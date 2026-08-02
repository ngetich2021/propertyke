"use client";

import { cloudinaryThumb, formatMoney, parseImages } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type ListingSummary = {
  id: string;
  type: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  rentPerMonth: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  acreage: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string;
  status: string;
};

export function ListingPreviewCard({
  listing,
  onOpenDetails,
}: {
  listing: ListingSummary;
  // The caller owns the detail-modal state (it usually lives inside another
  // popup that this card gets unmounted alongside, so the modal can't be a
  // child of this component or it would unmount with it too).
  onOpenDetails: () => void;
}) {
  const thumbnail = parseImages(listing.images)[0];

  return (
    <div className="flex gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cloudinaryThumb(thumbnail, 160)}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] text-zinc-400">No image</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold">{listing.title}</p>
          <StatusBadge status={listing.status} />
        </div>
        {listing.address && <p className="truncate text-xs text-zinc-500">{listing.address}</p>}
        <p className="text-sm font-bold">
          {formatMoney(listing.type === "RENTAL" ? listing.rentPerMonth ?? listing.price : listing.price, listing.currency)}
          {listing.type === "RENTAL" ? " / month" : ""}
        </p>
        <p className="text-xs text-zinc-500">
          {listing.bedrooms != null && `${listing.bedrooms} bed`}
          {listing.bathrooms != null && ` · ${listing.bathrooms} bath`}
          {listing.acreage != null && `${listing.acreage} acres`}
        </p>
        <button
          type="button"
          onClick={onOpenDetails}
          className="mt-1 inline-block text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
        >
          View full details &rarr;
        </button>
      </div>
    </div>
  );
}
