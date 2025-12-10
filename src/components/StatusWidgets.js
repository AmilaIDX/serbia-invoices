import { useEffect, useState } from "react";

const StatusWidgets = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=44.787&longitude=20.457&current=temperature_2m,precipitation&timezone=Europe%2FBelgrade"
        );
        const data = await res.json();
        const current = data.current || {};
        setWeather({
          temperature: current.temperature_2m,
          precipitation: current.precipitation,
        });
      } catch {
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };
    loadWeather();
  }, []);

  const belgradeTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(time);

  const condition = (() => {
    if (!weather) return { label: "—", icon: "⏳" };
    const precip = Number(weather.precipitation || 0);
    if (precip > 0 && Number(weather.temperature || 0) <= 0) return { label: "Snow", icon: "❄️" };
    if (precip > 0) return { label: "Rain", icon: "🌧️" };
    return { label: "Clear", icon: "☀️" };
  })();

  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
      <div className="pill">🕒 Belgrade: {belgradeTime}</div>
      <div className="pill">
        {loading
          ? "Loading weather..."
          : weather
          ? `${condition.icon} ${weather.temperature}°C • ${condition.label}`
          : "Weather unavailable"}
      </div>
    </div>
  );
};

export default StatusWidgets;
