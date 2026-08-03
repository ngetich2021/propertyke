"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteAd } from "@/lib/actions/ads";
import { formatMoney } from "@/lib/format";
import { parseAdMedia } from "@/lib/adMedia";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { AdForm } from "@/components/listings/AdForm";
import { ExtendAdForm } from "@/components/listings/ExtendAdForm";
import type { Ad, Listing, User } from "@/app/generated/prisma/client";

// `owner` is only present when opened from the admin Ads panel -- an owner
// viewing their own ad already knows who posted it.
type AdWithListing = Ad & { listing: Listing; owner?: User };

// Mirrors ListingDetailModal's edit/delete UX, but for the owner's own ads
// -- opened from a clickable row in "Your ads" (see ClickableAdRow), so the
// ad is already in hand and doesn't need a separate fetch.
export function AdDetailModal({ ad, onClose }: { ad: AdWithListing; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleDelete() {
    const formData = new FormData();
    formData.set("adId", ad.id);
    startDelete(async () => {
      await deleteAd(formData);
      onClose();
    });
  }

  const media = parseAdMedia(ad.media);

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-detail-heading"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl outline-none dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="ad-detail-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Ad details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            ×
          </button>
        </div>

        {!editing && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold">{ad.productName ?? "—"}</h1>
                <p className="text-sm text-zinc-500">Promoting: {ad.listing.title}</p>
              </div>
              <StatusBadge status={ad.status} />
            </div>

            {ad.productDescription && <p className="mt-2 text-sm">{ad.productDescription}</p>}

            {ad.owner && (
              <div className="mt-3 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Posted by</p>
                <p>{ad.owner.name ?? "—"}</p>
                <p className="text-zinc-500">{ad.owner.email}</p>
                {ad.owner.phone && (
                  <a href={`tel:${ad.owner.phone}`} className="underline">
                    📞 {ad.owner.phone}
                  </a>
                )}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-500">
              <p>Company: {ad.companyName ?? "—"}</p>
              <p>Contact: {ad.companyContact ?? "—"}</p>
              <p>
                Target: {ad.targetMode === "EVERYWHERE" ? "Everywhere (2x)" : `${ad.targetRadiusKm}km radius`}
              </p>
              <p>Repeat: {ad.repeatEnabled ? `${ad.repeatCount}x/day` : "No"}</p>
              <p>Days paid: {ad.days}</p>
              <p>Total: {formatMoney(ad.amount, ad.listing.currency)}</p>
              <p>Media: {media.length} item{media.length === 1 ? "" : "s"}</p>
              {ad.endDate && (
                <p>
                  {ad.status === "ACTIVE" ? "Live until" : "Ran until"}:{" "}
                  {new Date(ad.endDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {ad.adminNote && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Note from admin: {ad.adminNote}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Edit ad
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
              >
                {isDeleting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner className="h-3.5 w-3.5" /> Deleting…
                  </span>
                ) : (
                  "Delete ad"
                )}
              </button>
            </div>

            {(ad.status === "ACTIVE" || ad.status === "EXPIRED") && (
              <div className="mt-3">
                <ExtendAdForm ad={ad} listingType={ad.listing.type} currency={ad.listing.currency} />
              </div>
            )}
          </>
        )}

        {editing && (
          <div className="flex flex-col gap-2">
            <AdForm listings={[ad.listing]} ad={ad} />
            <button onClick={() => setEditing(false)} className="w-fit text-xs text-zinc-500 underline">
              Cancel editing
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
