import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";

export const SKUMaster = () => {
  const [data, setData] = useState<any[]>([]); // Use any[] for flexibility

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/sku-master`
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching SKU data:", error);
      }
    };

    fetchData();
  }, []);

  const columns: Column[] = [
    {
      key: "brand",
      header: "Brand",
      render: (value) => value,
    },
    {
      key: "variant",
      header: "Variant",
      render: (value) => value,
    },
    {
      key: "size_pack",
      header: "Size Pack",
      render: (value) => value,
    },
    {
      key: "hyperion_sku",
      header: "Hyperion SKU",
      render: (value) => value,
    },
  ];

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      <DynamicTable
        data={data}
        columns={columns}
        getRowId={(row) => row.hyperion_sku}
        defaultRowsPerPage={20}
        rowsPerPageOptions={[20, 50, 100]}
      />
    </Box>
  );
};
