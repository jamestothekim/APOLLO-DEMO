import React from "react";
import {
  Drawer,
  Box,
  Tabs,
  Tab,
  useTheme,
  Paper,
  Stack,
  Typography,
  Button,
  Grid,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sliding-sidebar-tabpanel-${index}`}
      aria-labelledby={`sliding-sidebar-tab-${index}`}
      style={{ height: "100%" }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `sliding-sidebar-tab-${index}`,
    "aria-controls": `sliding-sidebar-tabpanel-${index}`,
  };
}

export interface TabConfig {
  label: React.ReactNode;
  component: React.ReactNode;
}

export interface FooterButton {
  label: string;
  onClick: () => void;
  variant?: "text" | "outlined" | "contained";
  disabled?: boolean;
  color?: "inherit" | "primary" | "secondary" | "error";
}

export interface SidebarSection {
  title?: string;
  content: React.ReactNode;
  fullWidth?: boolean;
}

interface QualSidebarProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  tabs?: TabConfig[];
  activeTab?: number;
  onTabChange?: (newValue: number) => void;
  width?: string | number;
  maxWidth?: string | number;
  children?: React.ReactNode;
  footerButtons?: FooterButton[];
  showCloseButton?: boolean;
  sections?: SidebarSection[];
}

const QualSidebar: React.FC<QualSidebarProps> = ({
  open,
  onClose,
  title,
  tabs,
  activeTab = 0,
  onTabChange,
  width = "600px",
  maxWidth = "800px",
  children,
  footerButtons,
  showCloseButton = true,
  sections = [],
}) => {
  const theme = useTheme();

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    onTabChange?.(newValue);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width,
          maxWidth,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">{title}</Typography>
        {showCloseButton && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 3,
          "& .MuiOutlinedInput-root": { height: "40px" },
          "& .MuiAutocomplete-root .MuiOutlinedInput-root": {
            height: "auto",
            minHeight: "40px",
            "& .MuiOutlinedInput-input": {
              height: "auto",
              minHeight: "1.4375em",
            },
            "& .MuiInputBase-multiline": {
              padding: "0",
            },
          },
        }}
      >
        {tabs ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs value={activeTab} onChange={handleChange}>
                {tabs.map((tab, index) => (
                  <Tab key={index} label={tab.label} {...a11yProps(index)} />
                ))}
              </Tabs>
            </Box>
            <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
              {tabs.map((tab, index) => (
                <TabPanel key={index} value={activeTab} index={index}>
                  {tab.component}
                </TabPanel>
              ))}
            </Box>
          </>
        ) : sections.length > 0 ? (
          <Grid container spacing={3}>
            {sections.map((section, index) => (
              <Grid item xs={12} key={index}>
                {section.title && (
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {section.title}
                  </Typography>
                )}
                <Box sx={{ width: section.fullWidth ? "100%" : "auto" }}>
                  {section.content}
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          children
        )}
      </Box>

      {/* Footer */}
      {footerButtons && footerButtons.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            bgcolor: theme.palette.background.paper,
          }}
        >
          {footerButtons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant || "contained"}
              onClick={button.onClick}
              disabled={button.disabled}
              color={button.color || "primary"}
            >
              {button.label}
            </Button>
          ))}
        </Box>
      )}
    </Drawer>
  );
};

export const SidebarSection: React.FC<{
  title?: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <Stack spacing={2}>
      {title && <Typography variant="h6">{title}</Typography>}
      <Paper elevation={0} sx={{ p: 2 }}>
        <Stack spacing={2}>{children}</Stack>
      </Paper>
    </Stack>
  );
};

export default QualSidebar;
