"use client";
import { useEffect, useState, useRef } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye, MapPin, RefreshCw } from "lucide-react";
import { getDeviceLocation } from "@/lib/capacitor-geolocation";
import { motion } from "framer-motion";

const WEATHER_CACHE_KEY = "climaneer-weather-cache";
const RETRY_DELAYS = [1000, 3000, 6000];

const WMO_CODES: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
  81: "Moderate showers", 82: "Violent showers", 95: "Thunderstorm",
  96: "Thunder with hail", 99: "Severe thunderstorm",
};

function getWeatherIcon(code: number, className = "h-10 w-10") {
  if (code <= 1) return <Sun className={`${className} text-amber-400`} />;
  if (code <= 3) return <Cloud className={`${className} text-gray-400`} />;
  if (code <= 55) return <CloudRain className={`${className} text-blue-400`} />;
  if (code <= 82) return <CloudRain className={`${className} text-indigo-400`} />;
  return <CloudRain className={`${className} text-red-400`} />;
}

async function fetchWeatherWithRetry(url: string, retries = RETRY_DELAYS.length): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (res.status === 502 && i < retries - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
        continue;
      }
      throw new Error(`Open-Meteo: ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
    }
  }
}

export function WeatherCard() {
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [location, setLocation] = useState("Loading...");
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      try {
        const { data, forecast: fc, location: loc, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < 3600000) {
          setWeather(data); setForecast(fc || []); setLocation(loc || "Unknown"); setLoading(false);
          return;
        }
        if (age < 86400000) {
          setWeather(data); setForecast(fc || []); setLocation(loc || "Unknown"); setIsStale(true); setLoading(false);
        }
      } catch {}
    }
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      const position = await getDeviceLocation();
      await updateWeather(position.latitude, position.longitude);
      setLocation(`${position.latitude.toFixed(2)}°N, ${position.longitude.toFixed(2)}°W`);
    } catch {
      updateWeather(40.7128, -74.006);
      setLocation("New York (fallback)");
    }
  };

  const updateWeather = async (lat: number, lon: number) => {
    try {
      setLoading(true); setError(null);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relativehumidity_2m,apparent_temperature,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
      const data = await fetchWeatherWithRetry(url);
      if (!mountedRef.current) return;
      if (!data?.current) throw new Error("Missing current data");
      const current = data.current;
      const daily = data.daily;
      setWeather({
        temp: Math.round(current.temperature_2m), feelsLike: Math.round(current.apparent_temperature),
        description: WMO_CODES[current.weathercode] || "Unknown", code: current.weathercode,
        wind: Math.round(current.windspeed_10m), humidity: current.relativehumidity_2m,
      });
      if (daily) {
        setForecast(daily.time.slice(1, 4).map((date: string, i: number) => ({
          date, max: Math.round(daily.temperature_2m_max[i + 1]), min: Math.round(daily.temperature_2m_min[i + 1]), code: daily.weathercode[i + 1],
        })));
      }
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        data: { temp: Math.round(current.temperature_2m), feelsLike: Math.round(current.apparent_temperature), description: WMO_CODES[current.weathercode] || "Unknown", code: current.weathercode, wind: Math.round(current.windspeed_10m), humidity: current.relativehumidity_2m },
        forecast: forecast, location: lat + "," + lon, timestamp: Date.now(),
      }));
      setIsStale(false); setError(null); setLoading(false);
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (!weather) setError(err.message || "Weather unavailable");
      else setIsStale(true);
      setLoading(false);
    }
  };

  if (loading && !weather) {
    return <div className="panel rounded-lg p-5"><div className="shimmer rounded-lg h-28" /></div>;
  }

  if (error && !weather) {
    return (
      <div className="panel rounded-lg p-5">
        <div className="flex flex-col items-center justify-center h-28 text-center gap-2">
          <Cloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{error}</p>
          <button onClick={fetchWeather} className="text-xs text-primary hover:underline flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="panel rounded-lg">
      {isStale && (
        <div className="px-5 pt-3">
          <span className="text-[10px] font-medium text-amber-500">Stale data</span>
        </div>
      )}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">{location}</span>
          </div>
          <motion.button onClick={fetchWeather} className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground" whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}>
            <RefreshCw className="h-3 w-3" />
          </motion.button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              {getWeatherIcon(weather.code, "h-9 w-9 sm:h-10 sm:w-10")}
            </motion.div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight">{weather.temp}</span>
                <span className="text-lg text-muted-foreground font-light">°C</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">{weather.description}</p>
              <p className="text-[10px] text-muted-foreground">Feels like {weather.feelsLike}°C</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            {[
              { icon: Wind, label: "Wind", value: `${weather.wind} km/h` },
              { icon: Droplets, label: "Humidity", value: `${weather.humidity}%` },
              { icon: Eye, label: "Feels", value: `${weather.feelsLike}°C` },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <item.icon className="h-3 w-3 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-xs font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {forecast.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="grid grid-cols-3 gap-2">
              {forecast.map((day: any, i: number) => (
                <motion.div
                  key={i}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.3 }}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  {getWeatherIcon(day.code, "h-5 w-5")}
                  <div className="flex gap-1">
                    <span className="text-xs font-semibold">{day.max}°</span>
                    <span className="text-[10px] text-muted-foreground">{day.min}°</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
