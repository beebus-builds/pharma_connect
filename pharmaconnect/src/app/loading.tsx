import { CardSkeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Container } from "@/components/ui/Container";

/**
 * Route-level loading boundary.
 *
 * There were none anywhere in the app, so navigating between pages kept the
 * previous screen up until the new one painted — which reads as "nothing
 * happened". This gives every navigation a shaped placeholder.
 */
export default function Loading() {
  return (
    <Container className="py-10 sm:py-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <SkeletonText lines={2} className="mb-8 max-w-xl" />
      <CardSkeleton count={3} />
    </Container>
  );
}
