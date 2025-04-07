import { Column } from "../reusableComponents/dynamicTable";
import { formatNumber } from "../utils/formatters";

// Define months array if not already defined
const months = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const monthColumns: Column[] = months.map((month: string) => ({
  key: `months.${month}`,
  header: month,
  align: "right",
  sortable: true,
  render: (value: any) => (
    <div style={{ textAlign: "right" }}>
      {value?.value != null ? formatNumber(value.value) : "-"}
    </div>
  ),
  sortField: "value",
}));
