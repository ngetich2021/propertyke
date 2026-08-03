"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { initiateAdPayment, updateAd } from "@/lib/actions/ads";
import { uploadToCloudinary } from "@/lib/uploadImage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { Spinner } from "@/components/ui/Spinner";
import { MpesaPaymentGate } from "@/components/ui/MpesaPaymentGate";
import { LocationPicker } from "@/components/listings/LocationPicker";
import { sanitizePhoneInput } from "@/lib/phone";
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
import type { ActionState } from "@/lib/schemas";
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
  onCreated,
}: {
  listings: Listing[];
  ad?: Ad;
  // Only meaningful when creating (editing already has the ad's own saved
  // companyName/companyContact) -- auto-fills the company fields from
  // Settings so the advertiser isn't retyping the same business name/phone
  // on every single ad. Still just a default: both fields stay editable.
  advertiser?: { businessName: string | null; phone: string | null };
  // Called once the ad fee payment succeeds and the visitor acknowledges it
  // -- lets the caller (a Modal) close itself.
  onCreated?: () => void;
}) {
  const id = useId();
  const isEdit = !!ad;
  // Dismissing a failed/cancelled payment attempt hides `state.pendingPayment`
  // again without needing a mirrored copy of it in local state -- reset
  // right as a fresh submission goes out so the next attempt's prompt shows.
  const [dismissed, setDismissed] = useState(false);
  async function submit(prevState: ActionState, formData: FormData) {
    setDismissed(false);
    return (isEdit ? updateAd : initiateAdPayment)(prevState, formData);
  }
  const [state, action] = useActionState(submit, undefined);
  const payment = !dismissed ? state?.pendingPayment : undefined;
  const [mpesaPhone, setMpesaPhone] = useState(advertiser?.phone ?? "");
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
  const [listingId, setListingId] = useState(ad?.listingId ?? listings[0]?.id ?? "");
  const [productName, setProductName] = useState(ad?.productName ?? listings[0]?.title ?? "");
  const [productDescription, setProductDescription] = useState(
    ad?.productDescription ?? listings[0]?.description ?? ""
  );
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

  // Switching which listing this ad promotes re-fills the product
  // name/description from that listing's own title/description -- the
  // listing form already asked for that once, so re-typing it here would
  // just be the same information a second time. Still just a starting
  // point: both fields stay editable afterward.
  function handleListingChange(id: string) {
    setListingId(id);
    const next = listings.find((l) => l.id === id);
    if (next) {
      setProductName(next.title);
      setProductDescription(next.description);
    }
  }

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

  if (!isEdit && payment) {
    return (
      <div className="flex max-w-xl flex-col gap-3">
        {state?.notice && <p className="text-xs text-amber-600 dark:text-amber-400">{state.notice}</p>}
        <MpesaPaymentGate
          paymentId={payment.paymentId}
          phone={payment.phone}
          amount={payment.amount}
          successMessage="Your ad has been submitted for admin review."
          onDone={(result) => {
            if (result === "success") {
              onCreated?.();
            } else {
              setDismissed(true);
            }
          }}
        />
      </div>
    );
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <FormErrorBanner message={state?.error} />
      {isEdit && <input type="hidden" name="adId" value={ad.id} />}
      <div>
        <label htmlFor={`${id}-listingId`} className="mb-1 block text-xs font-medium">
          Listing
        </label>
        {isEdit ? (
          <>
            <input type="hidden" name="listingId" value={listingId} />
            <p
              id={`${id}-listingId`}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {selectedListing?.title ?? "—"}
            </p>
          </>
        ) : (
          <select
            id={`${id}-listingId`}
            name="listingId"
            value={listingId}
            onChange={(e) => handleListingChange(e.target.value)}
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
          <label htmlFor={`${id}-companyName`} className="mb-1 block text-xs font-medium">
            Company name
          </label>
          <input
            id={`${id}-companyName`}
            name="companyName"
            defaultValue={ad?.companyName ?? advertiser?.businessName ?? ""}
            required
            maxLength={120}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldError messages={state?.fieldErrors?.companyName} />
        </div>
        <div>
          <label htmlFor={`${id}-companyContact`} className="mb-1 block text-xs font-medium">
            Company contact
          </label>
          <input
            id={`${id}-companyContact`}
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
        <label htmlFor={`${id}-productName`} className="mb-1 block text-xs font-medium">
          Product name
        </label>
        <input
          id={`${id}-productName`}
          name="productName"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
          maxLength={120}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.productName} />
      </div>

      <div>
        <label htmlFor={`${id}-productDescription`} className="mb-1 block text-xs font-medium">
          Product description
        </label>
        <textarea
          id={`${id}-productDescription`}
          name="productDescription"
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          rows={3}
          required
          maxLength={2000}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.productDescription} />
      </div>

      <div>
        <label htmlFor={`${id}-days`} className="mb-1 block text-xs font-medium">
          Days to run
        </label>
        <input
          id={`${id}-days`}
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
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            {eligibility && !eligibility.eligible
              ? eligibility.reason
              : "This listing's daily rate isn't currently paid up -- extend it in My Listings before advertising it."}
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
            <label htmlFor={`${id}-repeatCount`}>Repeat this many times a day:</label>
            <input
              id={`${id}-repeatCount`}
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

      <fieldset>
        <legend className="mb-1 block text-xs font-medium">Target audience</legend>
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
              <label htmlFor={`${id}-targetRadiusKm`}>Radius (km):</label>
              <input
                id={`${id}-targetRadiusKm`}
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
      </fieldset>

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

      <fieldset>
        <div className="mb-1 flex items-center justify-between">
          <legend className="block text-xs font-medium">Media (YouTube link or upload)</legend>
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
                aria-label="Media type"
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
                  aria-label="YouTube URL"
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              ) : (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    aria-label="Upload media file"
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
      </fieldset>

      {!isEdit && (
        <div>
          <label htmlFor={`${id}-mpesaPhone`} className="mb-1 block text-xs font-medium">
            M-Pesa phone number
          </label>
          <input
            id={`${id}-mpesaPhone`}
            name="mpesaPhone"
            type="tel"
            value={mpesaPhone}
            onChange={(e) => setMpesaPhone(sanitizePhoneInput(e.target.value))}
            placeholder="e.g. 0712345678"
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">
            You&apos;ll get an M-Pesa prompt here for the ad fee -- it airs only once that&apos;s paid.
          </p>
          <FieldError messages={state?.fieldErrors?.mpesaPhone} />
        </div>
      )}

      {anyUploading && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Wait for the upload to finish before submitting.
        </p>
      )}
      <SubmitButton
        pendingLabel={isEdit ? "Saving…" : "Sending M-Pesa prompt…"}
        disabled={anyUploading || listingRemainingDays === 0}
      >
        {isEdit ? "Save changes" : `Pay ${formatMoney(total)} & advertise`}
      </SubmitButton>
      {state?.success && (
        <p className="text-xs text-green-600 dark:text-green-400">Saved. Your ad has been sent back for admin review.</p>
      )}
    </form>
  );
}
