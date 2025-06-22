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
} from "@mui/material";
import axios from "axios";
import { StagingConfig } from "./stagingDialog";

interface FieldMeta {
  name: string;
}

interface DataFormatProps {
  system: string;
  config: StagingConfig;
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
            `${import.meta.env.VITE_API_URL}/atlas/market-fields`
          ),
          axios.get<string[]>(
            `${import.meta.env.VITE_API_URL}/atlas/sku-fields`
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
    setSelected((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const updateHeader = (field: string, value: string) => {
    setHeaderMap((prev) => ({ ...prev, [field]: value }));
  };

  const togglePK = (field: string) => {
    setPrimaryKey((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
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

      {/* delimiter */}
      <TextField
        label="Delimiter"
        value={delimiter}
        onChange={(e) => setDelimiter(e.target.value)}
        size="small"
        inputProps={{ maxLength: 2, style: { width: 60 } }}
      />

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
                      value={headerMap[name] || ""}
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

      {/* Summary */}
      <Typography variant="body2">
        Primary Key: {primaryKey.length ? primaryKey.join(" + ") : "— none —"}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <Button onClick={onBack}>Back</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!primaryKey.length}
        >
          Save
        </Button>
      </Stack>
    </Stack>
  );
};
