import { listAllFeedback } from "@/lib/actions/feedback";
import { FeedbackTable } from "./FeedbackTable";

export async function FeedbackPanel() {
  const feedback = await listAllFeedback();
  const rated = feedback.filter((f) => f.rating != null);
  const avgRating = rated.length ? (rated.reduce((sum, f) => sum + f.rating!, 0) / rated.length).toFixed(1) : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Feedback ({feedback.length})</h2>
      </div>
      {avgRating && (
        <p className="mb-3 text-sm">
          Average rating: <span className="font-bold">{avgRating}</span> / 5 ({rated.length} rated)
        </p>
      )}
      <FeedbackTable feedback={feedback} />
    </div>
  );
}
