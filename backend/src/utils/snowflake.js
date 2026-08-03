// Snowflake-style distributed ID generator — the "textbook correct" answer
// for ID generation once you have multiple app servers writing concurrently
// without a shared DB sequence bottleneck (see DESIGN.md section 7 and
// system-design-one-pager.md section 4b). The default counter+Base62
// strategy (see base62.js + linkController.js) is used unless a request
// explicitly opts in with { idStrategy: 'snowflake' } — both are wired up
// and live simultaneously, so this is a real working alternative, not just
// a documented one.
//
// Layout (64 bits total, fits in a BigInt):
//   1 bit  unused (sign bit)
//  41 bits timestamp in ms since EPOCH (~69 years of range)
//  10 bits worker id, 0-1023 — set SNOWFLAKE_WORKER_ID per instance so
//                              multiple app servers never generate the same id
//  12 bits sequence, 0-4095 per millisecond, per worker
//
// Honest trade-off vs the counter+Base62 path: these ids are much larger
// numbers, so the resulting Base62 short codes are noticeably longer
// (~11 characters vs 1-2 at this project's current scale) — distributed-safe
// id generation costs code compactness. Worth saying out loud if asked.

const EPOCH = 1704067200000n; // 2024-01-01T00:00:00Z

const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n; // 1023
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n; // 4095

const WORKER_ID_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS;

class SnowflakeGenerator {
  constructor(workerId) {
    const id = BigInt(workerId);
    if (id < 0n || id > MAX_WORKER_ID) {
      throw new Error(`SNOWFLAKE_WORKER_ID must be between 0 and ${MAX_WORKER_ID}`);
    }
    this.workerId = id;
    this.sequence = 0n;
    this.lastTimestamp = -1n;
  }

  nextId() {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      // System clock moved backwards (NTP adjustment, VM migration, etc.) —
      // refuse to generate an id that could collide with one already issued.
      throw new Error('Clock moved backwards, refusing to generate id');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & MAX_SEQUENCE;
      if (this.sequence === 0n) {
        // Exhausted 4096 ids in this millisecond — spin until the clock ticks.
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      ((timestamp - EPOCH) << TIMESTAMP_SHIFT) |
      (this.workerId << WORKER_ID_SHIFT) |
      this.sequence
    );
  }
}

const workerId = Number(process.env.SNOWFLAKE_WORKER_ID) || 0;
const generator = new SnowflakeGenerator(workerId);

function nextSnowflakeId() {
  return generator.nextId();
}

module.exports = { nextSnowflakeId, SnowflakeGenerator };
