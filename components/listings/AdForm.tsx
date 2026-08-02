"use client";

import { useActionState, useMemo, useState } from "react";
import { createAd, updateAd } from "@/lib/actions/ads";
import { uploadToCloudinary } from "@/lib/uploadImage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { Spinner } from "@/components/ui/Spinner";
import { LocationPicker } from "@/components/listings/LocationPicker";
import {
  calculateAdDailyRate,
  AD_BASE_DAILY_RATE,
  AD_TYPE_RATE,
  AD_REPEAT_SURCHARGE,
  AD_EVERYWHERE_MULTIPLIER,
} from "@/lib/adPricing";
import { formatMoney } from "@/lib/format";
import { parseAdMedia } from "@/lib/adMedia";
import { checkAdEligibility } from "@/lib/adEligibility";
import type { LatLng } from "@/lib/geolocation";
import type { Ad, AdTargetMode, Listing } from "@/app/generated/prisma/client";

type MediaRow = {
  id: string;
  type: "youtube" | "cloudinary";
  value: string;
  uploading: boolean;
};

function newRow(): MediaRow {
  return { id: crypto.randomUUID(), type: "youtube", value: "", uploading: false };
}

export function AdForm({
  listings,
  ad,
  advertiser,
}: {
  listings: Listing[];
  ad?: Ad;
  // Only meaningful when creating (editing already has the ad's own saved
  // companyName/companyContact) -- auto-fills the company fields from
  // Settings so the advertiser isn't retyping the same business name/phone
  // on every single ad. Still just a default: both fields stay editable.
  advertiser?: { businessName: string | null; phone: string | null };
}) {
  const isEdit = !!ad;
  const [state, action] = useActionState(isEdit ? updateAd : createAd, undefined);
  const [rows, setRows] = useState<MediaRow[]>(
    ad
      ? parseAdMedia(ad.media).map((m) => ({
          id: crypto.randomUUID(),
          type: m.type,
          value: m.url,
          uploading: false,
        }))
      : [newRow()]
  );
  const [listingId] = useState(ad?.listingId ?? listings[0]?.id ?? "");
  const [targetMode, setTargetMode] = useState<AdTargetMode>(ad?.targetMode ?? "EVERYWHERE");
  const [targetLocation, setTargetLocation] = useState<LatLng | null>(
    ad?.targetLatitude != null && ad?.targetLongitude != null
      ? { lat: ad.targetLatitude, lng: ad.targetLongitude }
      : null
  );
  const [targetRadiusKm, setTargetRadiusKm] = useState(String(ad?.targetRadiusKm ?? 10));
  const [repeatEnabled, setRepeatEnabled] = useState(ad?.repeatEnabled ?? false);
  const [repeatCount, setRepeatCount] = useState(String(ad?.repeatCount ?? 2));
  const [days, setDays] = useState(String(ad?.days ?? 1));

  const selectedListing = listings.find((l) => l.id === listingId);
  const dailyRate = useMemo(
    () => (selectedListing ? calculateAdDailyRate(selectedListing.type, repeatEnabled, targetMode) : 0),
    [selectedListing, repeatEnabled, targetMode]
  );
  const daysNum = Math.max(1, Math.trunc(Number(days)) || 1);
  const total = dailyRate * daysNum;
  const anyUploading = rows.some((r) => r.uploading);

  // Advertising can only run as long as the promoted listing's own paid
  // days last -- this just hints at that before submitting; the server
  // (checkAdEligibility/capAdDays, called from createAd/updateAd) recomputes
  // and caps for real regardless of what's shown here.
  const eligibility = selectedListing ? checkAdEligibility(selectedListing) : null;
  const listingRemainingDays = eligibility?.eligible ? eligibility.remainingDays : 0;

  function updateRow(id: string, patch: Partial<MediaRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleUpload(id: string, file: File | undefined) {
    if (!file) return;
    updateRow(id, { uploading: true });
    try {
      const url = await uploadToCloudinary(file, "ads");
      updateRow(id, { value: url, uploading: false });
    } catch {
      updateRow(id, { uploading: false });
    }
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {isEdit && <input type="hidden" name="adId" value={ad.id} />}
      <div>
        <label className="mb-1 block text-xs font-medium">Listing</label>
        {isEdit ? (
          <>
            <input type="hidden" name="listingId" value={listingId} />
            <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {selectedListing?.title ?? "—"}
            </p>
          </>
        ) : (
          <select
            name="listingId"
            defaultValue={listingId}
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        )}
        <FieldError messages={state?.fieldErrors?.listingId} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Company name</label>
          <input
            name="companyName"
            defaultValue={ad?.companyName ?? advertiser?.businessName ?? ""}
            required
            maxLength={120}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldError messages={state?.fieldErrors?.companyName} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Company contact</label>
          <input
            name="companyContact"
            defaultValue={ad?.companyContact ?? advertiser?.phone ?? ""}
            placeholder="Phone or email"
            required
            maxLength={200}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldError messages={state?.fieldErrors?.companyContact} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Product name</label>
        <input
          name="productName"
          defaultValue={ad?.productName ?? ""}
          required
          maxLength={120}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.productName} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Product description</label>
        <textarea
          name="productDescription"
          defaultValue={ad?.productDescription ?? ""}
          rows={3}
          required
          maxLength={2000}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.productDescription} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Days to run</label>
        <input
          name="days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.days} />
        {listingRemainingDays === 0 && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            This listing&apos;s daily rate isn&apos;t currently paid up -- extend it in My Listings before
            advertising it.
          </p>
        )}
        {listingRemainingDays !== null && listingRemainingDays !== 0 && daysNum > listingRemainingDays && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            This listing only has {listingRemainingDays} day{listingRemainingDays === 1 ? "" : "s"} of paid time
            left -- the ad will be capped to that unless you extend the listing first.
          </p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="repeatEnabled"
            checked={repeatEnabled}
            onChange={(e) => setRepeatEnabled(e.target.checked)}
          />
          Repeat this ad through the day (+{formatMoney(AD_REPEAT_SURCHARGE)})
        </label>
        {repeatEnabled && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <label htmlFor="repeatCount">Repeat this many times a day:</label>
            <input
              id="repeatCount"
              name="repeatCount"
              type="number"
              min={1}
              value={repeatCount}
              onChange={(e) => setRepeatCount(e.target.value)}
              className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          Videos over 5 minutes replay this many times a day; shorter videos just loop
          continuously either way.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Target audience</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="targetMode"
              value="EVERYWHERE"
              checked={targetMode === "EVERYWHERE"}
              onChange={() => setTargetMode("EVERYWHERE")}
            />
            Everywhere ({AD_EVERYWHERE_MULTIPLIER}x price)
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="targetMode"
              value="SELECT"
              checked={targetMode === "SELECT"}
              onChange={() => setTargetMode("SELECT")}
            />
            Select a region (local rate)
          </label>
        </div>
        {targetMode === "SELECT" && (
          <div className="mt-2 flex flex-col gap-2">
            <LocationPicker value={targetLocation} onChange={setTargetLocation} />
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="targetRadiusKm">Radius (km):</label>
              <input
                id="targetRadiusKm"
                type="number"
                min={1}
                step="any"
                value={targetRadiusKm}
                onChange={(e) => setTargetRadiusKm(e.target.value)}
                className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            {targetLocation && (
              <>
                <input type="hidden" name="targetLatitude" value={targetLocation.lat} />
                <input type="hidden" name="targetLongitude" value={targetLocation.lng} />
                <input type="hidden" name="targetRadiusKm" value={targetRadiusKm} />
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="font-medium">
          Cost: {formatMoney(dailyRate)} / day × {daysNum} day{daysNum === 1 ? "" : "s"} ={" "}
          {formatMoney(total)}
        </p>
        {selectedListing && (
          <p className="text-xs text-zinc-500">
            {formatMoney(AD_BASE_DAILY_RATE)} base + {formatMoney(AD_TYPE_RATE[selectedListing.type])}{" "}
            {selectedListing.type.toLowerCase()} listing
            {repeatEnabled && ` + ${formatMoney(AD_REPEAT_SURCHARGE)} repeat`}
            {targetMode === "EVERYWHERE" && `, ×${AD_EVERYWHERE_MULTIPLIER} for airing everywhere`}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium">Media (YouTube link or upload)</label>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, newRow()])}
            className="text-xs text-zinc-500 underline"
          >
            + Add media
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <select
                value={row.type}
                onChange={(e) =>
                  updateRow(row.id, {
                    type: e.target.value as MediaRow["type"],
                    value: "",
                  })
                }
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="youtube">YouTube URL</option>
                <option value="cloudinary">Upload</option>
              </select>

              {row.type === "youtube" ? (
                <input
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              ) : (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleUpload(row.id, e.target.files?.[0])}
                    disabled={row.uploading}
                    className="flex-1 text-xs"
                  />
                  {row.uploading && (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Spinner className="h-3.5 w-3.5" /> Uploading…
                    </span>
                  )}
                  {!row.uploading && row.value && <span className="text-xs text-green-600">✓</span>}
                </div>
              )}

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label="Remove media"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                ✕
              </button>

              {row.value && (
                <>
                  <input type="hidden" name="mediaType" value={row.type} />
                  <input type="hidden" name="mediaUrl" value={row.value} />
                </>
              )}
            </div>
          ))}
        </div>
        <FieldError messages={state?.fieldErrors?.mediaUrl} />
      </div>

      {anyUploading && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Wait for the upload to finish before submitting.
        </p>
      )}
      <SubmitButton pendingLabel="Submitting…" disabled={anyUploading}>
        {isEdit ? "Save changes" : "Advertise"}
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && (
        <p className="text-xs text-green-600 dark:text-green-400">
          {isEdit ? "Saved. Your ad has been sent back for admin review." : "Ad submitted for review."}
        </p>
      )}
      {state?.notice && <p className="text-xs text-amber-600 dark:text-amber-400">{state.notice}</p>}
    </form>
  );
}
