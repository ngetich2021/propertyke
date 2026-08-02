"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef, type ComponentProps, type MouseEvent } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  onClick,
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const firedRef = useRef(false);

  // Reset the guard once the in-flight submission settles, so the button is
  // usable again for the next legitimate click.
  useEffect(() => {
    if (!pending) firedRef.current = false;
  }, [pending]);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (firedRef.current || pending) {
      e.preventDefault();
      return;
    }
    firedRef.current = true;
    onClick?.(e);
  }

  return (
    <button
      {...props}
      type="submit"
      onClick={handleClick}
      disabled={pending || props.disabled}
      className={`inline-flex items-center gap-2 ${
        className ??
        "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      }`}
    >
      {pending && <Spinner className="h-3.5 w-3.5" />}
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}
