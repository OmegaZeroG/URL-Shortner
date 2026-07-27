// Encodes a positive integer (the links.id bigserial) into a Base62 string.
// Counter + Base62 is the encoding strategy documented in DESIGN.md:
// deterministic and collision-free by construction, no retry logic needed.

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = ALPHABET.length; // 62

function encode(num) {
  let n = BigInt(num);
  if (n === 0n) return ALPHABET[0];

  let result = '';
  const base = BigInt(BASE);
  while (n > 0n) {
    const remainder = Number(n % base);
    result = ALPHABET[remainder] + result;
    n = n / base;
  }
  return result;
}

function decode(str) {
  let result = 0n;
  const base = BigInt(BASE);
  for (const char of str) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid Base62 character: ${char}`);
    result = result * base + BigInt(index);
  }
  return result;
}

module.exports = { encode, decode };
