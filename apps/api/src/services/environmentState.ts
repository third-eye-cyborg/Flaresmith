/**
 * Environment State Machine (Spec lifecycle documentation)
 * Core environments:
 *   pending → provisioning → active
 *   active → updating → validating → active
 *   provisioning|updating|validating → error → (retry) → updating
 *   error → failed (terminal if unrecoverable)
 *   active → archived (manual or decommission)
 * Rollback flow: active → updating(rollback) → validating → active
 * Preview environments (limited): provisioning → active → archived | error
 */

export type CoreEnvState =
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'updating'
  | 'validating'
  | 'error'
  | 'failed'
  | 'archived';

export type PreviewEnvState = 'provisioning' | 'active' | 'error' | 'archived';

export type EnvironmentState = CoreEnvState | PreviewEnvState;

interface TransitionContext {
  kind: 'core' | 'preview';
  rollback?: boolean; // indicates updating is a rollback operation
  retry?: boolean; // indicates transition after error is a retry
}

const CORE_TRANSITIONS: Record<CoreEnvState, EnvironmentState[]> = {
  pending: ['provisioning'],
  provisioning: ['active', 'error'],
  active: ['updating', 'archived'],
  updating: ['validating', 'error'],
  validating: ['active', 'error'],
  error: ['updating', 'failed'], // updating considered retry path
  failed: [],
  archived: [],
};

const PREVIEW_TRANSITIONS: Record<PreviewEnvState, PreviewEnvState[]> = {
  provisioning: ['active', 'error'],
  active: ['archived', 'error'],
  error: ['archived'],
  archived: [],
};

export function allowedNextStates(from: EnvironmentState, kind: 'core' | 'preview'): EnvironmentState[] {
  return kind === 'core'
    ? (CORE_TRANSITIONS[from as CoreEnvState] || [])
    : (PREVIEW_TRANSITIONS[from as PreviewEnvState] || []);
}

export function canTransition(from: EnvironmentState, to: EnvironmentState, ctx: TransitionContext): boolean {
  const allowed = allowedNextStates(from, ctx.kind);
  if (!allowed.includes(to)) return false;
  // Additional semantic rules
  if (ctx.kind === 'preview') {
    // Preview cannot go to validating or pending etc.
    if (to === 'validating' || to === 'pending' || to === 'updating' || to === 'failed') return false;
  }
  if (ctx.rollback) {
    // Rollback must start from active → updating only
    if (!(from === 'active' && to === 'updating')) return false;
  }
  if (ctx.retry) {
    // Retry implies from error → updating
    if (!(from === 'error' && to === 'updating')) return false;
  }
  return true;
}
