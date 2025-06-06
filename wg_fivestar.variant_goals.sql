-- Drop the old table if it exists
DROP TABLE IF EXISTS wg_fivestar.wgs_variant_goals;
-- Create the new table with a year column
CREATE TABLE wg_fivestar.wgs_variant_goals (
    year INTEGER,
    distributor VARCHAR,
    channel VARCHAR,
    -- 'ON' or 'OFF'
    brand VARCHAR,
    variant VARCHAR,
    -- e.g., 'Glenfiddich 12 Sherry-750ML'
    fy_goal INTEGER,
    PRIMARY KEY (year, distributor, channel, brand, variant)
);
-- Sample insert statements for BBG West OFF-PREMISE (2025)
INSERT INTO wg_fivestar.wgs_variant_goals (
        year,
        distributor,
        channel,
        brand,
        variant,
        fy_goal
    )
VALUES (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 12 Sherry-750ML',
        701
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 12-1.75L',
        254
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 12-1L',
        65
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 12-375ML',
        168
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 12-750ML',
        2303
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 14-750ML',
        1480
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 15-1L',
        55
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 15-750ML',
        873
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 18-750ML',
        439
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 21-750ML',
        268
    ),
    (
        2025,
        'BBG West',
        'OFF',
        'Glenfiddich',
        'Glenfiddich 30-750ML',
        36
    ),
    -- ...continue for all OFF-PREMISE variants...
    -- Sample insert statements for BBG West ON-PREMISE (2025)
INSERT INTO wg_fivestar.wgs_variant_goals (
        year,
        distributor,
        channel,
        brand,
        variant,
        fy_goal
    )
VALUES (
        2025,
        'BBG West',
        'ON',
        'Glenfiddich',
        'Glenfiddich 12',
        2516
    ),
    (
        2025,
        'BBG West',
        'ON',
        'Glenfiddich',
        'Glenfiddich 12 Sherry',
        509
    ),
    (
        2025,
        'BBG West',
        'ON',
        'Glenfiddich',
        'Glenfiddich 14',
        584
    ),
    (
        2025,
        'BBG West',
        'ON',
        'Glenfiddich',
        'Glenfiddich 15',
        486
    ),
    (
        2025,
        'BBG West',
        'ON',
        'Glenfiddich',
        'Glenfiddich 18',
        248
    ),
    (
        2025,
        'BBG West',
        'ON',
        'Glenfiddich',
        'Glenfiddich 21',
        118
    ),
    (
        2025,
        'BBG West',
        'ON',
        'Glenfiddich',
        'Glenfiddich 30',
        39
    ),
    -- ...continue for all ON-PREMISE variants...
;