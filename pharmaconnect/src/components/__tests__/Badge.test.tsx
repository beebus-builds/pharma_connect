// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StockBadge, DistanceBadge, VerifiedBadge } from "@/components/ui/Badge";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { StockStatus } from "@/types";

function renderWithLocale(node: React.ReactElement) {
  return render(<LocaleProvider>{node}</LocaleProvider>);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("badge translation", () => {
  const cases: [StockStatus, string, string][] = [
    ["in-stock", "In Stock", "स्टकमा"],
    ["low-stock", "Low Stock", "कम स्टक"],
    ["out-of-stock", "Out of Stock", "स्टक समाप्त"],
  ];

  it("renders stock labels in English by default", () => {
    for (const [status, english] of cases) {
      const { unmount } = renderWithLocale(<StockBadge status={status} />);
      expect(screen.getByText(english)).toBeTruthy();
      unmount();
    }
  });

  it("renders stock labels in Nepali when the stored locale is ne", async () => {
    // LocaleProvider reads localStorage on mount, so pre-seed it per case.
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    for (const [status, , nepali] of cases) {
      window.localStorage.setItem("pharmaconnect_locale", "ne");
      const { unmount } = renderWithLocale(<StockBadge status={status} />);
      expect(await screen.findByText(nepali)).toBeTruthy();
      unmount();
    }
  });

  it("localises the verified chip", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    void user;
    window.localStorage.setItem("pharmaconnect_locale", "ne");
    renderWithLocale(<VerifiedBadge />);
    expect(await screen.findByText("प्रमाणित")).toBeTruthy();
  });

  it("uses metres below 1 km and kilometres above", () => {
    const { unmount } = renderWithLocale(<DistanceBadge km={0.42} />);
    expect(screen.getByText("420 m away")).toBeTruthy();
    unmount();

    renderWithLocale(<DistanceBadge km={3.14} />);
    expect(screen.getByText("3.1 km away")).toBeTruthy();
  });
});
