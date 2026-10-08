import Link from "next/link";
import { Compass, Search, MessageCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/** 404. Was falling through to Next's default page with no product context. */
export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="font-display text-7xl font-semibold tracking-tight text-accent sm:text-8xl">
        404
      </span>
      <h1 className="headline mt-4 font-display text-2xl text-fg sm:text-3xl">
        We could not find that page
      </h1>
      <p className="lede mt-3 max-w-md text-sm text-fg-muted">
        The link may be out of date, or the pharmacy may have been removed. Try searching for the
        medicine instead.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonClasses()}>
          <Search className="h-4 w-4" aria-hidden="true" />
          Search medicines
        </Link>
        <Link href="/medicines" className={buttonClasses({ variant: "secondary" })}>
          <Compass className="h-4 w-4" aria-hidden="true" />
          Browse the catalog
        </Link>
        <Link href="/chat" className={buttonClasses({ variant: "ghost" })}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Messages
        </Link>
      </div>
    </Container>
  );
}
