import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import { MenuItem, TextField } from "@mui/material";

interface CustomerData {
  market: string;
  customer_actual_data: string;
  planning_member: string;
  customer_stat_level: string;
  managed_by: "Market" | "Customer";
  weight_percentage?: number;
}

export const CustomerMaster = () => {
  const [data, setData] = useState<CustomerData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/customer-master`
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching SKU data:", error);
      }
    };

    fetchData();
  }, []);

  const handleManagedByChange = async (value: "Market" | "Customer") => {
    if (!selectedCustomer) return;

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/customer-master/managed-by`,
        {
          customer_actual_data: selectedCustomer.customer_actual_data,
          managed_by: value,
        }
      );

      const updatedCustomer = { ...selectedCustomer, managed_by: value };
      setSelectedCustomer(updatedCustomer);

      setData((prev) =>
        prev.map((item) =>
          item.customer_actual_data === selectedCustomer.customer_actual_data
            ? updatedCustomer
            : item
        )
      );
    } catch (error) {
      console.error("Error updating managed by:", error);
    }
  };

  const handleWeightPercentageChange = async (
    customerId: string,
    value: number
  ) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/customer-master/weight`,
        {
          customer_actual_data: customerId,
          weight_percentage: value,
        }
      );

      setData((prev) =>
        prev.map((item) =>
          item.customer_actual_data === customerId
            ? { ...item, weight_percentage: value }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating weight percentage:", error);
    }
  };

  const columns: Column[] = [
    {
      key: "market",
      header: "Market",
      render: (value) => value,
    },
    {
      key: "customer_actual_data",
      header: "Customer",
      render: (value) => value,
    },
    {
      key: "planning_member",
      header: "Planning Member",
      render: (value) => value,
    },
    {
      key: "customer_stat_level",
      header: "Stat Level",
      render: (value) => value,
    },
    {
      key: "managed_by",
      header: "Managed By",
      render: () => "Market", // Hardcoded to "Market" for now
    },
  ];

  const marketCustomers = data.filter(
    (customer) => customer.market === selectedCustomer?.market
  );

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      <DynamicTable
        data={data}
        columns={columns}
        getRowId={(row) => row.customer_actual_data}
        defaultRowsPerPage={20}
        rowsPerPageOptions={[20, 50, 100]}
        onRowClick={(row) => {
          setSelectedCustomer(row);
          setSidebarOpen(true);
        }}
      />

      <QualSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        width="400px"
        tabs={[
          {
            label: "Customer Details",
            component: (
              <Box sx={{ p: 2 }}>
                {/* Customer Details Section */}
                <TextField
                  label="Market"
                  value={selectedCustomer?.market || ""}
                  fullWidth
                  margin="normal"
                  disabled
                />
                <TextField
                  label="Customer"
                  value={selectedCustomer?.customer_actual_data || ""}
                  fullWidth
                  margin="normal"
                  disabled
                />
                <TextField
                  label="Planning Member"
                  value={selectedCustomer?.planning_member || ""}
                  fullWidth
                  margin="normal"
                  disabled
                />
                <TextField
                  label="Stat Level"
                  value={selectedCustomer?.customer_stat_level || ""}
                  fullWidth
                  margin="normal"
                  disabled
                />

                {/* Management Section */}
                <Box sx={{ mt: 4, mb: 2 }}>
                  <TextField
                    select
                    label="Managed By"
                    value={selectedCustomer?.managed_by || "Market"}
                    onChange={(e) =>
                      handleManagedByChange(
                        e.target.value as "Market" | "Customer"
                      )
                    }
                    fullWidth
                  >
                    <MenuItem value="Market">Market</MenuItem>
                    <MenuItem value="Customer">Customer</MenuItem>
                  </TextField>
                </Box>

                {/* Volume Distribution Section - Only enabled if managed by Customer */}
                {selectedCustomer?.managed_by === "Customer" && (
                  <Box sx={{ mt: 4 }}>
                    <Box sx={{ mb: 2, fontWeight: "bold" }}>
                      Volume Distribution
                    </Box>
                    {marketCustomers.map((customer) => (
                      <TextField
                        key={customer.customer_actual_data}
                        label={customer.customer_stat_level}
                        type="number"
                        value={customer.weight_percentage || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            handleWeightPercentageChange(
                              customer.customer_actual_data,
                              value
                            );
                          }
                        }}
                        fullWidth
                        margin="normal"
                        InputProps={{
                          endAdornment: "%",
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ),
          },
        ]}
      />
    </Box>
  );
};
