import { ReportConfig } from '../../redux/slices/dashboardSlice';
import { AggregationResult, TIME_SERIES_DIMENSION_IDS } from '../../reportBuilder/reportUtil/reportUtil';

/**
 * Determines if the configuration and data are suitable for displaying a line chart.
 *
 * @param config The report configuration.
 * @param aggregationResult The result of data aggregation.
 * @returns True if a line chart should be shown, false otherwise.
 */
export const shouldShowLineChart = (
    config: ReportConfig,
    aggregationResult: AggregationResult
): boolean => {

    // Check if a time series dimension is used in rows or columns
    const hasTimeSeries = !!(
        (config.rowDimId && TIME_SERIES_DIMENSION_IDS.includes(config.rowDimId)) ||
        (config.colDimId && TIME_SERIES_DIMENSION_IDS.includes(config.colDimId))
    );

    // Check if the aggregated value is numeric
    const isNumeric =
        aggregationResult.valueFormat === 'number' ||
        aggregationResult.valueFormat === 'currency';

    // Check if there is data to plot
    const hasData = (
        aggregationResult.data?.length > 0 ||
        aggregationResult.rows?.length > 0 ||
        aggregationResult.columns?.length > 0
    );

    return hasTimeSeries && isNumeric && hasData;
};

/**
 * Determines if the configuration and data are suitable for displaying a pie chart.
 *
 * @param config The report configuration.
 * @param aggregationResult The result of data aggregation.
 * @returns True if a pie chart should be shown, false otherwise.
 */
export const shouldShowPieChart = (
    config: ReportConfig,
    aggregationResult: AggregationResult
): boolean => {

    // Check 1: Exactly one dimension selected
    const singleDimensionId = config.rowDimId && !config.colDimId
        ? config.rowDimId
        : config.colDimId && !config.rowDimId
        ? config.colDimId
        : null;

    // Check 2: The single dimension is not time-based
    const dimensionIsNotTimeSeries = singleDimensionId
        ? !TIME_SERIES_DIMENSION_IDS.includes(singleDimensionId)
        : false;

    // Check 3: Measure selected
    const hasMeasure = !!config.calcId;

    // Check 4: Numeric values
    const isNumeric =
        aggregationResult.valueFormat === 'number' ||
        aggregationResult.valueFormat === 'currency';

    // Check 5: More than one slice exists
    const hasMultipleSlices = singleDimensionId === config.rowDimId
        ? aggregationResult.rows?.length > 1
        : singleDimensionId === config.colDimId
        ? aggregationResult.columns?.length > 1
        : false;


    return !!singleDimensionId &&
           dimensionIsNotTimeSeries &&
           hasMeasure &&
           isNumeric &&
           hasMultipleSlices;
};
