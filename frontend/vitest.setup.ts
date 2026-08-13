import "@testing-library/jest-dom";

// Polyfills for Radix UI components in JSDOM environment
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || function () { return false; };
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {};
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || function () {};
}

if (typeof window !== "undefined") {
  window.PointerEvent = window.PointerEvent || (class PointerEvent extends Event {} as any);
  window.ResizeObserver =
    window.ResizeObserver ||
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
}
