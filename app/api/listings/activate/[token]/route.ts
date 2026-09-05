import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reactivateListing } from "@/lib/listingActivation";

// The "Activate" link in the reactivation email (see notifyReactivationNeeded
// in lib/actions/maintenance.ts) -- clicked from an inbox, so it can't
// require a signed-in session. Deliberately a plain, idempotent GET: visiting
// it always just (re)confirms the listing is still wanted, which is safe to
// repeat (email link scanners/prefetchers, a double click, revisiting an old
// email) -- never destructive.
function page(title: string, body: string) {
  return new NextResponse(
    `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1.5rem; color: #18181b; }
  a { color: #2563eb; }
  h1 { font-size: 1.25rem; }
</style></head>
<body>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const listing = await prisma.listing.findUnique({ where: { activationToken: token } });
  if (!listing) {
    return page(
      "Link not found",
      `<h1>This activation link isn't valid.</h1><p>It may have already been used, or the listing may no longer exist. <a href="/">Go to EstateFinderHub</a></p>`
    );
  }

  await reactivateListing(listing.id);

  return page(
    "Listing activated",
    `<h1>&ldquo;${listing.title}&rdquo; is active again.</h1><p>It's now visible to everyone. <a href="/">View it on EstateFinderHub</a></p>`
  );
}
