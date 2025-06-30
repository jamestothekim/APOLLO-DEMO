import { useEffect, useState } from "react";
import {
  Stack,
  Button,
  Typography,
  TextField,
  Tabs,
  Tab,
  Checkbox,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
} from "@mui/material";
import axios from "axios";
import { syncMaster } from "./atlas";

interface FieldMeta {
  name: string;
}

interface DataFormatProps {
  system: string;
  config: syncMaster;
  onBack: () => void; // cancel
  onSave: () => void; // save & close
  onFieldChange: (fieldPath: string[], value: any) => void;
}

export const DataFormat = ({
  system,
  config,
  onBack,
  onSave,
  onFieldChange,
}: DataFormatProps) => {
  // ----- local ui state -----
  const [tab, setTab] = useState<"markets" | "skus">("markets");
  const [marketFields, setMarketFields] = useState<FieldMeta[]>([]);
  const [skuFields, setSkuFields] = useState<FieldMeta[]>([]);

  // local draft edits – copy of parent config so user can cancel
  const [selected, setSelected] = useState<string[]>(config.selectedFields);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>(
    config.headerMap
  );
  const [primaryKey, setPrimaryKey] = useState<string[]>(
    config.primaryKey || []
  );
  const [delimiter, setDelimiter] = useState<string>(config.delimiter);

  // fetch field lists once
  useEffect(() => {
    const fetchFieldLists = async () => {
      try {
        const [marketsRes, skuRes] = await Promise.all([
          axios.get<string[]>(
            `${import.meta.env.VITE_API_URL}/syncMaster/market-fields`
          ),
          axios.get<string[]>(
            `${import.meta.env.VITE_API_URL}/syncMaster/sku-fields`
          ),
        ]);
        setMarketFields(marketsRes.data.map((name) => ({ name })));
        setSkuFields(skuRes.data.map((name) => ({ name })));
      } catch (err) {
        console.error("Error loading field lists", err);
      }
    };
    fetchFieldLists();
  }, []);

  const currentFields = tab === "markets" ? marketFields : skuFields;

  const toggleSelected = (field: string) => {
    setSelected((prev) => {
      const included = prev.includes(field);
      if (included) {
        // removing field – clean up header map
        setHeaderMap((m) => {
          const { [field]: _omit, ...rest } = m;
          return rest;
        });
        return prev.filter((f) => f !== field);
      }
      // adding field – default header to field name if not already set
      setHeaderMap((m) => (m[field] ? m : { ...m, [field]: field }));
      return [...prev, field];
    });
  };

  const updateHeader = (field: string, value: string) => {
    setHeaderMap((prev) => ({ ...prev, [field]: value }));
  };

  // Only allow a single field to be selected as the primary key
  const togglePK = (field: string) => {
    setPrimaryKey((prev) => (prev[0] === field ? [] : [field]));
  };

  const handleSave = () => {
    onFieldChange(["delimiter"], delimiter);
    onFieldChange(["selectedFields"], selected);
    onFieldChange(["headerMap"], headerMap);
    onFieldChange(["primaryKey"], primaryKey);
    onSave();
  };

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Typography variant="h6">Format Data – {system}</Typography>

      {/* tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab value="markets" label="Markets" />
        <Tab value="skus" label="SKUs" />
      </Tabs>

      <TableContainer component={Paper} sx={{ maxHeight: 340 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"></TableCell>
              <TableCell>Field</TableCell>
              <TableCell>Header</TableCell>
              <TableCell padding="checkbox">PK</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentFields.map(({ name }) => {
              const included = selected.includes(name);
              return (
                <TableRow key={name} hover selected={included}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={included}
                      onChange={() => toggleSelected(name)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{name}</TableCell>
                  <TableCell>
                    <TextField
                      value={headerMap[name] ?? (included ? name : "")}
                      onChange={(e) => updateHeader(name, e.target.value)}
                      size="small"
                      disabled={!included}
                    />
                  </TableCell>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={primaryKey.includes(name)}
                      onChange={() => togglePK(name)}
                      size="small"
                      disabled={!included}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary with delimiter control */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="body2">
          Primary Key: {primaryKey.length ? primaryKey.join(" + ") : "— none —"}
        </Typography>
        <TextField
          label="Delimiter"
          value={delimiter}
          onChange={(e) => setDelimiter(e.target.value)}
          size="small"
          inputProps={{
            maxLength: 2,
            style: { width: 40, textAlign: "center" },
          }}
          placeholder="," // default comma
          sx={{ width: 120 }}
        />
      </Stack>

      {/* Sticky footer buttons */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          px: 0,
          py: 1,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          mb: 0,
        }}
      >
        <Button onClick={onBack}>Back</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!primaryKey.length}
        >
          Save
        </Button>
      </Box>
    </Stack>
  );
};
