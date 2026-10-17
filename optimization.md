- sync is optional (self-host backend on my local server, sync is eventual and consistent, not realtime)
- the register and login endpoints take an optional device_id param; when omitted, they generate one (uuidv7). the device_id becomes part of the encrypted session (alongside the user_id), and is also returned alongside the auth/login response. the FE then stores it to localStorage. logout does not erase/reset the device_id; when the device_id exists, the FE passes it to the BE as part of the login/register endpoints
- the BE should also set a separate, permanent http-only, secure cookie with the device id; this doesnt get reset on logout, and is trusted over localStorage.device_id. localStorage works as a fallback; this dedicated cookie is redundant with the device_id stored in the session, but the reason we store a copy of it within the session is to guarantee consistency (sessions always have a device id); this dedicated cookie is also not encrypted (different from session cookie, only used during login/register when minting new sessions)
- the users table is rebuilt so internally it uses an int4 id (there's also a public_uuid for the user, which we can expose if we ever need to return a user_id to the client; for now, we just use the int4 id within our encrypted cookie that the client can't parse. the int4 id should never be accessible to the client)
- all BE tables were rebuilt with a significantly more optimized layout (see all migrations). there are also new tables
    
the INSERT ON CONFLICT/MERGE is replaced by a multi-step operation within a transaction:

The Insert Query (Pre-flight CTE):

```sql
WITH incoming AS (
  -- Parallel unnest instantly zips the 3 arrays into rows
  SELECT * FROM unnest($1::int8[], $2::text[], $3::int2[]) 
  AS i(timestamp, glyph, result)
),
new_events AS (
  -- Integer-only anti-join based strictly on the unique timestamp
  SELECT i.* 
  FROM incoming i
  LEFT JOIN quiz_events e 
    ON e.user_id = $4 
    AND e.timestamp = i.timestamp 
  WHERE e.id IS NULL
),
reserve_ids AS (
  -- Lock and reserve IDs for new events
  UPDATE quiz_events_counters
  SET last_event_id = last_event_id + (SELECT count(*) FROM new_events)
  WHERE user_id = $4
  RETURNING last_event_id, (last_event_id - (SELECT count(*) FROM new_events)) AS start_id
)
-- Insert the new rows with perfect sequential IDs
INSERT INTO quiz_events (user_id, id, timestamp, glyph, result)
SELECT 
  $4,
  (SELECT start_id FROM reserve_ids) + row_number() OVER (ORDER BY timestamp),
  timestamp,
  glyph,
  result
FROM new_events
RETURNING id;
```

followed up by The Update Query (Conflict Resolution):

```sql
WITH incoming AS (
  SELECT * FROM unnest($1::int8[], $2::text[], $3::int2[]) 
  AS i(timestamp, glyph, result)
)
UPDATE quiz_events e
SET 
  glyph = i.glyph,
  result = i.result
FROM incoming i
WHERE e.user_id = $4
  AND e.timestamp = i.timestamp
  AND (
    -- Condition 1: Incoming glyph wins the byte comparison
    i.glyph > e.glyph 
    
    OR 
    
    -- Condition 2: Glyphs match, but incoming has a higher result score
    (i.glyph = e.glyph AND i.result > e.result)
  );
```

followed up by a cache upsert:

```sql
INSERT INTO device_caches (device_uuid, user_id, last_synced_at, synced_events)
VALUES (
  $1, 
  $2, 
  CURRENT_DATE, 
  rb_build($3::int4[]) -- Instantly converts the array of IDs into a bitmap
)
ON CONFLICT (user_id, device_uuid) DO UPDATE 
SET 
  -- Native bitwise OR merges the new bitmap with the existing one
  synced_events = rb_or(device_caches.synced_events, EXCLUDED.synced_events),
  
  -- Bump the last synced date so you know this cache is active
  last_synced_at = CURRENT_DATE;
```

then when/if the backend detects that the client is missing events, instead of returning all historical events minus the ones it just received from the FE, a much smarter approach is taken:

```sql
WITH device_cache AS (
  -- Fetch the highly compressed bitmap for this specific device
  SELECT synced_events 
  FROM device_caches 
  WHERE user_id = $1 AND device_uuid = $2
),
missing_events AS (
  -- Find events the user has, but the device bitmap lacks
  SELECT timestamp, glyph, result 
  FROM quiz_events 
  WHERE user_id = $1
    -- rb_contains is a lightning-fast native C lookup
    AND NOT rb_contains(
        COALESCE((SELECT synced_events FROM device_cache), rb_build('{}')), 
        id
    )
)
-- Aggregate directly into the columnar JSON wire protocol
SELECT json_build_object(
  'timestamps', COALESCE(json_agg(timestamp), '[]'::json),
  'glyphs', COALESCE(json_agg(glyph), '[]'::json),
  'results', COALESCE(json_agg(result), '[]'::json)
)::text AS payload
FROM missing_events;
```

note that we build the json directly in sql to avoid bun having to allocate a shit ton of objects to then need to serialize it back. when no events are missing we simply skip the query altogether

the upsert code across the FE and BE must be reviewed so that the conflict resolution is consistent across postgres and the typescript version. The current TS implementation uses UTF-16, whereas postgres uses UTF-8. we have more performance budget on the client, so we'll get TS to match postgres, rather than the other way around. in postgres glyphs can be compared directly, and the COLLATE "C" in the column definition makes it clean

here's some sample code for the FE to consider:
```ts
/**
 * Zero-allocation strict UTF-8 byte-order comparison.
 * Perfectly mimics PostgreSQL's `COLLATE "C"` on text columns.
 */
function compareCollateC(a: string, b: string): number {
  let i = 0;
  let j = 0;
  const lenA = a.length;
  const lenB = b.length;

  while (i < lenA && j < lenB) {
    const cpA = a.codePointAt(i)!;
    const cpB = b.codePointAt(j)!;

    if (cpA !== cpB) {
      return cpA - cpB;
    }

    // Advance by 2 if it's a surrogate pair (emoji/supplementary char), otherwise 1
    i += cpA > 0xffff ? 2 : 1;
    j += cpB > 0xffff ? 2 : 1;
  }

  // If one string is a prefix of the other, the longer string wins
  if (i < lenA) return 1;
  if (j < lenB) return -1;
  return 0;
}

export function resolveEventCollision(a: QuizEvent, b: QuizEvent): QuizEvent {
  // 1. If glyphs differ, use zero-allocation code point comparison
  if (a.glyph !== b.glyph) {
    return compareCollateC(a.glyph, b.glyph) > 0 ? a : b;
  }
  
  // 2. If glyphs are identical, the higher result integer (3 > 2 > 1) wins
  if (a.result !== b.result) {
    return a.result > b.result ? a : b;
  }
  
  // 3. Exact duplicates
  return a;
}
```

the result event property becomes a number (more specifically, an int2) instead of a string; smaller footprint on disk, naturally sortable on both ends; we'll define app-level constants to make them easier to use (akin to enums, just not TS enum, just union types + named constants - as const) and have validations in zod and check constraints for consistency

a cron job (https://bun.com/docs/runtime/cron) runs a DELETE query daily evicting cache entries that have gone a month w/o being updated

we also change the wire protocol to use a more optimal format like:
{
  "timestamps": [1729034580000, 1729034584200, 1729034588100],
  "glyphs": ["あ", "漢", "字"],
  "results": [3,2,3]
}

the reason for that is that its payload footprint is much smaller than the naive array of objects, and it avoids the need for reassembly on the server side, as this format can be directly used with stuff like:

```sql
INSERT INTO users (name, email)
SELECT * FROM unnest($1::text[], $2::text[]);
```

bun has a built-in helper for this `sql.array(names, 'text')` that can be used to efficiently pass these values without re-encoding and without any hard limits on number of rows

since indexdb already processes one event at a time, the columnar format can be processed directly as-is, by iterating over all 3 arrays using a single iteration index, no remapping or extra allocations

speaking of which, indexdb should be updated to use the new int format for results, carefully migrating existing data to the new format