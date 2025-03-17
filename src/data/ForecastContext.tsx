import React, { useState } from "react";

// Create a new context for forecast data
export const ForecastContext = React.createContext<{
  forecastData: ForecastData[];
  updateForecastData: (data: ForecastData[]) => void;
}>({
  forecastData: [],
  updateForecastData: () => {},
});

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
