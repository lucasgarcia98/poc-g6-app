// Remove polyfills que quebram Hermes
try { (global as any).AbortController = undefined } catch { /* empty */ }
try { (global as any).AbortSignal = undefined } catch { /* empty */ }
try { (global as any).EventTarget = undefined } catch { /* empty */ }
try { (global as any).Event = undefined } catch { /* empty */ }
