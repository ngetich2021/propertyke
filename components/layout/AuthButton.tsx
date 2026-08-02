"use client";

import { signIn, signOut } from "next-auth/react";
import { useRef, useState } from "react";

export function AuthButton({ signedIn }: { signedIn: boolean }) {
  const [pending, setPending] = useState(false);
  const firedRef = useRef(false);

  async function handleClick() {
    if (firedRef.current) return;
    firedRef.current = true;
    setPending(true);
    try {
      if (signedIn) {
        await signOut({ callbackUrl: "/" });
      } else {
        await signIn("google", { callbackUrl: "/" });
      }
    } finally {
      firedRef.current = false;
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {pending ? "…" : signedIn ? "signout" : "sign in"}
    </button>
  );
}
