"use client";

import { useEffect, useState } from "react";
import { getPaymentStatus } from "@/lib/actions/payments";
import { Spinner } from "@/components/ui/Spinner";
import { formatMoney } from "@/lib/format";

// Shown in place of a form after its M-Pesa prompt has been sent. Polls
// getPaymentStatus every few seconds, which actively re-checks with
// Safaricom itself rather than only waiting on the callback -- so this
// still resolves even if the callback URL is unreachable. Note: polling
// only runs while this component is mounted, so a payment completed after
// navigating away (or clicking Cancel) still gets applied the next time
// anything polls or resolves it, but won't update this particular screen.
export function MpesaPaymentGate({
  paymentId,
  phone,
  amount,
  successMessage,
  onDone,
}: {
  paymentId: string;
  phone: string;
  amount: number;
  successMessage: string;
  onDone: (result: "success" | "failed" | "cancelled") => void;
}) {
  const [status, setStatus] = useState<"waiting" | "success" | "failed">("waiting");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      let result: Awaited<ReturnType<typeof getPaymentStatus>>;
      try {
        result = await getPaymentStatus(paymentId);
      } catch {
        // A transient network blip (or a dev-server restart) shouldn't end
        // the poll or throw an unhandled rejection -- the payment itself is
        // still fine on M-Pesa's side either way; just try again shortly.
        if (!cancelled) timer = setTimeout(poll, 3000);
        return;
      }
      if (cancelled) return;

      if (result.status === "SUCCESS") {
        setStatus("success");
        return;
      }
      if (result.status === "FAILED") {
        setStatus("failed");
        setReason(result.reason);
        return;
      }
      if (result.status === "NOT_FOUND") {
        setStatus("failed");
        setReason("This payment could not be found.");
        return;
      }
      timer = setTimeout(poll, 3000);
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paymentId]);

  if (status === "success") {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-900/30 dark:text-green-300">
        <p className="font-medium">Payment received.</p>
        <p className="mt-1">{successMessage}</p>
        <button
          type="button"
          onClick={() => onDone("success")}
          className="mt-3 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
        >
          Done
        </button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        <p className="font-medium">Payment didn&apos;t go through.</p>
        <p className="mt-1">{reason}</p>
        <button
          type="button"
          onClick={() => onDone("failed")}
          className="mt-3 rounded-md border border-red-400 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-6 text-center text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Spinner className="h-6 w-6" />
      <div>
        <p className="font-medium">Check your phone — {phone}</p>
        <p className="mt-1 text-zinc-500">
          Enter your M-Pesa PIN to pay {formatMoney(amount)}. This updates automatically once it goes through.
        </p>
      </div>
      <button type="button" onClick={() => onDone("cancelled")} className="text-xs text-zinc-500 underline">
        Cancel
      </button>
    </div>
  );
}
