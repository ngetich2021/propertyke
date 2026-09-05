import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2 border-t border-zinc-200 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
      <a
        href="https://chat.whatsapp.com/KZr0SXskg0yAKpEDjBnBGA"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 font-medium text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
      >
        <MessageCircle size={14} /> Join our WhatsApp community
      </a>
      <Link href="/terms" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
        Terms &amp; Conditions
      </Link>
    </footer>
  );
}
