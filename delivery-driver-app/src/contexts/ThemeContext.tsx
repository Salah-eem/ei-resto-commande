import React, { createContext, useContext, useReducer, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    notification: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    surface: string;
    surfaceVariant: string;
  };
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: "#4CAF50",
    background: "#ffffff",
    card: "#ffffff",
    text: "#000000",
    textSecondary: "#666666",
    border: "#e0e0e0",
    notification: "#4CAF50",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3",
    surface: "#f8f9fa",
    surfaceVariant: "#f0f0f0",
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: "#66BB6A",
    background: "#121212",
    card: "#1E1E1E",
    text: "#ffffff",
    textSecondary: "#B0B0B0",
    border: "#333333",
    notification: "#66BB6A",
    success: "#66BB6A",
    warning: "#FFB74D",
    error: "#EF5350",
    info: "#42A5F5",
    surface: "#1E1E1E",
    surfaceVariant: "#2A2A2A",
  },
};

interface ThemeState {
  theme: Theme;
  isDark: boolean;
}

type ThemeAction =
  | { type: "TOGGLE_THEME" }
  | { type: "SET_THEME"; payload: boolean };

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case "TOGGLE_THEME":
      return {
        ...state,
        isDark: !state.isDark,
        theme: !state.isDark ? darkTheme : lightTheme,
      };
    case "SET_THEME":
      return {
        ...state,
        isDark: action.payload,
        theme: action.payload ? darkTheme : lightTheme,
      };
    default:
      return state;
  }
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@delivery_app_theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(themeReducer, {
    theme: lightTheme,
    isDark: false,
  });

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    saveTheme(state.isDark);
  }, [state.isDark]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        const isDark = JSON.parse(savedTheme);
        dispatch({ type: "SET_THEME", payload: isDark });
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const saveTheme = async (isDark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(isDark));
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const toggleTheme = () => {
    dispatch({ type: "TOGGLE_THEME" });
  };

  const setTheme = (isDark: boolean) => {
    dispatch({ type: "SET_THEME", payload: isDark });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: state.theme,
        isDark: state.isDark,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
