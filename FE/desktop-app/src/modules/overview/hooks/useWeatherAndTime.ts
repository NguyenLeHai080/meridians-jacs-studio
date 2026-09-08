import { useState, useEffect, useCallback } from "react";

export type WeatherInfo = {
  temp: number;
  condition: string;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
  city: string;
  iconType: "sun" | "cloud" | "rain" | "thunder" | "night";
};

export type CityOption = {
  name: string;
  lat: number;
  lon: number;
  region?: string;
};

export const CITIES: CityOption[] = [
  { name: "TP. Hồ Chí Minh", lat: 10.8231, lon: 106.6297, region: "Nam Bộ" },
  { name: "Hà Nội", lat: 21.0285, lon: 105.8542, region: "Bắc Bộ" },
  { name: "Đà Nẵng", lat: 16.0544, lon: 108.2022, region: "Trung Bộ" },
  { name: "Hải Phòng", lat: 20.8449, lon: 106.6881, region: "Bắc Bộ" },
  { name: "Cần Thơ", lat: 10.0452, lon: 105.7469, region: "Tây Nam Bộ" },
  { name: "Nha Trang", lat: 12.2388, lon: 109.1967, region: "Nam Trung Bộ" },
  { name: "Đà Lạt", lat: 11.9404, lon: 108.4583, region: "Tây Nguyên" },
  { name: "Huế", lat: 16.4637, lon: 107.5909, region: "Bắc Trung Bộ" },
  { name: "Hạ Long", lat: 20.9505, lon: 107.0734, region: "Quảng Ninh" },
  { name: "Vũng Tàu", lat: 10.3460, lon: 107.0843, region: "Đông Nam Bộ" },
];

function mapWeatherCode(code: number, isDay: boolean): { condition: string; iconType: WeatherInfo["iconType"] } {
  if (code === 0) {
    return {
      condition: isDay ? "Trời quang đãng, nắng nhẹ" : "Đêm trời quang, mát mẻ",
      iconType: isDay ? "sun" : "night",
    };
  }
  if (code >= 1 && code <= 3) {
    return {
      condition: code === 1 ? "Ít mây, không khí dịu mát" : code === 2 ? "Có mây rải rác" : "Nhiều mây, trời dịu",
      iconType: "cloud",
    };
  }
  if (code >= 45 && code <= 48) {
    return { condition: "Sương mù nhẹ rải rác", iconType: "cloud" };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      condition: code >= 80 ? "Mưa rào từng đợt" : "Mưa nhẹ rải rác",
      iconType: "rain",
    };
  }
  if (code >= 95 && code <= 99) {
    return { condition: "Dông sét & mưa rào", iconType: "thunder" };
  }
  return { condition: isDay ? "Có mây, dịu mát" : "Đêm mát mẻ", iconType: "cloud" };
}

export function useWeatherAndTime() {
  const [timeStr, setTimeStr] = useState<string>("");
  const [secondsStr, setSecondsStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<CityOption>(CITIES[0]);
  const [weather, setWeather] = useState<WeatherInfo>({
    temp: 28,
    condition: "Nhiều mây, trời dịu mát",
    weatherCode: 2,
    humidity: 75,
    windSpeed: 12,
    isDay: true,
    city: "TP. Hồ Chí Minh",
    iconType: "cloud",
  });
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  // 1. Live Realtime Digital Clock with seconds
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTimeStr(`${hours}:${minutes}`);
      setSecondsStr(seconds);

      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayName = days[now.getDay()];
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setDateStr(`${dayName}, ${day}/${month}/${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch live atmospheric weather
  const fetchWeather = useCallback(async (city: CityOption) => {
    setLoadingWeather(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m&timezone=Asia%2FBangkok`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error("Weather request failed");
      const data = await res.json();
      const current = data.current;
      const isDay = current.is_day === 1;
      const { condition, iconType } = mapWeatherCode(current.weather_code, isDay);

      setWeather({
        temp: Math.round(current.temperature_2m),
        condition,
        weatherCode: current.weather_code,
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m),
        isDay,
        city: city.name,
        iconType,
      });
    } catch {
      // Fallback realistic weather data by hour
      const now = new Date();
      const isDay = now.getHours() >= 6 && now.getHours() <= 18;
      setWeather((prev) => ({
        ...prev,
        city: city.name,
        isDay,
      }));
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(selectedCity);
    const interval = setInterval(() => fetchWeather(selectedCity), 300000);
    return () => clearInterval(interval);
  }, [selectedCity, fetchWeather]);

  const changeCity = (cityName: string) => {
    const found = CITIES.find((c) => c.name === cityName) || CITIES[0];
    setSelectedCity(found);
  };

  return {
    timeStr,
    secondsStr,
    dateStr,
    weather,
    loadingWeather,
    selectedCity,
    changeCity,
    refreshWeather: () => fetchWeather(selectedCity),
  };
}
