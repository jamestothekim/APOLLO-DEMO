import { useState, useMemo } from "react";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Paper,
  Typography,
  Collapse,
  IconButton,
  Button,
} from "@mui/material";
import {
  DIVISION_OPTIONS,
  STATE_MAPPINGS,
  BRAND_OPTIONS,
  NATIONAL_ACCOUNT_OPTIONS,
  initialProfitData,
  initialNationalAccountProfitData,
} from "../data/data";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

const ProfitModel = () => {
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedNationalAccount, setSelectedNationalAccount] =
    useState<string>("");
  const [expanded, setExpanded] = useState(true);
  const [expandedNational, setExpandedNational] = useState(true);

  const filteredStates = useMemo(() => {
    if (!selectedDivision) return STATE_MAPPINGS;
    return STATE_MAPPINGS.filter(
      (mapping) => mapping.division === selectedDivision
    );
  }, [selectedDivision]);

  const filteredData = useMemo(() => {
    return initialProfitData.filter((row) => {
      const divisionMatch =
        !selectedDivision || row.division === selectedDivision;
      const stateMatch = !selectedState || row.state === selectedState;
      const brandMatch = !selectedBrand || row.brand === selectedBrand;
      return divisionMatch && stateMatch && brandMatch;
    });
  }, [selectedDivision, selectedState, selectedBrand]);

  const filteredNationalData = useMemo(() => {
    return initialNationalAccountProfitData.filter((row) => {
      const accountMatch =
        !selectedNationalAccount || row.account === selectedNationalAccount;
      const brandMatch = !selectedBrand || row.brand === selectedBrand;
      return accountMatch && brandMatch;
    });
  }, [selectedNationalAccount, selectedBrand]);

  // Calculate aggregated data
  const aggregatedData = useMemo(() => {
    const monthKeys = Object.keys(filteredData[0]?.months || {});
    const aggregated: Record<string, any> = {};

    monthKeys.forEach((month) => {
      const monthData = filteredData.reduce(
        (acc, row) => {
          const data = row.months[month];
          const grossContribution =
            data.revenue -
            data.customerDiscount -
            data.cogs -
            (data.distributionCosts || 0);

          return {
            depletions: acc.depletions + data.volume,
            shipments: acc.shipments + (data.shipments || 0),
            grossSalesValue: acc.grossSalesValue + data.revenue,
            customerDiscounts: acc.customerDiscounts + data.customerDiscount,
            netSalesValue:
              acc.netSalesValue + (data.revenue - data.customerDiscount),
            cogs: acc.cogs + data.cogs + (data.distributionCosts || 0),
            grossContribution: acc.grossContribution + grossContribution,
            advertising: acc.advertising + data.advertising,
            promotions: acc.promotions + data.promotions,
            cmi: acc.cmi + data.cmi,
            profitAfterMarketing:
              acc.profitAfterMarketing +
              (grossContribution -
                data.advertising -
                data.promotions -
                data.cmi),
            isActual: data.isActual,
          };
        },
        {
          depletions: 0,
          shipments: 0,
          grossSalesValue: 0,
          customerDiscounts: 0,
          netSalesValue: 0,
          cogs: 0,
          grossContribution: 0,
          advertising: 0,
          promotions: 0,
          cmi: 0,
          profitAfterMarketing: 0,
          isActual: false,
        }
      );
      aggregated[month] = monthData;
    });

    return aggregated;
  }, [filteredData]);

  const aggregatedNationalData = useMemo(() => {
    const monthKeys = Object.keys(filteredNationalData[0]?.months || {});
    const aggregated: Record<string, any> = {};

    monthKeys.forEach((month) => {
      const monthData = filteredNationalData.reduce(
        (acc, row) => {
          const data = row.months[month];
          const grossContribution =
            data.revenue -
            data.customerDiscount -
            data.cogs -
            (data.distributionCosts || 0);

          return {
            depletions: acc.depletions + data.volume,
            shipments: acc.shipments + (data.shipments || 0),
            grossSalesValue: acc.grossSalesValue + data.revenue,
            customerDiscounts: acc.customerDiscounts + data.customerDiscount,
            netSalesValue:
              acc.netSalesValue + (data.revenue - data.customerDiscount),
            cogs: acc.cogs + data.cogs + (data.distributionCosts || 0),
            grossContribution: acc.grossContribution + grossContribution,
            advertising: acc.advertising + data.advertising,
            promotions: acc.promotions + data.promotions,
            cmi: acc.cmi + data.cmi,
            profitAfterMarketing:
              acc.profitAfterMarketing +
              (grossContribution -
                data.advertising -
                data.promotions -
                data.cmi),
            isActual: data.isActual,
          };
        },
        {
          depletions: 0,
          shipments: 0,
          grossSalesValue: 0,
          customerDiscounts: 0,
          netSalesValue: 0,
          cogs: 0,
          grossContribution: 0,
          advertising: 0,
          promotions: 0,
          cmi: 0,
          profitAfterMarketing: 0,
          isActual: false,
        }
      );
      aggregated[month] = monthData;
    });

    return aggregated;
  }, [filteredNationalData]);

  // Separate table data generation for regular and national accounts
  const generateTableData = (aggregatedData: Record<string, any>) => [
    {
      metric: "Depletions (9L)",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: aggregatedData[month].depletions,
        }),
        {}
      ),
    },
    {
      metric: "Shipments (9L)",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: aggregatedData[month].shipments,
        }),
        {}
      ),
    },
    {
      metric: "Gross Sales",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: aggregatedData[month].grossSalesValue,
        }),
        {}
      ),
    },
    {
      metric: "Customer Discounts",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: -aggregatedData[month].customerDiscounts,
        }),
        {}
      ),
    },
    {
      metric: "Net Sales Value",
      highlight: true,
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: aggregatedData[month].netSalesValue,
        }),
        {}
      ),
    },
    {
      metric: "COGS",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: -aggregatedData[month].cogs,
        }),
        {}
      ),
    },
    {
      metric: "Gross Contribution",
      highlight: true,
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: aggregatedData[month].grossContribution,
        }),
        {}
      ),
    },
    {
      metric: "Advertising",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: -aggregatedData[month].advertising,
        }),
        {}
      ),
    },
    {
      metric: "Promotions",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: -aggregatedData[month].promotions,
        }),
        {}
      ),
    },
    {
      metric: "CMI",
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: -aggregatedData[month].cmi,
        }),
        {}
      ),
    },
    {
      metric: "Profit After Marketing",
      highlight: true,
      ...Object.keys(aggregatedData).reduce(
        (acc, month) => ({
          ...acc,
          [month]: aggregatedData[month].profitAfterMarketing,
        }),
        {}
      ),
    },
  ];

  // Generate separate table data for each section
  const regularTableData = useMemo(
    () => generateTableData(aggregatedData),
    [aggregatedData]
  );

  const nationalTableData = useMemo(
    () => generateTableData(aggregatedNationalData),
    [aggregatedNationalData]
  );

  // Create columns configuration
  const createColumns = (aggregatedData: Record<string, any>): Column[] => [
    {
      key: "metric",
      header: "METRIC",
      align: "left",
      sx: (row: any) => ({
        backgroundColor: row.highlight
          ? "rgba(255, 223, 186, 0.3)"
          : "background.paper",
        fontWeight: row.highlight ? 600 : 400,
      }),
    },
    ...Object.keys(aggregatedData).map((month) => ({
      key: month,
      header: month,
      subHeader: aggregatedData[month].isActual ? "ACT" : "FCST",
      align: "right" as const,
      render: (_: any, row: any) => {
        const value = row[month];
        return (
          <Box
            component="span"
            sx={{
              color: value < 0 ? "error.main" : "inherit",
            }}
          >
            {value < 0
              ? `(${Math.abs(value).toLocaleString()})`
              : value.toLocaleString()}
          </Box>
        );
      },
      sx: { backgroundColor: "background.paper" },
    })),
    {
      key: "total",
      header: "TOT",
      align: "right",
      render: (_: any, row: any) => {
        const total = Object.keys(aggregatedData).reduce(
          (acc, month) => acc + row[month],
          0
        );
        return (
          <Box
            component="span"
            sx={{
              color: total < 0 ? "error.main" : "inherit",
            }}
          >
            {total < 0
              ? `(${Math.abs(total).toLocaleString()})`
              : total.toLocaleString()}
          </Box>
        );
      },
      sx: { backgroundColor: "background.paper" },
    },
  ];

  const regularColumns = useMemo(
    () => createColumns(aggregatedData),
    [aggregatedData]
  );

  const nationalColumns = useMemo(
    () => createColumns(aggregatedNationalData),
    [aggregatedNationalData]
  );

  const exportToExcel = (data: any[], tableName: string) => {
    // Convert data to CSV format
    const headers = [
      "Metric",
      ...Object.keys(data[0]).filter(
        (key) => key !== "metric" && key !== "highlight"
      ),
    ];
    const csvContent = [
      headers.join(","),
      ...data.map((row) => {
        return [
          row.metric,
          ...headers.slice(1).map((header) => row[header]),
        ].join(",");
      }),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${tableName}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper
        elevation={3}
        sx={{
          backgroundColor: "background.paper",
          "& .MuiTableRow-root:nth-of-type(odd)": {
            backgroundColor: "grey.50",
          },
          "& .MuiTableRow-root:nth-of-type(even)": {
            backgroundColor: "background.paper",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <IconButton size="small">
            {expanded ? <RemoveIcon /> : <AddIcon />}
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              userSelect: "none",
            }}
          >
            PROFIT MODEL
          </Typography>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    fontWeight: "500",
                    textTransform: "uppercase",
                    fontSize: "0.875rem",
                  }}
                >
                  FILTERS:
                </Typography>
                <FormControl sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedDivision}
                    onChange={(e: SelectChangeEvent) =>
                      setSelectedDivision(e.target.value)
                    }
                    size="small"
                    sx={{ fontSize: "0.875rem" }}
                    displayEmpty
                  >
                    <MenuItem value="">All Divisions</MenuItem>
                    {DIVISION_OPTIONS.map((division) => (
                      <MenuItem key={division} value={division}>
                        {division}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedState}
                    onChange={(e: SelectChangeEvent) =>
                      setSelectedState(e.target.value)
                    }
                    size="small"
                    sx={{ fontSize: "0.875rem" }}
                    displayEmpty
                  >
                    <MenuItem value="">All States</MenuItem>
                    {filteredStates.map(({ state }) => (
                      <MenuItem key={state} value={state}>
                        {state}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedBrand}
                    onChange={(e: SelectChangeEvent) =>
                      setSelectedBrand(e.target.value)
                    }
                    size="small"
                    sx={{ fontSize: "0.875rem" }}
                    displayEmpty
                  >
                    <MenuItem value="">All Brands</MenuItem>
                    {BRAND_OPTIONS.map((brand) => (
                      <MenuItem key={brand} value={brand}>
                        {brand}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FileDownloadIcon />}
                onClick={() => exportToExcel(regularTableData, "Profit_Model")}
                sx={{ height: 40 }}
              >
                Export to Excel
              </Button>
            </Box>

            <DynamicTable
              data={regularTableData}
              columns={regularColumns}
              showPagination={false}
              onRowClick={undefined}
            />
          </Box>
        </Collapse>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          backgroundColor: "background.paper",
          "& .MuiTableRow-root:nth-of-type(odd)": {
            backgroundColor: "grey.50",
          },
          "& .MuiTableRow-root:nth-of-type(even)": {
            backgroundColor: "background.paper",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
          }}
          onClick={() => setExpandedNational(!expandedNational)}
        >
          <IconButton size="small">
            {expandedNational ? <RemoveIcon /> : <AddIcon />}
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              userSelect: "none",
            }}
          >
            NATIONAL ACCOUNTS
          </Typography>
        </Box>

        <Collapse in={expandedNational}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    fontWeight: "500",
                    textTransform: "uppercase",
                    fontSize: "0.875rem",
                  }}
                >
                  FILTERS:
                </Typography>
                <FormControl sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedNationalAccount}
                    onChange={(e: SelectChangeEvent) =>
                      setSelectedNationalAccount(e.target.value)
                    }
                    size="small"
                    sx={{ fontSize: "0.875rem" }}
                    displayEmpty
                  >
                    <MenuItem value="">All Accounts</MenuItem>
                    {NATIONAL_ACCOUNT_OPTIONS.map((account) => (
                      <MenuItem key={account} value={account}>
                        {account}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedBrand}
                    onChange={(e: SelectChangeEvent) =>
                      setSelectedBrand(e.target.value)
                    }
                    size="small"
                    sx={{ fontSize: "0.875rem" }}
                    displayEmpty
                  >
                    <MenuItem value="">All Brands</MenuItem>
                    {BRAND_OPTIONS.map((brand) => (
                      <MenuItem key={brand} value={brand}>
                        {brand}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FileDownloadIcon />}
                onClick={() =>
                  exportToExcel(nationalTableData, "National_Accounts")
                }
                sx={{ height: 40 }}
              >
                Export to Excel
              </Button>
            </Box>

            <DynamicTable
              data={nationalTableData}
              columns={nationalColumns}
              showPagination={false}
              onRowClick={undefined}
            />
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default ProfitModel;
