"use client";

import { useActionState, useId, useState } from "react";
import { createListing, updateListing, getAddressSuggestion } from "@/lib/actions/listings";
import { uploadImageToCloudinary } from "@/lib/uploadImage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { Spinner } from "@/components/ui/Spinner";
import { LocationPicker } from "@/components/listings/LocationPicker";
import { cloudinaryThumb, parseImages } from "@/lib/format";
import type { LatLng } from "@/lib/geolocation";
import type { ActionState } from "@/lib/schemas";
import type { Listing, ListingType } from "@/app/generated/prisma/client";

export function ListingForm({
  listing,
  hasBusinessName,
  onCreated,
}: {
  listing?: Listing;
  // Only enforced when creating (see createListing) -- editing an existing
  // listing never re-checks it, so it can't lock an owner out of their own
  // content over a profile field they filled in after posting.
  hasBusinessName?: boolean;
  // Called once the listing is created -- lets the caller (a Modal) close
  // itself. Listings are free and go live immediately, so this fires right
  // after a successful submit instead of waiting on a payment gate.
  onCreated?: () => void;
}) {
  const id = useId();
  const isEdit = !!listing;
  async function submit(prevState: ActionState, formData: FormData) {
    const result = await (isEdit ? updateListing : createListing)(prevState, formData);
    if (result?.success && !isEdit) onCreated?.();
    return result;
  }
  const [state, action] = useActionState(submit, undefined);
  const [type, setType] = useState<ListingType>(listing?.type ?? "LAND");
  const [location, setLocation] = useState<LatLng | null>(
    listing?.latitude != null && listing?.longitude != null
      ? { lat: listing.latitude, lng: listing.longitude }
      : null
  );
  const [images, setImages] = useState<string[]>(listing ? parseImages(listing.images) : []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [address, setAddress] = useState(listing?.address ?? "");
  const [addressLoading, setAddressLoading] = useState(false);
  const requiresBusinessName = !isEdit && (type === "PROPERTY" || type === "RENTAL") && hasBusinessName === false;

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
      <FormErrorBanner message={state?.error} />
      {isEdit && <input type="hidden" name="listingId" value={listing.id} />}
      <div>
        <label htmlFor={`${id}-type`} className="mb-1 block text-sm font-medium">
          Type
        </label>
        <select
          id={`${id}-type`}
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ListingType)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="LAND">Land</option>
          <option value="PROPERTY">Property (developed land + house, for sale)</option>
          <option value="RENTAL">Rental / house to let</option>
        </select>
        {requiresBusinessName && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Add a business/company name in Settings before listing a property or rental.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-title`} className="mb-1 block text-sm font-medium">
          Title
        </label>
        <input
          id={`${id}-title`}
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
        <label htmlFor={`${id}-description`} className="mb-1 block text-sm font-medium">
          Description
        </label>
        <textarea
          id={`${id}-description`}
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

      <div>
        <label htmlFor={`${id}-price`} className="mb-1 block text-sm font-medium">
          {type === "RENTAL" ? "Deposit / price" : "Price"} (KES)
        </label>
        <input
          id={`${id}-price`}
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
        {/* Not a `<label>` -- LocationPicker is a map widget, not a single
            labelable form control, so a `for`-less label would just be a
            dangling a11y association. */}
        <span className="mb-1 block text-sm font-medium">Location</span>
        <LocationPicker value={location} onChange={handleLocationChange} />
        <input type="hidden" name="latitude" value={location?.lat ?? ""} />
        <input type="hidden" name="longitude" value={location?.lng ?? ""} />
      </div>

      <div>
        <label htmlFor={`${id}-address`} className="mb-1 block text-sm font-medium">
          Address
        </label>
        <input
          id={`${id}-address`}
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={200}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {addressLoading ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <Spinner className="h-3 w-3" /> Filling in from the map…
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">
            Auto-filled from the pin dropped above — still editable.
          </p>
        )}
      </div>

      {(type === "LAND" || type === "PROPERTY") && (
        <div>
          <label htmlFor={`${id}-acreage`} className="mb-1 block text-sm font-medium">
            Acreage
          </label>
          <input
            id={`${id}-acreage`}
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
            <label htmlFor={`${id}-bedrooms`} className="mb-1 block text-sm font-medium">
              Bedrooms
            </label>
            <input
              id={`${id}-bedrooms`}
              name="bedrooms"
              type="number"
              defaultValue={listing?.bedrooms ?? undefined}
              min="0"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor={`${id}-bathrooms`} className="mb-1 block text-sm font-medium">
              Bathrooms
            </label>
            <input
              id={`${id}-bathrooms`}
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
          <label htmlFor={`${id}-rentPerMonth`} className="mb-1 block text-sm font-medium">
            Rent per month (KES)
          </label>
          <input
            id={`${id}-rentPerMonth`}
            name="rentPerMonth"
            type="number"
            defaultValue={listing?.rentPerMonth ?? undefined}
            min="0"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-images`} className="mb-1 block text-sm font-medium">
          Images
        </label>
        <input
          id={`${id}-images`}
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
      {state?.success && isEdit && (
        <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>
      )}
      <SubmitButton pendingLabel={isEdit ? "Saving…" : "Posting…"} disabled={uploading || requiresBusinessName}>
        {isEdit ? "Save changes" : "Post listing"}
      </SubmitButton>
    </form>
  );
}
