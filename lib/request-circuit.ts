/** Consecutive persistent failures before auto-requests are skipped. */
export const REQUEST_CIRCUIT_MAX_FAILURES = 3;

type RequestCircuitState = {
  consecutiveFailures: number;
  open: boolean;
};

const globalForCircuit = globalThis as typeof globalThis & {
  __appsRequestCircuit?: RequestCircuitState;
};

function circuitState(): RequestCircuitState {
  if (!globalForCircuit.__appsRequestCircuit) {
    globalForCircuit.__appsRequestCircuit = {
      consecutiveFailures: 0,
      open: false,
    };
  }
  return globalForCircuit.__appsRequestCircuit;
}

export function requestCircuitSnapshot(): {
  consecutiveFailures: number;
  open: boolean;
} {
  const state = circuitState();
  return {
    consecutiveFailures: state.consecutiveFailures,
    open: state.open,
  };
}

export function isRequestCircuitOpen(): boolean {
  return circuitState().open;
}

export function recordRequestFailure(): void {
  const state = circuitState();
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= REQUEST_CIRCUIT_MAX_FAILURES) {
    state.open = true;
  }
}

export function recordRequestSuccess(): void {
  const state = circuitState();
  state.consecutiveFailures = 0;
  state.open = false;
}

/** Manual retry (Try again) closes the circuit so the next request may fire. */
export function resetRequestCircuit(): void {
  recordRequestSuccess();
}
