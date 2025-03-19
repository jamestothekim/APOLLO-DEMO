import React, { useState } from "react";

// Create a new context for forecast data
export const ForecastContext = React.createContext<{
  forecastData: ForecastData[];
  updateForecastData: (data: ForecastData[]) => void;
}>({
  forecastData: [],
  updateForecastData: () => {},
});

interface ForecastData {
  // Add the properties that your forecast data contains
  id?: string;
  market_id?: string;
  market_name?: string;
  product?: string;
  months?: Record<string, any>;
  // Add other properties as needed
}

export const ForecastProvider: React.FC = ({ children }) => {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);

  const updateForecastData = (newData: ForecastData[]) => {
    setForecastData(newData);
  };

  return (
    <ForecastContext.Provider value={{ forecastData, updateForecastData }}>
      {children}
    </ForecastContext.Provider>
  );
};
