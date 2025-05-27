import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  setVolumeForecastMarkets,
  setVolumeForecastBrands,
  setVolumeForecastTags,
} from "../redux/slices/userSettingsSlice";

const VolumeForecast = () => {
  const dispatch = useDispatch();
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

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

    loadInitialSettings();
  }, [dispatch]);

  return null; // Add your JSX here
};

export default VolumeForecast;
