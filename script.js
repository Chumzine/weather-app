// API Base URLs
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";


// DOM References
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const weatherIcon = document.getElementById('weatherIcon');
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const uvIndex = document.getElementById('uvIndex');
const searchHistory = document.getElementById('searchHistory');
const forecast = document.getElementById('forecastContainer');

// Fetch City Coordinates for a city name
async function getCoordinates(city) {

    try {
        const response = await fetch(
            `${GEO_URL}?name=${city}&count=1&language=en&format=json`);

        // Check if response was successful
        if (!response.ok) {
            throw new Error('Failed to fetch city data');
        }

        const data = await response.json();
        
        // Check if city exists in results
        if (!data.results || data.results.length === 0) {
          throw new Error(`City "${city}" not found`);
        }

        return data.results[0];

    } catch (error) {
        console.error("Ërror fetching coordinates:", error);
        throw error;
    }
}

// Fetch current weather and 5-day forecast
async function getWeather(lat, lon) {

    try {
        const response = await fetch(
            `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`
        );

        // Check if weather data exists
        if (!response.ok) {
            throw new Error("Failed to fetch weather data");
        }

        return await response.json();

    } catch (error) {
        console.error("Ërror fetching weather:", error);
        throw error;
    }
}


// Convert a WMO weather code to description and icon
function getWeatherDescription(code) {

    if (code ===0) {
        return { text: "Clear Sky", icon: "☀" }
    }

    if ([1, 2, 3].includes(code)) {
        return { text: "Partly Cloudy" , icon: "⛅" }
    }

    if ([45, 48].includes(code)) {
        return { text: "Foggy" , icon: "🌫" }
    }

    if ([51, 53, 55].includes(code)) {
        return { text: "Drizzle" , icon: "🌦" }
    }

    if ([61, 63, 65].includes(code)) {
        return { text: "Rain" , icon: "🌧" }
    }

    if ([71, 73, 75].includes(code)) {
        return { text: "Snow", icon: "❄" }
    }

    if ([80, 81, 82].includes(code)) {
        return { text: "Rain Showers", icon: "🌦" }
    }

    if ([95].includes(code)) {
        return { text: "Thunderstorm", icon: "⛈" }
    }

    return { text: "Unknown", icon: "❓" };
}



// Update the DOM with current weather data
function displayCurrentWeather(data, city, country) {

    // If there is no weather data, show empty state
    if (!data || !data.current) {
        weatherIcon.textContent = "❓";
        cityName.textContent = city || "City not found";
        temperature.textContent = "—°C";
        description.textContent = "No weather data available";

        humidity.textContent = "—";
        windSpeed.textContent = "—";
        uvIndex.textContent = "—";

        return;
    }

    // If weather data exists, display actual values
    const weather = getWeatherDescription(
        data.current.weather_code
    );

    weatherIcon.textContent = weather.icon;

    cityName.textContent = `${city}, ${country}`;

    temperature.textContent = `${data.current.temperature_2m}°C`;

    description.textContent = weather.text;

    humidity.textContent = `${data.current.relative_humidity_2m}%`;

    windSpeed.textContent = `${data.current.wind_speed_10m} km/h`;

    uvIndex.textContent = "N/A";
}


// Update the DOM with 5-day forecast
function displayForecast(daily) {

    forecast.innerHTML = "";

    for(let i = 0; i < 5; i++) {
        const weather = getWeatherDescription(daily.weather_code[i]);

        const date = new Date(daily.time[i]);

        const day = date.toLocaleDateString("en-US", { weekday: "long" }
        );

        const forecastCard = document.createElement("div");
        forecastCard.classList.add("forecast-card");

        forecastCard.innerHTML = `
            <span class="forecast-day">${day}</span>
            <span class="forecast-icon">${weather.icon}</span>
            <div class="forecast-temp">
                <span class="temp-high">${daily.temperature_2m_max[i]}°</span>
                <span class="temp-low">${daily.temperature_2m_min[i]}°</span>
            </div>
        `;

        forecast.appendChild(forecastCard);
    }
}


// Show an error message on the page
function showError(message) {
    errorMessage.textContent = message;
}


// Search function triggered by the Search button
async function handleSearch() {

    const city = cityInput.value.trim();

    try {
        loading.classList.remove("hidden");
        errorMessage.textContent = "";

        if (!city) {
        throw new Error("Please enter a city name");
        }

        const location = await getCoordinates(city);
        const weather = await getWeather(location.latitude, location.longitude);

        displayCurrentWeather(weather, location.name, location.country);
        displayForecast(weather.daily);

        saveSearch(location.name);

    } catch (error) {
        showError(error.message);

        displayCurrentWeather(null, city, "");

        forecastContainer.innerHTML = `<p class="forecast-empty">No forecast yet</p>`;
    } finally {
        loading.classList.add("hidden");
    }
}



// Helper functions 
// Default weather state
function showDefaultWeatherState() {
    weatherIcon.textContent = "❓";
    cityName.textContent = "Weather App";
    temperature.textContent = "--°C";
    description.textContent = "No weather data yet";

    humidity.textContent = "-";
    windSpeed.textContent = "-";
    uvIndex.textContent = "-";
}

// Default forecast state
function showDefaultForecastState() {
  forecastContainer.innerHTML = `
    <p class="forecast-empty">No forecast yet</p>
  `;
}


// Function to save search history
function saveSearch(city) {

    let history = JSON.parse(localStorage.getItem("weatherHistory")) || [];

    // Remove duplicate if city already exists
    history = history.filter(
        (item) => item.toLowerCase() !== city.toLowerCase()
    );

    // Add newest city to the beginning
    history.unshift(city);

    // Keep only the last 5
    history = history.slice(0, 5);

    localStorage.setItem("weatherHistory", JSON.stringify(history));

    renderSearchHistory();
}


// Update the DOM with the search history button
function renderSearchHistory() {

    const history = JSON.parse(localStorage.getItem("weatherHistory")) || [];

    if (history.length === 0) {
        searchHistory.innerHTML = "";
        return;
    }

    searchHistory.innerHTML = `
        <p class="history-title">Recent Searches</p>
    `;

    history.forEach((city) => {
        const historyBtn = document.createElement("button");
        historyBtn.classList.add("history-btn");
        historyBtn.textContent = city;

        historyBtn.addEventListener("click", () => {
        cityInput.value = city;
        handleSearch();
        });

        searchHistory.appendChild(historyBtn);
    });
}


// Detect user's location using geolocation
navigator.geolocation.getCurrentPosition(

    async (position) => {

        const { latitude, longitude } = position.coords;

        const weather = await getWeather(latitude, longitude);

        displayCurrentWeather(weather, "Your Location", "");

        displayForecast(weather.daily);
    }
);


showDefaultWeatherState();
showDefaultForecastState();
renderSearchHistory();

// Event listeners
searchBtn.addEventListener("click", handleSearch);

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        handleSearch();
    }
});
