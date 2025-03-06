import { createTheme } from "@mui/material/styles";

declare module '@mui/material/styles' {
    interface Palette {
      custom: {
        sidebar: string;
        background: string;
      };
    }
    interface PaletteOptions {
      custom?: {
        sidebar?: string;
        background?: string;
      };
    }
    interface Components {
      MuiAppContainer?: {
        styleOverrides?: {
          root?: React.CSSProperties;
        };
      };
    }
    interface TypeText {
      tertiary: string;
    }
  }
  
  const theme = createTheme({
    palette: {
      primary: {
        main: '#6B20F5', // A vibrant purple color
      },
      secondary: {
        main: '#816EB4', // A muted lavender or light purple color
      },
      text: {
        primary: '#020239', // A very dark navy blue, almost black
        secondary: '#8678A7', // A very light grayish-blue, almost white
        tertiary: '#E1E2EF', // A very light grayish-blue, almost white
      },
      background: {
        default: '#FAF8FF', // Light background
        paper: '#F5F5F5', // Light grey for Paper components
      },
      custom: {
        sidebar: '#FAF8FF', // Light background
        background: '#FAF8FF', // Light background
      },
    },
    typography: {
      fontFamily: 'Avenir, Helvetica, Arial, sans-serif',
      fontSize: 12,
      // Adjust specific variants
      h5: {
        fontSize: '1.2rem',
      },
      h6: {
        fontSize: '1rem',
      },
      body1: {
        fontSize: '0.9rem', // 14px
      },
      body2: {
        fontSize: '0.8rem',  // 12px
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'html, body': {
            backgroundColor: '#FAF8FF', // Light background
            margin: 0,
            padding: 0,
            minHeight: '100vh',
            minWidth: '100vw',
          },
          body: {
            backgroundColor: '#FAF8FF', // Light background
            color: '#020239', // A very dark navy blue, almost black
            fontFamily: 'Avenir, Helvetica, Arial, sans-serif',
          },
          '#root': {
            backgroundColor: '#FAF8FF', // Light background
            minHeight: '100vh',
            minWidth: '100vw',
          },
          'h1, h2, h3, h4, h5, h6, p, span, div': {
            fontFamily: 'Avenir, Helvetica, Arial, sans-serif',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#FAF8FF', // Light background
            color: '#000000', // Black color
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: '#000000', // Black color
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            color: '#000000', // Black color
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#F5F5F5', // Light grey background for all Paper components
          },
        },
      },
      MuiAppContainer: {
        styleOverrides: {
          root: {
            display: 'flex',
            backgroundColor: '#FAF8FF', // Light background
            minHeight: '100vh',
            minWidth: '100vw',
            paddingRight: '35px !important' 
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              boxShadow: 'none',
            },
            '&::before': {
              display: 'none',
            },
            '&::after': {
              display: 'none',
            },
            border: 'none',
            borderRadius: 0,
            outline: 'none',
            '&:focus': {
              outline: 'none',
            },
            '&:focus-visible': {
              outline: 'none',
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            border: 'none',
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTabs-flexContainer': {
              border: 'none',
            },
            '& .MuiTabs-indicator': {
              height: '2px',
              backgroundColor: '#6B20F5',
            },
            boxShadow: 'none',
            '& .MuiButtonBase-root': {
              boxShadow: 'none',
            },
          },
          indicator: {
            height: '2px',
          },
          scroller: {
            boxShadow: 'none',
          },
        },
      },
    },
  });
  
  export default theme;