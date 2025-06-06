CREATE OR REPLACE VIEW wg_fivestar.vw_variant_size_pod_actuals AS WITH actuals AS (
        SELECT s.brand,
            m.goal_variant AS variant_size,
            CASE
                WHEN s.vip_cot_premise_type_desc = 'Off Premise' THEN 'OFF'
                WHEN s.vip_cot_premise_type_desc = 'On Premise' THEN 'ON'
                ELSE s.vip_cot_premise_type_desc
            END AS channel,
            CASE
                WHEN (s.customers->0->>'customer_stat_level') LIKE '%Break Thru%' THEN 'Breakthru'
                WHEN (s.customers->0->>'customer_stat_level') LIKE '%RNDC-Youngs%' THEN 'RNDC'
                ELSE 'Independent'
            END AS distributor,
            COUNT(DISTINCT s.outlet_id) AS pod_sold
        FROM wg_fivestar.vw_account_sales_with_market s
            JOIN wg_fivestar.variant_size_mapping m ON m.sales_variant_size_pack_desc = s.variant_size_pack_desc
        WHERE s.year = 2025
        GROUP BY s.brand,
            m.goal_variant,
            channel,
            distributor
    ),
    goals AS (
        SELECT CASE
                WHEN brand = 'Hendrick''s Gin' THEN 'Hendricks'
                ELSE brand
            END AS brand,
            CASE
                WHEN channel = 'ON' THEN CASE
                    WHEN variant_size LIKE '%-%' THEN SPLIT_PART(variant_size, '-', 1)
                    ELSE variant_size
                END
                ELSE variant_size
            END AS variant_size,
            channel,
            distributor,
            fy_goal
        FROM wg_fivestar.wgs_variant_goals
        WHERE year = 2025
    )
SELECT a.brand,
    a.variant_size,
    a.channel,
    a.distributor,
    a.pod_sold,
    g.fy_goal
FROM actuals a
    LEFT JOIN goals g ON a.brand = g.brand
    AND a.variant_size = g.variant_size
    AND a.distributor = g.distributor
    AND (
        a.channel = g.channel
        OR (
            a.channel IS NULL
            AND g.channel IS NULL
        )
    )
ORDER BY a.brand,
    a.variant_size,
    a.channel,
    a.distributor;