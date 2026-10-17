CREATE TABLE users (
    -- 1. Largest fixed-size types (16 bytes)
    public_id UUID NOT NULL DEFAULT uuidv7() UNIQUE,

    -- 2. 8-byte fixed types
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 3. 4-byte fixed types
    id int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- 4. Variable-length types (Varlena)
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL
);

-- 2. The Batched Counter Table (Alignment: 32 bytes)
CREATE TABLE quiz_events_counters (
    user_id int4 PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_event_id int4 NOT NULL DEFAULT 0
);

-- 3. The Hyper-Optimized Events Table (Alignment: 48 bytes)
CREATE TABLE quiz_events (
    timestamp int8 NOT NULL,                                       -- 8 bytes
    user_id int4 NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 4 bytes
    id int4 NOT NULL,                                              -- 4 bytes
    result int2 NOT NULL CHECK (result >= 1 AND result <= 3),      -- 2 bytes
    glyph text COLLATE "C" NOT NULL,                               -- Variable (1-byte header)
    
    -- Clustered composite PK for Roaring Bitmap sequential lookups (~16 bytes/entry)
    PRIMARY KEY (user_id, id),
    
    -- Composite Unique index for chronological deduplication CTE (~24 bytes/entry)
    UNIQUE (user_id, timestamp)
);

-- 4. The Device Cache Table (Alignment: 48 bytes + variable bitmap)
CREATE TABLE quiz_events_devices_cache (
    device_uuid uuid NOT NULL,                                     -- 16 bytes
    last_synced_at date NOT NULL DEFAULT CURRENT_DATE,             -- 4 bytes
    user_id int4 NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 4 bytes
    synced_events roaringbitmap NOT NULL DEFAULT rb_build('{}'),   -- Variable length
    
    -- Leading edge on user_id ensures instantly isolated queries
    PRIMARY KEY (user_id, device_uuid)
);
