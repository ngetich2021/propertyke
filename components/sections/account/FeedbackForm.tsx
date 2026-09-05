"use client";

import { useId, useState } from "react";
import { useActionState } from "react";
import { Star } from "lucide-react";
import { submitFeedback } from "@/lib/actions/feedback";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import type { ActionState } from "@/lib/schemas";

export function FeedbackForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  async function submit(prevState: ActionState, formData: FormData) {
    const result = await submitFeedback(prevState, formData);
    if (result?.success) {
      setRating(0);
      onSubmitted?.();
    }
    return result;
  }
  const [state, action] = useActionState(submit, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="rating" value={rating || ""} />
      <div>
        <span className="mb-1 block text-sm font-medium">How&apos;s EstateFinderHub working for you? (optional)</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n === rating ? 0 : n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5"
            >
              <Star
                size={22}
                className={(hovered || rating) >= n ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-message`} className="mb-1 block text-sm font-medium">
          Feedback / suggestions
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          minLength={3}
          maxLength={1000}
          rows={4}
          placeholder="What's working, what's not, what would you like to see?"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.message} />
      </div>
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">Thanks for the feedback!</p>}
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <SubmitButton pendingLabel="Sending…" className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
        Send feedback
      </SubmitButton>
    </form>
  );
}
