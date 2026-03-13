// Weather App Functions

/**
 * WEATHER MODULE
 * Real-time weather data with Pirate Weather & Nominatim APIs
 */

/**
 * Fetch weather for a city and display forecast
 */
async function fetchWeather() {
  const city = safeEl("weather-city-input")?.value || "";
  if (!city) return;
  const pirateKey = "vjLZgtPHkOp3lVEMUhVsieWIQFOHS3FC";
  const iconMap = {
    "clear-day": "01d", "clear-night": "01n", rain: "10d", snow: "13d", sleet: "13d", wind: "50d", fog: "50d", cloudy: "04d", "partly-cloudy-day": "02d", "partly-cloudy-night": "02n"
  };

  try {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.length) return alert("City not found.");
    const { lat, lon, display_name } = geoData[0];

    const weatherRes = await fetch(`https://api.pirateweather.net/forecast/${pirateKey}/${lat},${lon}?units=si`);
    const data = await weatherRes.json();
    const current = data.currently || {};

    if (safeEl("weather-temp")) safeEl("weather-temp").innerText = `${Math.round(current.temperature || 0)}°C`;
    if (safeEl("weather-location")) safeEl("weather-location").innerText = (display_name || "").split(",")[0] || city;
    if (safeEl("weather-desc")) safeEl("weather-desc").innerText = current.summary || "";
    if (safeEl("weather-humidity")) safeEl("weather-humidity").innerText = `${Math.round((current.humidity || 0) * 100)}%`;
    if (safeEl("weather-wind")) safeEl("weather-wind").innerText = `${Math.round(current.windSpeed || 0)} km/h`;
    if (safeEl("weather-icon")) safeEl("weather-icon").src = `https://openweathermap.org/img/wn/${iconMap[current.icon] || "01d"}@2x.png`;

    const fc = safeEl("forecast-container");
    if (fc) {
      fc.innerHTML = "";
      ((data.daily && data.daily.data) || []).slice(1, 6).forEach((day) => {
        const dayName = new Date(day.time * 1000).toLocaleDateString("en-US", { weekday: "short" });
        fc.innerHTML += `<div class='forecast-item'><span class='forecast-day'>${dayName}</span><img class='forecast-img' src='https://openweathermap.org/img/wn/${iconMap[day.icon] || "01d"}.png'><span class='forecast-temp'>${Math.round(day.temperatureHigh || 0)}°</span></div>`;
      });
    }
  } catch (e) {
    console.error(e);
  }
}
