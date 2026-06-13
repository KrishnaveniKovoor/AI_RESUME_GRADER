import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#b8e7e8',
      paper: '#ade8f4',
    },
    text: {
      primary: '#03045E',
      secondary: '#023e8a',
    },
    primary: {
      main: '#0096c7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00b4d8',
      contrastText: '#f7f9f9',
    },
    info: {
      main: '#0077B6',
      contrastText: '#f7f9f9',
    },
    success: {
      main: '#8dd9dc',
      contrastText: '#f7f9f9',
    },
    divider: '#90e0ef',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#b8e7e8',
          color: '#03045E',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 35px rgba(3, 4, 94, 0.12)',
          backgroundColor: '#ade8f4',
          border: '1px solid rgba(3, 4, 94, 0.14)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          boxShadow: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          backgroundColor: '#0096c7',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#0077b6',
            boxShadow: '0 4px 14px rgba(0, 119, 182, 0.35)',
          },
        },
        outlined: {
          borderColor: '#0096c7',
          color: '#0096c7',
          '&:hover': {
            borderColor: '#0077b6',
            backgroundColor: 'rgba(0, 150, 199, 0.08)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        bar: {
          backgroundColor: '#00b4d8',
        },
        root: {
          backgroundColor: '#caf0f8',
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#020d2e',
      paper: '#0a1f4e',
    },
    text: {
      primary: '#e8f4fd',
      secondary: '#90e0ef',
    },
    primary: {
      main: '#48cae4',
      contrastText: '#020d2e',
    },
    secondary: {
      main: '#00b4d8',
      contrastText: '#f7f9f9',
    },
    info: {
      main: '#0096c7',
      contrastText: '#f7f9f9',
    },
    success: {
      main: '#48cae4',
      contrastText: '#020d2e',
    },
    divider: 'rgba(72, 202, 228, 0.25)',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#020d2e',
          color: '#e8f4fd',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55)',
          backgroundColor: '#0a1f4e',
          border: '1px solid rgba(72, 202, 228, 0.18)',
          color: '#e8f4fd',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a1f4e',
          color: '#e8f4fd',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: 'inherit',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          boxShadow: 'none',
        },
        containedPrimary: {
          backgroundColor: '#0096c7',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#0077b6',
          },
        },
        outlined: {
          borderColor: '#48cae4',
          color: '#48cae4',
          '&:hover': {
            borderColor: '#90e0ef',
            backgroundColor: 'rgba(72, 202, 228, 0.08)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        bar: {
          backgroundColor: '#48cae4',
        },
        root: {
          backgroundColor: 'rgba(72, 202, 228, 0.2)',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: '#0d2860',
          color: '#e8f4fd',
          '&:before': {
            backgroundColor: 'rgba(72, 202, 228, 0.18)',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          color: '#e8f4fd',
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          color: '#caf0f8',
        },
      },
    },
  },
});
