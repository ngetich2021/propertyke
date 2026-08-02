export function DownloadExcelLink({ dataset }: { dataset: string }) {
  return (
    <a
      href={`/api/export?dataset=${dataset}`}
      className="text-xs font-medium text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      Download Excel
    </a>
  );
}
