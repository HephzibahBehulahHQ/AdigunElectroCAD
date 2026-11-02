export interface SafetyResetState { armed: boolean; resetReady: boolean; previousReset: boolean; }
export const initialSafetyReset = (): SafetyResetState => ({ armed: false, resetReady: false, previousReset: false });

/** Selected educational behavior: observe released reset with healthy channels before accepting its rising edge. */
export function scanSafetyReset(state: SafetyResetState, channelA: boolean, channelB: boolean, reset: boolean): SafetyResetState {
  if (!channelA || !channelB) return { armed: false, resetReady: false, previousReset: reset };
  const accepted = state.resetReady && reset && !state.previousReset;
  return { armed: state.armed || accepted, resetReady: reset ? false : true, previousReset: reset };
}
