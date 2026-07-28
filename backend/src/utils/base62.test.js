const { encode, decode } = require('./base62');

describe('base62', () => {
  test('round-trips encode -> decode back to the original number', () => {
    const cases = [0, 1, 61, 62, 63, 12345, 999999999];
    for (const n of cases) {
      const code = encode(n);
      expect(decode(code)).toBe(BigInt(n));
    }
  });

  test('produces different codes for different ids', () => {
    expect(encode(1)).not.toBe(encode(2));
    expect(encode(100)).not.toBe(encode(101));
  });

  test('throws on an invalid character during decode', () => {
    expect(() => decode('!!!')).toThrow();
  });
});
