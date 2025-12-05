// REMOVE AbortController/AbortSignal in React Native Hermes environment
// because they cause "Cannot assign to read-only property 'NONE'" errors

if (typeof global.AbortController !== "undefined") {
  try { delete (global as any).AbortController } catch { /* empty */ }
}

if (typeof global.AbortSignal !== "undefined") {
  try { delete (global as any).AbortSignal } catch { /* empty */ }
}

if (typeof global.EventTarget !== "undefined") {
  try { delete (global as any).EventTarget } catch { /* empty */ }
}
