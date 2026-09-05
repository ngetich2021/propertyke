import { Star } from "lucide-react";
import { getMyFeedback } from "@/lib/actions/feedback";
import { FeedbackForm } from "@/components/sections/account/FeedbackForm";

export async function FeedbackSection() {
  const previous = await getMyFeedback();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <FeedbackForm />
      {previous.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Your previous feedback</h3>
          <div className="flex flex-col gap-2">
            {previous.map((f) => (
              <div key={f.id} className="rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  {f.rating ? (
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < f.rating! ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"}
                        />
                      ))}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-zinc-500">{f.createdAt.toLocaleDateString()}</span>
                </div>
                <p className="mt-1 whitespace-pre-line">{f.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
