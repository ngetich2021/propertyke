"use client";

import { useActionState, useState } from "react";
import { createListing, updateListing, getAddressSuggestion } from "@/lib/actions/listings";
import { uploadImageToCloudinary } from "@/lib/uploadImage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { Spinner } from "@/components/ui/Spinner";
import { LocationPicker } from "@/components/listings/LocationPicker";
import { cloudinaryThumb, formatMoney, parseImages } from "@/lib/format";
import { LISTING_DAILY_RATE, calculateListingFee } from "@/lib/listingPricing";
import type { LatLng } from "@/lib/geolocation";
import type { Listing, ListingType } from "@/app/generated/prisma/client";

export function ListingForm({ listing }: { listing?: Listing }) {
  const isEdit = !!listing;
  const [state, action] = useActionState(isEdit ? updateListing : createListing, undefined);
  const [type, setType] = useState<ListingType>(listing?.type ?? "LAND");
  const [location, setLocation] = useState<LatLng | null>(
    listing?.latitude != null && listing?.longitude != null
      ? { lat: listing.latitude, lng: listing.longitude }
      : null
  );
  const [images, setImages] = useState<string[]>(listing ? parseImages(listing.images) : []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [days, setDays] = useState(String(listing?.days ?? 30));
  const daysNum = Math.max(1, Math.trunc(Number(days)) || 1);
  const fee = calculateListingFee(type, daysNum);
  const [address, setAddress] = useState(listing?.address ?? "");
  const [addressLoading, setAddressLoading] = useState(false);

  // Picking a point on the map already pins down where this is -- typing
  // the address out by hand right after is the same information twice, so
  // fill it in automatically from the picked point. Still just a starting
  // point: the field stays editable for anyone who wants to refine it.
  async function handleLocationChange(coords: LatLng) {
    setLocation(coords);
    setAddressLoading(true);
    try {
      const suggested = await getAddressSuggestion(coords.lat, coords.lng);
      if (suggested) setAddress(suggested);
    } finally {
      setAddressLoading(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await Promise.all(
        Array.from(files)
          .slice(0, 10 - images.length)
          .map((file) => uploadImageToCloudinary(file))
      );
      setImages((prev) => [...prev, ...uploaded]);
    } catch {
      setUploadError("Image upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {isEdit && <input type="hidden" name="listingId" value={listing.id} />}
      <div>
        <label className="mb-1 block text-sm font-medium">Type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ListingType)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="LAND">Land</option>
          <option value="PROPERTY">Property (developed land + house, for sale)</option>
          <option value="RENTAL">Rental / house to let</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          name="title"
          defaultValue={listing?.title}
          required
          minLength={3}
          maxLength={120}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.title} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          name="description"
          defaultValue={listing?.description}
          required
          minLength={10}
          maxLength={4000}
          rows={4}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.description} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {type === "RENTAL" ? "Deposit / price" : "Price"} (KES)
          </label>
          <input
            name="price"
            type="number"
            defaultValue={listing?.price}
            min="0"
            step="any"
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldError messages={state?.fieldErrors?.price} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <input
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {addressLoading && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
              <Spinner className="h-3 w-3" /> Filling in from the map…
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Days to keep live</label>
        <input
          name="days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.days} />
        <p className="mt-1 text-xs text-zinc-500">
          Listing fee: {formatMoney(LISTING_DAILY_RATE[type])} / day × {daysNum} day{daysNum === 1 ? "" : "s"} ={" "}
          {formatMoney(fee)}. Unpaid renewal after this window takes the listing down automatically; you can
          delete it anytime or pay to extend it while it&apos;s live.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Location</label>
        <LocationPicker value={location} onChange={handleLocationChange} />
        <input type="hidden" name="latitude" value={location?.lat ?? ""} />
        <input type="hidden" name="longitude" value={location?.lng ?? ""} />
      </div>

      {(type === "LAND" || type === "PROPERTY") && (
        <div>
          <label className="mb-1 block text-sm font-medium">Acreage</label>
          <input
            name="acreage"
            type="number"
            defaultValue={listing?.acreage ?? undefined}
            step="any"
            min="0"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}

      {(type === "PROPERTY" || type === "RENTAL") && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Bedrooms</label>
            <input
              name="bedrooms"
              type="number"
              defaultValue={listing?.bedrooms ?? undefined}
              min="0"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bathrooms</label>
            <input
              name="bathrooms"
              type="number"
              defaultValue={listing?.bathrooms ?? undefined}
              min="0"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
      )}

      {type === "RENTAL" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Rent per month (KES)</label>
          <input
            name="rentPerMonth"
            type="number"
            defaultValue={listing?.rentPerMonth ?? undefined}
            min="0"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Images</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || images.length >= 10}
          className="text-sm"
        />
        {uploading && (
          <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <Spinner className="h-3.5 w-3.5" /> Uploading…
          </p>
        )}
        {uploadError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cloudinaryThumb(url, 128)} alt="" className="h-16 w-16 rounded object-cover" />
                <input type="hidden" name="images" value={url} />
              </div>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Wait for the image upload to finish before submitting.
        </p>
      )}
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {isEdit
            ? "Saved. Your listing has been sent back for admin review."
            : "Listing submitted for admin review."}
        </p>
      )}
      <SubmitButton pendingLabel="Publishing…" disabled={uploading}>
        {isEdit ? "Save changes" : "Add property"}
      </SubmitButton>
    </form>
  );
}
