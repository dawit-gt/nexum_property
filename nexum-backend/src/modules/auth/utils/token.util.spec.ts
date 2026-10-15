import { generateOpaqueToken, hashToken } from './token.util';

describe('token utils', () => {
  it('generates long, unique tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();

    expect(a).toMatch(/^[0-9a-f]{96}$/);
    expect(a).not.toBe(b);
  });

  it('hashes deterministically to a 64-char SHA-256 hex digest', () => {
    const token = generateOpaqueToken();

    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never stores the raw token as its own hash', () => {
    const token = generateOpaqueToken();

    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).not.toBe(hashToken(`${token}x`));
  });

  it('matches the known SHA-256 of "abc"', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
