import { listAllTours } from "@/lib/actions/tours";
import { ToursTable } from "./ToursTable";

export async function ToursPanel() {
  const tours = await listAllTours();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Site visit requests ({tours.length})</h2>
      </div>
      <ToursTable tours={tours} />
    </div>
  );
}
