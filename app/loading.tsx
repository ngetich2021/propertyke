import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-col animate-pulse">
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
          <div className="h-40 w-full rounded-lg bg-zinc-100 sm:h-56 dark:bg-zinc-900" />
        </div>
      </div>
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl gap-4 px-4 py-2">
          <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-6">
        <Spinner className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
      </main>
    </div>
  );
}
