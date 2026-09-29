const DEFAULT_LATENCY_MS = 350;

export function simulateLatency(milliseconds = DEFAULT_LATENCY_MS) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
