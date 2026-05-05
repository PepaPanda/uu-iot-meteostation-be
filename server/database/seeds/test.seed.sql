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
    );

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
VALUES
    -- Praha, gateway_id = 1
    (
        10001,
        1,
        date_trunc('hour', now()) - INTERVAL '55 minutes',
        date_trunc('hour', now()) - INTERVAL '54 minutes 50 seconds',
        21.4,
        1013.2,
        47.5,
        780.0,
        0,
        92,
        -42
    ),
    (
        10002,
        1,
        date_trunc('hour', now()) - INTERVAL '45 minutes',
        date_trunc('hour', now()) - INTERVAL '44 minutes 52 seconds',
        21.8,
        1013.0,
        46.9,
        825.0,
        0,
        91,
        -43
    ),
    (
        10003,
        1,
        date_trunc('hour', now()) - INTERVAL '35 minutes',
        date_trunc('hour', now()) - INTERVAL '34 minutes 49 seconds',
        22.1,
        1012.8,
        46.2,
        860.0,
        0,
        91,
        -41
    ),

    -- Brno, gateway_id = 2
    (
        20001,
        2,
        date_trunc('hour', now()) - INTERVAL '55 minutes',
        date_trunc('hour', now()) - INTERVAL '54 minutes 48 seconds',
        23.2,
        1011.7,
        41.3,
        920.0,
        0,
        87,
        -50
    ),
    (
        20002,
        2,
        date_trunc('hour', now()) - INTERVAL '45 minutes',
        date_trunc('hour', now()) - INTERVAL '44 minutes 47 seconds',
        23.7,
        1011.5,
        40.7,
        970.0,
        0,
        86,
        -52
    ),
    (
        20003,
        2,
        date_trunc('hour', now()) - INTERVAL '35 minutes',
        date_trunc('hour', now()) - INTERVAL '34 minutes 46 seconds',
        24.0,
        1011.3,
        39.9,
        1015.0,
        0,
        86,
        -51
    ),

    -- Ostrava, gateway_id = 3
    (
        30001,
        3,
        date_trunc('hour', now()) - INTERVAL '55 minutes',
        date_trunc('hour', now()) - INTERVAL '54 minutes 55 seconds',
        19.6,
        1014.4,
        62.0,
        430.0,
        2,
        74,
        -61
    ),
    (
        30002,
        3,
        date_trunc('hour', now()) - INTERVAL '45 minutes',
        date_trunc('hour', now()) - INTERVAL '44 minutes 54 seconds',
        19.4,
        1014.6,
        64.8,
        390.0,
        5,
        73,
        -63
    ),
    (
        30003,
        3,
        date_trunc('hour', now()) - INTERVAL '35 minutes',
        date_trunc('hour', now()) - INTERVAL '34 minutes 53 seconds',
        19.2,
        1014.9,
        67.1,
        310.0,
        11,
        72,
        -64
    );

INSERT INTO "notifications" (
    "notification_is_for_admins_only",
    "notification_text",
    "notification_type",
    "notification_gateway_id"
)
VALUES
    (
        FALSE,
        'Praha Centrum přijímá telemetry data správně.',
        'info',
        1
    ),
    (
        FALSE,
        'Ostrava Poruba hlásí zvýšené množství dešťových kapek.',
        'warning',
        3
    ),
    (
        TRUE,
        'Testovací administrátorská notifikace bez vazby na gateway.',
        'info',
        NULL
    ),
    (
        FALSE,
        'Brno Sever má nižší sílu Wi-Fi signálu.',
        'warning',
        2
    );

COMMIT;