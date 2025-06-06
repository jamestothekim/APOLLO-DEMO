CREATE OR REPLACE VIEW wg_fivestar.vw_total_us_variant AS
SELECT g.brand,
    g.variant,
    g.channel,
    SUM(g.fy_goal) AS fy_goal,
    COUNT(DISTINCT s.outlet_id) AS pod_sold,
    SUM(g.fy_goal) - COUNT(DISTINCT s.outlet_id) AS distance_to_go,
    ROUND(
        100.0 * COUNT(DISTINCT s.outlet_id) / NULLIF(SUM(g.fy_goal), 0)
    ) || '%' AS achievement_pct,
    NULL::VARCHAR AS vs_ly_achievement_pct -- Placeholder for future calculation
FROM wg_fivestar.wgs_variant_goals g
    LEFT JOIN vw_account_sales_with_market s ON g.year = s.year
    AND g.brand = s.brand
    AND g.variant = s.variant
    AND g.channel = s.vip_cot_premise_type_desc
    AND (
        CASE
            WHEN s.customers::jsonb->0->>'customer_stat_level' LIKE '%Break Thru%' THEN 'Breakthru'
            WHEN s.customers::jsonb->0->>'customer_stat_level' LIKE '%RNDC-Youngs%' THEN 'RNDC'
            ELSE 'Independent'
        END
    ) = g.distributor
WHERE g.year = 2025
GROUP BY g.brand,
    g.variant,
    g.channel
ORDER BY g.brand,
    g.variant,
    g.channel;