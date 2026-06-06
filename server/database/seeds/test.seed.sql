BEGIN;

INSERT INTO "gateways" (
    "gateway_token_hash",
    "gateway_description",
    "gateway_name",
    "gateway_location",
    "gateway_latitude",
    "gateway_longitude"
)
VALUES
    (
        'seed_gateway_token_hash_prague_001',
        'Hlavní meteostanice pro testování v Praze.',
        'Praha Centrum',
        'Praha, Česká republika',
        50.075539,
        14.437800
    ),
    (
        'seed_gateway_token_hash_brno_001',
        'Testovací gateway pro jižní Moravu.',
        'Brno Sever',
        'Brno, Česká republika',
        49.195061,
        16.606836
    ),
    (
        'seed_gateway_token_hash_ostrava_001',
        'Gateway simulující průmyslovější oblast.',
        'Ostrava Poruba',
        'Ostrava, Česká republika',
        49.820923,
        18.262524
    )
ON CONFLICT ("gateway_token_hash") DO NOTHING;

WITH seeded_gateways AS (
    SELECT
        "gateway_id",
        "gateway_token_hash"
    FROM "gateways"
    WHERE "gateway_token_hash" IN (
        'seed_gateway_token_hash_prague_001',
        'seed_gateway_token_hash_brno_001',
        'seed_gateway_token_hash_ostrava_001'
    )
),
gateway_params AS (
    -- Per-gateway baselines used to synthesise a realistic 30-day history.
    SELECT *
    FROM (
        VALUES
            ('seed_gateway_token_hash_prague_001', 18.0, 1013.0, 52.0, 880.0, 0.08, 90, -42),
            ('seed_gateway_token_hash_brno_001',   20.0, 1011.5, 45.0, 960.0, 0.05, 86, -51),
            ('seed_gateway_token_hash_ostrava_001', 15.0, 1014.5, 64.0, 620.0, 0.22, 72, -63)
    ) AS data (
        gateway_token_hash,
        base_temperature,
        base_pressure,
        base_humidity,
        base_lighting,
        rain_probability,
        base_battery,
        base_wifi
    )
),
seed_moments AS (
    -- One measurement every 30 minutes for the last 30 days.
    SELECT generate_series(
        date_trunc('hour', now()) - INTERVAL '30 days',
        date_trunc('hour', now()),
        INTERVAL '30 minutes'
    ) AS ts
),
seed_telemetries AS (
    SELECT
        -- Unique remote id derived from the timestamp and gateway.
        (EXTRACT(EPOCH FROM m.ts)::bigint * 10 + (sg."gateway_id" % 10))::bigint AS telemetry_remote_id,
        p.gateway_token_hash,
        m.ts AS telemetry_measured_at_utc,
        m.ts + INTERVAL '8 seconds' AS telemetry_received_at_utc,
        -- Daily cycle peaking mid-afternoon + slow multi-day drift + light noise.
        round((
            p.base_temperature
            + 6.5 * sin(2 * pi() * (h.hour_of_day - 9) / 24.0)
            + 2.5 * sin(2 * pi() * EXTRACT(EPOCH FROM m.ts) / (86400.0 * 7))
            + (random() - 0.5) * 1.4
        )::numeric, 1) AS telemetry_temperature,
        round((
            p.base_pressure
            + 7.0 * sin(2 * pi() * EXTRACT(EPOCH FROM m.ts) / (86400.0 * 4))
            + (random() - 0.5) * 1.5
        )::numeric, 1) AS telemetry_pressure,
        greatest(0, least(100, round((
            p.base_humidity
            - 13.0 * sin(2 * pi() * (h.hour_of_day - 9) / 24.0)
            + 6.0 * sin(2 * pi() * EXTRACT(EPOCH FROM m.ts) / (86400.0 * 4) + pi())
            + (random() - 0.5) * 5
        )::numeric, 1))) AS telemetry_humidity,
        greatest(0, round((
            p.base_lighting * greatest(0, sin(pi() * (h.hour_of_day - 6) / 12.0))
            + (random() - 0.5) * 30
        )::numeric, 1)) AS telemetry_lighting,
        -- Occasional rain, more likely on the "industrial" gateway.
        CASE
            WHEN random() < p.rain_probability THEN floor(random() * 6 + 1)::int
            ELSE 0
        END AS telemetry_raindrops_amount,
        -- Battery slowly drains towards the present.
        least(100, greatest(40, round(p.base_battery + (EXTRACT(EPOCH FROM (now() - m.ts)) / 86400.0) * 0.5)))::int AS telemetry_node_battery_level,
        round(p.base_wifi + (random() - 0.5) * 8)::int AS telemetry_node_wifi_strength
    FROM seeded_gateways sg
    JOIN gateway_params p
        ON p.gateway_token_hash = sg."gateway_token_hash"
    CROSS JOIN seed_moments m
    CROSS JOIN LATERAL (
        SELECT EXTRACT(HOUR FROM m.ts) + EXTRACT(MINUTE FROM m.ts) / 60.0 AS hour_of_day
    ) h
)
INSERT INTO "telemetries" (
    "telemetry_remote_id",
    "telemetry_gateway_id",
    "telemetry_measured_at_utc",
    "telemetry_received_at_utc",
    "telemetry_temperature",
    "telemetry_pressure",
    "telemetry_humidity",
    "telemetry_lighting",
    "telemetry_raindrops_amount",
    "telemetry_node_battery_level",
    "telemetry_node_wifi_strength"
)
SELECT
    seed_telemetries.telemetry_remote_id,
    seeded_gateways."gateway_id",
    seed_telemetries.telemetry_measured_at_utc,
    seed_telemetries.telemetry_received_at_utc,
    seed_telemetries.telemetry_temperature,
    seed_telemetries.telemetry_pressure,
    seed_telemetries.telemetry_humidity,
    seed_telemetries.telemetry_lighting,
    seed_telemetries.telemetry_raindrops_amount,
    seed_telemetries.telemetry_node_battery_level,
    seed_telemetries.telemetry_node_wifi_strength
FROM seed_telemetries
JOIN seeded_gateways
    ON seeded_gateways."gateway_token_hash" = seed_telemetries.gateway_token_hash
ON CONFLICT ("telemetry_gateway_id", "telemetry_measured_at_utc") DO NOTHING;

WITH seeded_gateways AS (
    SELECT
        "gateway_id",
        "gateway_token_hash"
    FROM "gateways"
    WHERE "gateway_token_hash" IN (
        'seed_gateway_token_hash_prague_001',
        'seed_gateway_token_hash_brno_001',
        'seed_gateway_token_hash_ostrava_001'
    )
),
seed_notifications AS (
    SELECT
        data.notification_is_for_admins_only,
        data.notification_text,
        data.notification_type,
        seeded_gateways."gateway_id" AS notification_gateway_id,
        now() - data.notification_age AS notification_created_at
    FROM (
        VALUES
            (FALSE, 'Praha Centrum přijímá telemetrii v pořádku.', 'info', 'seed_gateway_token_hash_prague_001', INTERVAL '35 minutes'),
            (FALSE, 'Praha Centrum: teplota překročila 24 °C.', 'warning', 'seed_gateway_token_hash_prague_001', INTERVAL '6 hours'),
            (FALSE, 'Praha Centrum: baterie uzlu klesla pod 85 %.', 'info', 'seed_gateway_token_hash_prague_001', INTERVAL '1 day 4 hours'),
            (FALSE, 'Praha Centrum je opět online.', 'info', 'seed_gateway_token_hash_prague_001', INTERVAL '3 days 2 hours'),
            (FALSE, 'Brno Sever hlásí sníženou sílu Wi-Fi signálu.', 'warning', 'seed_gateway_token_hash_brno_001', INTERVAL '2 hours'),
            (FALSE, 'Brno Sever: prudký pokles tlaku, blíží se změna počasí.', 'danger', 'seed_gateway_token_hash_brno_001', INTERVAL '10 hours'),
            (FALSE, 'Brno Sever je opět online.', 'info', 'seed_gateway_token_hash_brno_001', INTERVAL '2 days 6 hours'),
            (FALSE, 'Ostrava Poruba zaznamenala dešťové srážky.', 'info', 'seed_gateway_token_hash_ostrava_001', INTERVAL '50 minutes'),
            (FALSE, 'Ostrava Poruba: vysoká vlhkost vzduchu nad 75 %.', 'warning', 'seed_gateway_token_hash_ostrava_001', INTERVAL '14 hours'),
            (FALSE, 'Ostrava Poruba: kriticky slabý signál Wi-Fi, hrozí výpadky telemetrie.', 'danger', 'seed_gateway_token_hash_ostrava_001', INTERVAL '4 days')
    ) AS data (
        notification_is_for_admins_only,
        notification_text,
        notification_type,
        gateway_token_hash,
        notification_age
    )
    JOIN seeded_gateways
        ON seeded_gateways."gateway_token_hash" = data.gateway_token_hash

    UNION ALL

    SELECT TRUE, 'Systémové upozornění: plánovaná údržba serveru dnes ve 23:00.', 'info', NULL::bigint, now() - INTERVAL '5 hours'
    UNION ALL
    SELECT TRUE, 'Administrátorské upozornění: detekován neobvyklý počet pokusů o přihlášení.', 'warning', NULL::bigint, now() - INTERVAL '1 day 8 hours'
    UNION ALL
    SELECT FALSE, 'Vítejte v aplikaci MeteoTrack! Systém je připraven k použití.', 'info', NULL::bigint, now() - INTERVAL '6 days'
)
INSERT INTO "notifications" (
    "notification_is_for_admins_only",
    "notification_text",
    "notification_type",
    "notification_gateway_id",
    "notification_created_at"
)
SELECT
    seed_notifications.notification_is_for_admins_only,
    seed_notifications.notification_text,
    seed_notifications.notification_type,
    seed_notifications.notification_gateway_id,
    seed_notifications.notification_created_at
FROM seed_notifications
WHERE NOT EXISTS (
    SELECT 1
    FROM "notifications"
    WHERE "notifications"."notification_text" = seed_notifications.notification_text
);

-- Fan every notification out to the users who should see it (mirrors the
-- application's assignment logic) and pre-acknowledge the older ones so the UI
-- shows a realistic mix of read and unread items.
INSERT INTO "users_notifications" (
    "notification_id",
    "user_id",
    "acknowledged"
)
SELECT
    n."notification_id",
    u."user_id",
    (n."notification_created_at" < now() - INTERVAL '2 days') AS acknowledged
FROM "notifications" n
JOIN "users" u
    ON n."notification_is_for_admins_only" = FALSE
    OR u."user_role" = 'administrator'
ON CONFLICT ("notification_id", "user_id") DO NOTHING;

COMMIT;