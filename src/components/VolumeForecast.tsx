import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  setVolumeForecastMarkets,
  setVolumeForecastBrands,
  setVolumeForecastTags,
} from "../redux/slices/userSettingsSlice";
import { VolumeForecast as MainVolumeForecast } from "../volume/volumeForecast";

const VolumeForecast = () => {
  const dispatch = useDispatch();
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<any[]>([]);

  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/settings`
        );
        const {
          forecast_selected_markets,
          forecast_selected_brands,
          forecast_selected_tags,
        } = response.data;

        if (forecast_selected_markets) {
          dispatch(setVolumeForecastMarkets(forecast_selected_markets));
          setSelectedMarkets(forecast_selected_markets);
        }
        if (forecast_selected_brands) {
          dispatch(setVolumeForecastBrands(forecast_selected_brands));
          setSelectedBrands(forecast_selected_brands);
        }
        if (forecast_selected_tags) {
          dispatch(setVolumeForecastTags(forecast_selected_tags));
          setSelectedTags(forecast_selected_tags);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    const loadMarketData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/markets`
        );
        setMarketData(response.data);
      } catch (error) {
        console.error("Error loading market data:", error);
      }
    };

    const loadBrands = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/brands`
        );
        setAvailableBrands(response.data);
      } catch (error) {
        console.error("Error loading brands:", error);
      }
    };

    loadInitialSettings();
    loadMarketData();
    loadBrands();
  }, [dispatch]);

  return (
    <MainVolumeForecast
      availableBrands={availableBrands}
      marketData={marketData}
    />
  );
};

export default VolumeForecast;
