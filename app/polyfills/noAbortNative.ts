// app/polyfills/noAbortNative.ts

// Remove problematic polyfills that conflict with Hermes
try {
  (global as any).AbortController = undefined;
} catch {
  /* empty */
}

try {
  (global as any).AbortSignal = undefined;
} catch {
  /* empty */
}

try {
  (global as any).EventTarget = undefined;
} catch {
  /* empty */
}

try {
  (global as any).Event = undefined;
} catch {
  /* empty */
}

// Additional fix for Event.NONE and other Event constants
if (typeof Event !== 'undefined') {
  try {
    Object.defineProperty(Event, 'NONE', {
      value: 0,
      writable: false,
      enumerable: true,
      configurable: true
    });
  } catch {
    /* empty */
  }
}