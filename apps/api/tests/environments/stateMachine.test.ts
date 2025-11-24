import { describe, it, expect } from 'vitest';
import { canTransition, allowedNextStates } from '../../src/services/environmentState';

describe('Environment State Machine (T166)', () => {
  it('core: pending → provisioning allowed', () => {
    expect(canTransition('pending','provisioning',{kind:'core'})).toBe(true);
  });
  it('core: provisioning → active allowed', () => {
    expect(canTransition('provisioning','active',{kind:'core'})).toBe(true);
  });
  it('core: active → updating allowed', () => {
    expect(canTransition('active','updating',{kind:'core'})).toBe(true);
  });
  it('core: updating → validating allowed', () => {
    expect(canTransition('updating','validating',{kind:'core'})).toBe(true);
  });
  it('core: validating → active allowed', () => {
    expect(canTransition('validating','active',{kind:'core'})).toBe(true);
  });
  it('core: provisioning → error allowed', () => {
    expect(canTransition('provisioning','error',{kind:'core'})).toBe(true);
  });
  it('core: error → updating retry path allowed with retry flag', () => {
    expect(canTransition('error','updating',{kind:'core',retry:true})).toBe(true);
  });
  it('core: error → updating without retry flag still structurally allowed', () => {
    expect(canTransition('error','updating',{kind:'core'})).toBe(true);
  });
  it('core: error → failed terminal allowed', () => {
    expect(canTransition('error','failed',{kind:'core'})).toBe(true);
  });
  it('core: active → archived allowed', () => {
    expect(canTransition('active','archived',{kind:'core'})).toBe(true);
  });
  it('core: invalid active → provisioning disallowed', () => {
    expect(canTransition('active','provisioning',{kind:'core'})).toBe(false);
  });
  it('core: rollback requires active → updating with rollback flag', () => {
    expect(canTransition('active','updating',{kind:'core',rollback:true})).toBe(true);
    expect(canTransition('updating','validating',{kind:'core',rollback:true})).toBe(false); // rollback flag only valid initial hop
  });
  it('preview: provisioning → active allowed', () => {
    expect(canTransition('provisioning','active',{kind:'preview'})).toBe(true);
  });
  it('preview: active → archived allowed', () => {
    expect(canTransition('active','archived',{kind:'preview'})).toBe(true);
  });
  it('preview: active → validating disallowed', () => {
    expect(canTransition('active','validating',{kind:'preview'})).toBe(false);
  });
  it('preview: error → archived allowed', () => {
    expect(canTransition('error','archived',{kind:'preview'})).toBe(true);
  });
  it('preview: allowedNextStates returns limited set', () => {
    expect(allowedNextStates('active','preview').sort()).toEqual(['archived','error'].sort());
  });
});
