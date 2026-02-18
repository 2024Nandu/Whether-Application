const apiKey = "1ed0dd76bbe77ee51b42c384a878f7ca";
let currentLat = null;
let currentLon = null;
let loading = false;

const toggle = document.getElementById('themeToggle');
const toggleIcon = document.getElementById('toggleIcon');
const toggleLabel = document.getElementById('toggleLabel');
const body = document.body;
const loadingOverlay = document.getElementById('loadingOverlay');
const refreshHint = document.getElementById('refreshHint');
const cityInput = document.getElementById('cityInput');
const getLocationBtn = document.getElementById('getLocation');

document.querySelectorAll('button, .theme-toggle').forEach(el => {
    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
    }, { passive: false });
});

function setTheme(theme) {
    if (theme === 'light') {
        body.classList.add('light');
        body.classList.remove('dark');
        toggleIcon.innerText = '☀️';
        toggleLabel.innerText = 'Light';
    } else {
        body.classList.remove('light');
        body.classList.add('dark');
        toggleIcon.innerText = '🌙';
        toggleLabel.innerText = 'Dark';
    }
    localStorage.setItem('weatherTheme', theme);
}

const savedTheme = localStorage.getItem('weatherTheme') || 'dark';
setTheme(savedTheme);

toggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('light') ? 'dark' : 'light';
    setTheme(newTheme);
});

toggle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const newTheme = body.classList.contains('light') ? 'dark' : 'light';
    setTheme(newTheme);
});

const updateDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('dateTime').innerText = new Date().toLocaleDateString(undefined, options);
};

function showLoading() {
    loading = true;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loading = false;
    loadingOverlay.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerText = message;
    
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    document.querySelector('.main-display').insertAdjacentElement('afterend', errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
}

getLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.cod === 200) {
                    cityInput.value = data.name;
                    currentLat = lat;
                    currentLon = lon;
                    
                    await processWeatherData(data);
                }
            } catch (error) {
                console.error("Location weather error:", error);
                showError("Unable to get weather for your location");
            } finally {
                hideLoading();
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            showError("Unable to get your location. Please check permissions.");
            hideLoading();
        });
    } else {
        showError("Geolocation not supported by your browser");
    }
});

getLocationBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    getLocationBtn.click();
});

async function processWeatherData(data) {
    try {
        document.getElementById("cityName").innerText = `${data.name}, ${data.sys.country}`;
        document.getElementById("temp").innerText = `${Math.round(data.main.temp)}°`;
        document.getElementById("description").innerText = data.weather[0].description;
        document.getElementById("feelsLike").innerText = `Feels like: ${Math.round(data.main.feels_like)}°`;
        document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        
        document.getElementById("wind").innerHTML = `${data.wind.speed} m/s`;
        document.getElementById("humidity").innerHTML = `${data.main.humidity}%`;
        document.getElementById("visibility").innerHTML = `${(data.visibility / 1000).toFixed(1)} km`;
        document.getElementById("pressure").innerHTML = `${data.main.pressure} hPa`;

        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById("sunTimes").innerHTML = `🌅 ${sunrise} | 🌇 ${sunset}`;

        currentLat = data.coord.lat;
        currentLon = data.coord.lon;

        document.getElementById("additionalCards").innerHTML = '';

        await Promise.allSettled([
            updateForecast(data.name),
            getAirPollution(data.coord.lat, data.coord.lon),
            getUVIndex(data.coord.lat, data.coord.lon, data.weather[0].icon)
        ]);
    } catch (error) {
        console.error("Error processing weather data:", error);
        showError("Error processing weather data");
    }
}

async function getWeather(city) {
    const targetCity = city || cityInput.value;
    if (!targetCity) {
        showError("Please enter a city name");
        return;
    }

    showLoading();
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${targetCity}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            await processWeatherData(data);
        } else {
            showError("City not found! Please check the name.");
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showError("Error fetching weather data. Please try again.");
    } finally {
        hideLoading();
    }
}

async function getAirPollution(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.list && data.list[0]) {
            displayAirPollution(data.list[0]);
        }
    } catch (error) {
        console.error("Air pollution error:", error);
    }
}

function displayAirPollution(data) {
    const aqi = data.main.aqi;
    const components = data.components;
    
    const aqiText = {
        1: { text: "Good", color: "#00e400" },
        2: { text: "Fair", color: "#ffff00" },
        3: { text: "Moderate", color: "#ff7e00" },
        4: { text: "Poor", color: "#ff0000" },
        5: { text: "Very Poor", color: "#8f3f97" }
    };
    
    const pollutionHTML = `
        <div class="card">
            <h3>🌬️ Air Quality</h3>
            <div class="aqi-display" style="background-color: ${aqiText[aqi].color}20">
                <span class="aqi-value">${aqi}</span>
                <span class="aqi-text" style="color: ${aqiText[aqi].color}">${aqiText[aqi].text}</span>
            </div>
            <div class="pollutants">
                <div class="pollutant"><span>PM2.5</span><strong>${components.pm2_5?.toFixed(1) || '--'}</strong></div>
                <div class="pollutant"><span>PM10</span><strong>${components.pm10?.toFixed(1) || '--'}</strong></div>
                <div class="pollutant"><span>O₃</span><strong>${components.o3?.toFixed(1) || '--'}</strong></div>
                <div class="pollutant"><span>NO₂</span><strong>${components.no2?.toFixed(1) || '--'}</strong></div>
                <div class="pollutant"><span>SO₂</span><strong>${components.so2?.toFixed(1) || '--'}</strong></div>
                <div class="pollutant"><span>CO</span><strong>${components.co?.toFixed(0) || '--'}</strong></div>
            </div>
        </div>
    `;
    
    document.getElementById("additionalCards").innerHTML = pollutionHTML;
}

async function getUVIndex(lat, lon, weatherIcon) {
    try {
        let uvi = 0;
        const hour = new Date().getHours();
        
        if (hour >= 10 && hour <= 16) {
            if (weatherIcon.includes('d')) {
                if (weatherIcon.includes('01')) uvi = 8; 
                else if (weatherIcon.includes('02')) uvi = 6; 
                else if (weatherIcon.includes('03') || weatherIcon.includes('04')) uvi = 4; 
                else if (weatherIcon.includes('09') || weatherIcon.includes('10')) uvi = 3; 
                else uvi = 2; 
            } else {
                uvi = 0; 
            }
        } else {
            uvi = hour > 6 && hour < 18 ? 2 : 0; 
        }
        
        displayUVIndex(uvi);
    } catch (error) {
        console.error("UV Index calculation error:", error);
    }
}

function displayUVIndex(uvi) {
    let riskLevel, recommendation, color;
    
    if (uvi <= 2) {
        riskLevel = "Low";
        recommendation = "No protection needed";
        color = "#3aab58";
    } else if (uvi <= 5) {
        riskLevel = "Moderate";
        recommendation = "Wear sunscreen ☀️";
        color = "#f5e83a";
    } else if (uvi <= 7) {
        riskLevel = "High";
        recommendation = "Seek shade midday 🌤️";
        color = "#f5a83a";
    } else if (uvi <= 10) {
        riskLevel = "Very High";
        recommendation = "Avoid being outside ⚠️";
        color = "#f5573a";
    } else {
        riskLevel = "Extreme";
        recommendation = "Stay indoors 🏠";
        color = "#b33a3a";
    }
    
    const uvHTML = `
        <div class="card">
            <h3>☀️ UV Index</h3>
            <div class="uv-display">
                <span class="uv-value" style="color: ${color}">${uvi}</span>
                <span class="uv-risk" style="color: ${color}">${riskLevel}</span>
            </div>
            <div class="uv-recommendation">${recommendation}</div>
        </div>
    `;
    
    const existingCards = document.getElementById("additionalCards").innerHTML;
    document.getElementById("additionalCards").innerHTML = existingCards + uvHTML;
}

async function updateForecast(city) {
    if (!city) return;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    
    try {
        const res = await fetch(forecastUrl);
        const data = await res.json();
        const forecastContainer = document.getElementById('forecastBar');
        
        if (data.cod === "200" && data.list) {
            forecastContainer.innerHTML = '';
            
            const dailyForecasts = {};
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000).toLocaleDateString();
                if (!dailyForecasts[date]) {
                    dailyForecasts[date] = item;
                }
            });
            
            Object.values(dailyForecasts).slice(0, 7).forEach(day => {
                const date = new Date(day.dt * 1000);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                const div = document.createElement('div');
                div.className = 'forecast-item';
                div.innerHTML = `
                    <p>${dayName}</p>
                    <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
                    <div class="forecast-temp">${Math.round(day.main.temp)}°</div>
                    <div class="forecast-desc">${day.weather[0].description.split(' ')[0]}</div>
                `;
                forecastContainer.appendChild(div);
            });
        }
    } catch (e) {
        console.warn("Forecast fetch failed", e);
        populateFallbackForecast();
    }
}

function populateFallbackForecast() {
    const forecastContainer = document.getElementById('forecastBar');
    forecastContainer.innerHTML = '';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const temps = ['22°', '24°', '21°', '25°', '23°', '20°', '22°'];
    
    for (let i = 0; i < 7; i++) {
        const div = document.createElement('div');
        div.className = 'forecast-item';
        div.innerHTML = `<p>${days[i]}</p><div class="forecast-temp">${temps[i]}</div>`;
        forecastContainer.appendChild(div);
    }
}

// Initialize
window.onload = () => {
    updateDate();
    getWeather("Bengaluru");
};

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const city = e.target.value.trim();
        if (city) {
            getWeather(city);
            e.target.blur(); 
        }
    }
});

cityInput.addEventListener('search', (e) => {
    const city = e.target.value.trim();
    if (city) getWeather(city);
});

let touchStartY = 0;
let touchStartX = 0;
let pullDistance = 0;

document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    pullDistance = 0;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    const touchY = e.touches[0].clientY;
    const scrollY = window.scrollY;
    
    if (scrollY === 0) {
        pullDistance = touchY - touchStartY;
        if (pullDistance > 20) {
            refreshHint.style.opacity = Math.min(1, pullDistance / 100);
            refreshHint.innerText = pullDistance > 60 ? 'Release to refresh' : '↓ Pull to refresh';
        }
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (pullDistance > 60 && window.scrollY === 0) {
        const city = cityInput.value.trim() || 'Bengaluru';
        getWeather(city);
    }
    refreshHint.style.opacity = '0.7';
    refreshHint.innerText = '↓ Pull to refresh';
    pullDistance = 0;
});

document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });