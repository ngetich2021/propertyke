"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { getListingDetail, deleteListing } from "@/lib/actions/listings";
import { cloudinaryThumb, formatMoney, parseImages } from "@/lib/format";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListingLocationMap } from "@/components/listings/ListingLocationMap";
import { InterestForm } from "@/components/listings/InterestForm";
import { ReportForm } from "@/components/listings/ReportForm";
import { EditListingToggle } from "@/components/listings/EditListingToggle";
import { Spinner } from "@/components/ui/Spinner";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

type Detail = Awaited<ReturnType<typeof getListingDetail>>;

export function ListingDetailModal({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | undefined>(undefined);
  const [isDeleting, startDelete] = useTransition();
  const [showMap, setShowMap] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  useEffect(() => {
    let cancelled = false;
    getListingDetail(listingId).then((data) => {
      if (!cancelled) setDetail(data);
    });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleDelete() {
    const formData = new FormData();
    formData.set("listingId", listingId);
    startDelete(async () => {
      await deleteListing(formData);
      onClose();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-detail-heading"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl outline-none dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="listing-detail-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Listing details
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

        {detail === undefined && (
          <div className="flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            <Spinner className="h-5 w-5" /> Loading…
          </div>
        )}

        {detail === null && <p className="text-sm text-zinc-500">This listing is no longer available.</p>}

        {detail && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {parseImages(detail.listing.images).length > 0 ? (
                parseImages(detail.listing.images).map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={cloudinaryThumb(url, 600)}
                    alt={detail.listing.title}
                    loading="lazy"
                    className="h-32 w-full rounded-lg object-cover"
                  />
                ))
              ) : (
                <div className="col-span-full flex h-32 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900">
                  No images
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{detail.listing.title}</h1>
                <p className="text-sm text-zinc-500">{detail.listing.address ?? "Location not set"}</p>
              </div>
              <StatusBadge status={detail.listing.status} />
            </div>

            <p className="mt-2 text-lg font-semibold">
              {formatMoney(
                detail.listing.type === "RENTAL" ? detail.listing.rentPerMonth ?? detail.listing.price : detail.listing.price,
                detail.listing.currency
              )}
              {detail.listing.type === "RENTAL" ? " / month" : ""}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              {detail.listing.bedrooms != null && <span>{detail.listing.bedrooms} bed</span>}
              {detail.listing.bathrooms != null && <span>{detail.listing.bathrooms} bath</span>}
              {detail.listing.acreage != null && <span>{detail.listing.acreage} acres</span>}
              {detail.nearbyTown && <span>Near {detail.nearbyTown}</span>}
              {detail.listing.latitude != null && detail.listing.longitude != null && (
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  className="font-medium text-zinc-700 underline dark:text-zinc-300"
                >
                  📍 {showMap ? "Hide map" : "View on map"}
                </button>
              )}
            </div>

            {showMap && detail.listing.latitude != null && detail.listing.longitude != null && (
              <div className="mt-2">
                <ListingLocationMap latitude={detail.listing.latitude} longitude={detail.listing.longitude} />
              </div>
            )}

            <p className="mt-4 whitespace-pre-line text-sm">{detail.listing.description}</p>

            <div className="mt-4 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <p className="flex items-center gap-1.5">
                Listed by{" "}
                <span className="font-medium">
                  {detail.listing.owner.businessName ?? detail.listing.owner.name ?? "the owner"}
                </span>
                <VerifiedBadge verifiedUntil={detail.listing.owner.verifiedUntil} />
              </p>
              {detail.isAdmin && !detail.isOwner && (
                <p className="text-xs text-zinc-500">{detail.listing.owner.email}</p>
              )}
              {!detail.isOwner && (
                detail.listing.owner.phone ? (
                  <RevealPhoneButton phone={detail.listing.owner.phone} />
                ) : (
                  <p className="mt-1 text-xs text-zinc-400">No phone number on file — use the form below.</p>
                )
              )}
            </div>

            {(detail.isOwner || detail.isAdmin) && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {(detail.isOwner || detail.isAdmin) && <EditListingToggle listing={detail.listing} />}
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
                      "Delete listing"
                    )}
                  </button>
                </div>
              </div>
            )}

            {!detail.isOwner && !detail.isAdmin && (
              <div className="mt-6 max-w-sm rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="mb-2 text-sm font-semibold">Interested?</h2>
                {detail.signedIn ? (
                  <InterestForm
                    listingId={detail.listing.id}
                    price={detail.listing.price}
                    defaultPhone={detail.viewerPhone}
                  />
                ) : (
                  <p className="text-sm text-zinc-500">
                    <button
                      type="button"
                      onClick={() => signIn("google")}
                      className="underline"
                    >
                      Sign in
                    </button>{" "}
                    to make an order on this listing.
                  </p>
                )}
              </div>
            )}

            {detail.signedIn && !detail.isOwner && !detail.isAdmin && (
              <div className="mt-3">
                <ReportForm listingId={detail.listing.id} />
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
