import { useDispatch } from 'react-redux';
import { setVolumeForecastMarkets, setVolumeForecastBrands, setVolumeForecastTags } from '../redux/slices/userSettingsSlice';

const VolumeForecast = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/users/settings`);
        const { forecast_selected_markets, forecast_selected_brands, forecast_selected_tags } = response.data;
        
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
 