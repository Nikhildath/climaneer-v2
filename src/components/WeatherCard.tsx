import { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDeviceLocation } from "@/lib/capacitor-geolocation";

interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  humidity: number;
  visibility: number;
  feelsLike: number;
}

interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
}

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  const getWeatherDescription = (code: number): string => {
    const weatherMap: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      95: "Thunderstorm",
    };
    return weatherMap[code] || "Unknown conditions";
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun className="h-12 w-12 text-yellow-400" />;
    if (code === 2) return <Cloud className="h-12 w-12 text-gray-400" />;
    if (code === 3) return <Cloud className="h-12 w-12 text-gray-500" />;
    if (code >= 45 && code <= 82) return <CloudRain className="h-12 w-12 text-blue-400" />;
    if (code === 95) return <CloudRain className="h-12 w-12 text-red-400" />;
    return <Cloud className="h-12 w-12 text-gray-400" />;
  };

  const fetchWeather = async () => {
    try {
      const position = await getDeviceLocation();
      updateWeather(position.latitude, position.longitude);
    } catch (err) {
      console.warn("[WeatherCard] Location unavailable, falling back to default:", err);
      updateWeather(40.7128, -74.006);
    }
  };

  const updateWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=relativehumidity_2m,visibility&timezone=auto&forecast_days=3`
      );
      const data = await res.json();

      const current = data.current_weather;
      const currentHourly = {
        humidity: data.hourly?.relativehumidity_2m?.[0] || 60,
        visibility: (data.hourly?.visibility?.[0] || 10000) / 1000, // Convert to km
      };

      const temp = Math.round(current.temperature);
      const description = getWeatherDescription(current.weathercode);
      const feelsLike = Math.round(current.temperature - current.windspeed * 0.5); // Approximation

      setWeather({
        temperature: temp,
        description,
        windSpeed: Math.round(current.windspeed),
        humidity: currentHourly.humidity,
        visibility: Math.round(currentHourly.visibility * 10) / 10,
        feelsLike,
      });

      // Set forecast
      if (data.daily) {
        const forecastDays = data.daily.time.slice(1, 4).map((date: string, index: number) => ({
          date,
          maxTemp: Math.round(data.daily.temperature_2m_max[index + 1]),
          minTemp: Math.round(data.daily.temperature_2m_min[index + 1]),
          weatherCode: data.daily.weathercode[index + 1],
        }));
        setForecast(forecastDays);
      }

      setError(null);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch weather:", err);
      setError("Unable to load weather data");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-16 w-32 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-500">{error || "Weather data unavailable"}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Weather Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left side - Temperature and description */}
          <div className="flex items-center gap-4">
            {getWeatherIcon(Math.round(weather.temperature))}
            <div>
              <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                {weather.temperature}°C
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {weather.description}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Feels like {weather.feelsLike}°C
              </p>
            </div>
          </div>

          {/* Right side - Weather details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/50 dark:bg-black/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Wind Speed</p>
              </div>
              <p className="text-lg font-semibold">{weather.windSpeed} km/h</p>
            </div>

            <div className="rounded-lg bg-white/50 dark:bg-black/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Humidity</p>
              </div>
              <p className="text-lg font-semibold">{weather.humidity}%</p>
            </div>

            <div className="rounded-lg bg-white/50 dark:bg-black/20 p-3 col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Visibility</p>
              </div>
              <p className="text-lg font-semibold">{weather.visibility} km</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 3-Day Forecast */}
      {forecast.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            3-Day Forecast
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {forecast.map((day, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                  {new Date(day.date).toLocaleDateString("en-US", { 
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}
                </p>
                <div className="flex justify-center mb-3">
                  {getWeatherIcon(day.weatherCode)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
                  {getWeatherDescription(day.weatherCode)}
                </p>
                <div className="flex justify-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {day.maxTemp}°
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {day.minTemp}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
