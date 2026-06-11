const FIREBASE_URL = "https://aquaclima-datatabase-default-rtdb.firebaseio.com/"

// Global state
let currentTheme = "light"
let alertCount = 0
let lastAirQualityStatus = null
let alertDismissedForStatus = null
const sensorHistory = []

// Loading screen with smooth animation
window.addEventListener("load", () => {
  const loadingScreen = document.getElementById("loading-screen")
  if (!loadingScreen) return

  // Simulate loading progress
  setTimeout(() => {
    loadingScreen.style.animation = "pop-dissolve 0.7s forwards"
    setTimeout(() => {
      loadingScreen.style.display = "none"
    }, 700)
  }, 2000)
})

// Theme toggle functionality
function initThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle")
  const savedTheme = localStorage.getItem("theme") || "light"

  setTheme(savedTheme)

  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "light" ? "dark" : "light"
    setTheme(currentTheme)
    localStorage.setItem("theme", currentTheme)
  })
}

function setTheme(theme) {
  currentTheme = theme
  document.documentElement.setAttribute("data-theme", theme)

  const themeToggle = document.getElementById("theme-toggle")
  const icon = themeToggle.querySelector("i")

  if (theme === "dark") {
    icon.className = "fas fa-sun"
  } else {
    icon.className = "fas fa-moon"
  }
}

// Tab functionality
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn")
  const tabContents = document.querySelectorAll(".tab-content")

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab

      // Remove active class from all tabs and contents
      tabBtns.forEach((b) => b.classList.remove("active"))
      tabContents.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked tab and corresponding content
      btn.classList.add("active")
      document.getElementById(`${targetTab}-tab`).classList.add("active")
    })
  })
}

// Update UI with sensor data
function updateUI(data) {
  console.log("updateUI called with data:", data);
  const sensors = data.sensors || {}; // Access the nested 'sensors' object

  // Store data for history
  const timestamp = new Date().toISOString();
  sensorHistory.push({
    timestamp,
    ...sensors, // Store sensor data
  })

  // Keep only last 100 entries
  if (sensorHistory.length > 100) {
    sensorHistory.shift()
  }
  // Soil Moisture
  const soilMoisture = sensors.soil_moisture || 0;
  document.getElementById("soilMoisture").textContent = `${soilMoisture}%`
  updateProgressRing("soil-progress", soilMoisture, 100)
  updateTrend("moisture-trend", soilMoisture, 50)

  // Air Humidity
  const humidity = sensors.air_humidity || 0;
  document.getElementById("airHumidity").textContent = `${humidity}%`
  updateProgressRing("humidity-progress", humidity, 100)
  updateTrend("humidity-trend", humidity, 60)

  // Water Level
  const waterLevel = sensors.water_level || 0;
  const waterStatus = getStatusInfo(waterLevel, [20, 40, 60], ["Low", "Average", "Good", "High"])
  document.getElementById("waterLevel").textContent = `${waterLevel}%`
  document.getElementById("water-status").textContent = waterStatus.text
  document.getElementById("water-status").className = `sensor-status ${waterStatus.class}`
  updateWaterTank(waterLevel)
  updateTrend("water-trend", waterLevel, 50);

  // pH Level
  const ph = sensors.ph || 0
  const phStatus = getStatusInfo(ph, [5.5, 6.5, 7.5], ["Acidic", "Good", "Average", "Alkaline"])
  document.getElementById("phValue").textContent = ph.toFixed(1)
  document.getElementById("ph-status").textContent = phStatus.text
  document.getElementById("ph-status").className = `sensor-status ${phStatus.class}`
  updatePHIndicator(ph)
  updateTrend("ph-trend", ph, 7)

  // Air Temperature
  const airTemp = sensors.air_temp || 0;
  document.getElementById("airData").textContent = `${airTemp}°C`
  updateTemperatureGauge(airTemp)
  updateTrend("temp-trend", airTemp, 25)

  // Water Temperature - Note: This sensor is not in the provided structure, keeping existing code.
  const waterTemp = sensors.water_temp || 0
  const waterTempStatus = getStatusInfo(waterTemp, [10, 20, 30], ["Cold", "Good", "Warm", "Hot"])
  document.getElementById("waterTemp").textContent = `${waterTemp}°C`
  document.getElementById("water-temp-status").textContent = waterTempStatus.text
  document.getElementById("water-temp-status").className = `sensor-status ${waterTempStatus.class}`
  updateTrend("water-temp-trend", waterTemp, 22)

  // Air Quality
  const airQuality = sensors.air_quality || 0;
  const airQualityStatus = getStatusInfo(airQuality, [50, 100, 150], ["Good", "Average", "Bad", "Hazardous"])

  document.getElementById("airQuality").textContent = `${airQuality} AQI`
  document.getElementById("air-quality-status").textContent = airQualityStatus.text
  document.getElementById("air-quality-status").className = `sensor-status ${airQualityStatus.class}`
  updateAQIBar(airQuality)
  updateTrend("air-quality-trend", airQuality, 75)

  // Only trigger if status changed AND not dismissed for same
  if (
    (airQualityStatus.text === "Bad" || airQualityStatus.text === "Hazardous") &&
    airQualityStatus.text !== lastAirQualityStatus
  ) {
    showAirQualityAlert(`Air Quality is ${airQualityStatus.text}! (${airQuality} AQI)`, airQualityStatus.text)
    addAlert("warning", "Air Quality Alert", `Air quality is ${airQualityStatus.text} (${airQuality} AQI)`)
  }

  lastAirQualityStatus = airQualityStatus.text

  // Water Flow
  const flow = sensors.flow || 0;
  const flowStatus = getStatusInfo(flow, [1, 3, 5], ["Low", "Average", "Good", "High"])
  document.getElementById("flowRate").textContent = `${flow} L/min`
  document.getElementById("flow-status").textContent = flowStatus.text
  document.getElementById("flow-status").className = `sensor-status ${flowStatus.class}`
  updateTrend("flow-trend", flow, 3)

  // Update current flow rate for water usage calculations
  currentFlowRate = flow || 2.5 // Use Firebase flow rate or default to 2.5 L/min
  // Battery Percentage
  const battery = sensors.battery || 0; // Access battery from the 'sensors' object
  document.getElementById("battery-text").textContent = `${battery}%`
  updateBatteryLevel(battery)
  updateBatteryTime(battery)

  // Update stats
  updateStats()

  // Update mini charts
  updateMiniCharts()

  // Update AI confidence
  updateAIConfidence()
}

// Helper function to get status info with CSS classes
function getStatusInfo(value, thresholds, labels) {
  const classes = ["danger", "good", "warning", "danger"]
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]) {
      return { text: labels[i], class: classes[i] }
    }
  }
  return { text: labels[labels.length - 1], class: classes[classes.length - 1] }
}

// Update trend indicators
function updateTrend(elementId, currentValue, previousValue) {
  const element = document.getElementById(elementId)
  if (!element) return

  const icon = element.querySelector("i")
  if (currentValue > previousValue) {
    icon.className = "fas fa-arrow-up trend-up"
  } else if (currentValue < previousValue) {
    icon.className = "fas fa-arrow-down trend-down"
  } else {
    icon.className = "fas fa-minus trend-stable"
  }
}

// Update progress ring
function updateProgressRing(elementId, value, max) {
  const element = document.getElementById(elementId)
  if (!element) return

  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const circumference = 220 // 2 * π * 35
  const offset = circumference - (percentage / 100) * circumference

  element.style.strokeDashoffset = offset
}

// Update water tank visualization
function updateWaterTank(percentage) {
  const waterFill = document.getElementById("water-fill")
  if (waterFill) {
    waterFill.style.height = `${Math.max(2, percentage)}%`
  }
}

// Update pH indicator
function updatePHIndicator(phValue) {
  const indicator = document.getElementById("ph-indicator")
  if (indicator) {
    const percentage = Math.min(100, Math.max(0, (phValue / 14) * 100))
    indicator.style.left = `${percentage}%`
  }
}

// Update temperature gauge
function updateTemperatureGauge(temperature) {
  const gauge = document.getElementById("temp-gauge")
  if (gauge) {
    const percentage = Math.min(100, Math.max(0, (temperature / 50) * 100))
    gauge.style.width = `${percentage}%`
  }
}

// Update AQI bar
function updateAQIBar(aqi) {
  const fill = document.getElementById("aqi-fill")
  if (fill) {
    const percentage = Math.min(100, Math.max(0, (aqi / 200) * 100))
    fill.style.width = `${percentage}%`
  }
}

// Update battery level visual
function updateBatteryLevel(percentage) {
  const batteryLevel = document.getElementById("battery-level")
  const batteryIndicator = document.querySelector(".battery-status .status-indicator")

  if (batteryLevel) {
    batteryLevel.style.width = `${Math.max(5, percentage)}%`

    // Change color based on battery level
    if (percentage > 50) {
      batteryLevel.style.background = "var(--gradient-success)"
      if (batteryIndicator) {
        batteryIndicator.className = "status-indicator active"
      }
    } else if (percentage > 20) {
      batteryLevel.style.background = "var(--gradient-warning)"
      if (batteryIndicator) {
        batteryIndicator.className = "status-indicator warning"
      }
    } else {
      batteryLevel.style.background = "var(--gradient-danger)"
      if (batteryIndicator) {
        batteryIndicator.className = "status-indicator danger"
      }
    }
  }
}

// Update battery time estimate
function updateBatteryTime(percentage) {
  const batteryTime = document.getElementById("battery-time")
  if (batteryTime) {
    const hours = Math.floor((percentage / 100) * 24)
    const minutes = Math.floor(((percentage / 100) * 24 - hours) * 60)
    batteryTime.textContent = `${hours}h ${minutes}m`
  }
}

// Update stats
function updateStats() {
  // Water used calculation (simplified)
  const waterUsed = document.getElementById("water-used")
  if (waterUsed) {
    // Water usage is now calculated in updatePumpStatus based on actual flow rate
    waterUsed.textContent = `${totalWaterUsed.toFixed(1)} L`
  }

  // Pump runtime
  const totalRuntime = document.getElementById("total-runtime")
  if (totalRuntime && pumpStartTime) {
    const runtime = Date.now() - pumpStartTime
    const hours = Math.floor(runtime / (1000 * 60 * 60))
    const minutes = Math.floor((runtime % (1000 * 60 * 60)) / (1000 * 60))
    totalRuntime.textContent = `${hours}h ${minutes}m`
  }

  // Efficiency (simulated)
  const efficiency = document.getElementById("efficiency")
  if (efficiency) {
    const eff = 90 + Math.random() * 10
    efficiency.textContent = `${eff.toFixed(1)}%`
  }
}

// Update mini charts
function updateMiniCharts() {
  // This would integrate with the charts.js file
  // For now, we'll just update the canvas elements
  const moistureChart = document.getElementById("moisture-mini-chart")
  const humidityChart = document.getElementById("humidity-mini-chart")

  if (moistureChart && humidityChart) {
    // Charts will be handled by charts.js
  }
}

// Update AI confidence - make it functional
function updateAIConfidence() {
  const confidenceFill = document.getElementById("ai-confidence")
  const confidencePercent = document.getElementById("confidence-percent")

  if (confidenceFill && confidencePercent) {
    // Base confidence on sensor data quality and system status
    let confidence = 70 // Base confidence

    // Get current sensor data to calculate confidence
    const soilMoisture = Number.parseFloat(document.getElementById("soilMoisture").textContent) || 0
    const humidity = Number.parseFloat(document.getElementById("airHumidity").textContent) || 0
    const waterLevel = Number.parseFloat(document.getElementById("waterLevel").textContent) || 0

    // Increase confidence based on sensor readings being in good ranges
    if (soilMoisture > 30 && soilMoisture < 80) confidence += 10
    if (humidity > 40 && humidity < 80) confidence += 10
    if (waterLevel > 20) confidence += 10

    // Cap at 100%
    confidence = Math.min(100, confidence)

    confidenceFill.style.width = `${confidence}%`
    confidencePercent.textContent = `${confidence}%`
  }
}

// Fetch sensor data from Firebase
async function fetchSensorData() {
  console.log("Fetching data from Firebase...");
  try {
    const res = await fetch(`${FIREBASE_URL}.json`)
    const data = await res.json()
    if (data) {
      updateUI(data)
      updateConnectionStatus(true)
    }
    console.log("Firebase data fetched:", data);
  } catch (error) {
    console.error("Failed to fetch sensor data:", error)
    updateConnectionStatus(false)
  }
}

// Update connection status
function updateConnectionStatus(isOnline) {
  const statusDot = document.getElementById("connection-status")
  const statusText = statusDot.nextElementSibling

  if (isOnline) {
    statusDot.className = "status-dot online"
    statusText.textContent = "Online"
  } else {
    statusDot.className = "status-dot"
    statusText.textContent = "Offline"
  }
}

// Fetch AI recommendation
async function fetchAIRecommendation() {
  try {
    const res = await fetch(`${FIREBASE_URL}/ai/recommendation.json`)
    let data = await res.json()
    if (typeof data === "string" && data.startsWith('"') && data.endsWith('"')) {
      data = data.slice(1, -1)
    }
    document.getElementById("aiRecommendation").textContent = data || "No recommendations available"

    // Hide thinking animation
    const thinking = document.getElementById("ai-thinking")
    if (thinking) {
      thinking.style.display = "none"
    }
  } catch (error) {
    console.error("Failed to fetch AI recommendation:", error)
    document.getElementById("aiRecommendation").textContent = "Unable to load recommendations"
  }
}

// Manual override: Start/Stop Pump
async function togglePumpWithManualOverride(state) {
  try {
    await fetch(`${FIREBASE_URL}/controls.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pump: state, manual_override: true }),
    })

    showPumpNotification(state)
    updatePumpStatus(state)
    updateControlMode("Manual")

    if (state) {
      pumpStartTime = Date.now()
    } else {
      pumpStartTime = null
    }

    // Add alert
    addAlert("info", "Pump Control", `Pump ${state ? "started" : "stopped"} manually`)
  } catch (error) {
    console.error("Failed to update pump state:", error)
  }
}

// Return to Auto Mode
async function resetAutoMode() {
  try {
    await fetch(`${FIREBASE_URL}/controls.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manual_override: false }),
    })

    showPumpNotification("auto")
    updateControlMode("Automatic")
    addAlert("success", "Auto Mode", "System returned to automatic mode")
  } catch (error) {
    console.error("Failed to reset to auto mode:", error)
  }
}

// Update control mode display
function updateControlMode(mode) {
  const modeIndicator = document.getElementById("control-mode")
  if (modeIndicator) {
    modeIndicator.textContent = mode
  }
}

// Show pump notification
function showPumpNotification(state) {
  const notification = document.getElementById("pump-popup")
  const sound = document.getElementById("pump-sound")

  if (notification) {
    const messageElement = notification.querySelector(".notification-message")
    const iconElement = notification.querySelector(".notification-icon i")

    if (state === "auto") {
      messageElement.textContent = "System returned to automatic mode"
      iconElement.className = "fas fa-magic"
    } else {
      messageElement.textContent = state ? "Pump has been started manually" : "Pump has been stopped manually"
      iconElement.className = state ? "fas fa-play" : "fas fa-stop"
    }

    notification.style.display = "flex"

    if (sound) {
      sound.currentTime = 0
      sound.play().catch(() => {}) // Ignore audio errors
    }

    setTimeout(() => {
      notification.style.display = "none"
    }, 4000)
  }
}

// Global variables for pump tracking
let pumpStartTime = null
let totalPumpRuntime = 0 // in milliseconds
let totalWaterUsed = 0
let lastPumpState = false
let currentFlowRate = 2.5 // Default flow rate, will be updated from Firebase

// Update pump status and calculate runtime/water usage
function updatePumpStatus(isOn) {
  const statusText = document.getElementById("pump-status-text")
  const indicator = document.getElementById("pump-indicator")
  const animation = document.getElementById("pump-animation")
  const runtime = document.getElementById("pump-runtime")

  // Track pump state changes
  if (isOn && !lastPumpState) {
    // Pump just turned on
    pumpStartTime = Date.now()
  } else if (!isOn && lastPumpState) {
    // Pump just turned off
    if (pumpStartTime) {
      const sessionRuntime = Date.now() - pumpStartTime
      totalPumpRuntime += sessionRuntime

      // Calculate water used using actual flow rate from Firebase
      const minutesRun = sessionRuntime / (1000 * 60)
      const waterUsedThisSession = minutesRun * currentFlowRate
      totalWaterUsed += waterUsedThisSession

      pumpStartTime = null
    }
  }

  lastPumpState = isOn

  if (statusText && indicator) {
    statusText.textContent = isOn ? "Running" : "Stopped"
    indicator.className = isOn ? "status-indicator active" : "status-indicator"
  }

  if (animation) {
    animation.className = isOn ? "pump-animation active" : "pump-animation"
  }

  // Update runtime display
  if (runtime) {
    let displayRuntime = totalPumpRuntime
    if (isOn && pumpStartTime) {
      displayRuntime += Date.now() - pumpStartTime
    }

    const hours = Math.floor(displayRuntime / (1000 * 60 * 60))
    const minutes = Math.floor((displayRuntime % (1000 * 60 * 60)) / (1000 * 60))
    runtime.textContent = `${hours}h ${minutes}m`
  }

  // Update total runtime in stats
  const totalRuntimeElement = document.getElementById("total-runtime")
  if (totalRuntimeElement) {
    let displayRuntime = totalPumpRuntime
    if (isOn && pumpStartTime) {
      displayRuntime += Date.now() - pumpStartTime
    }

    const hours = Math.floor(displayRuntime / (1000 * 60 * 60))
    const minutes = Math.floor((displayRuntime % (1000 * 60 * 60)) / (1000 * 60))
    totalRuntimeElement.textContent = `${hours}h ${minutes}m`
  }

  // Update water used in stats
  const waterUsedElement = document.getElementById("water-used")
  if (waterUsedElement) {
    let currentWaterUsed = totalWaterUsed
    if (isOn && pumpStartTime) {
      const currentSessionMinutes = (Date.now() - pumpStartTime) / (1000 * 60)
      currentWaterUsed += currentSessionMinutes * currentFlowRate
    }
    waterUsedElement.textContent = `${currentWaterUsed.toFixed(1)} L`
  }
}

// Fetch pump status from Firebase
async function fetchPumpStatus() {
  try {
    const res = await fetch(`${FIREBASE_URL}/controls.json`)
    const data = await res.json()
    if (data) {
      updatePumpStatus(data.pump)

      // Update control mode based on status
      if (data.scheduled) {
        updateControlMode("Scheduled")
      } else if (data.manual_override) {
        updateControlMode("Manual")
      } else {
        updateControlMode("Automatic")
      }
    }
  } catch (error) {
    console.error("Failed to fetch pump status:", error)
  }
}

// Show air quality alert
function showAirQualityAlert(message, statusText) {
  const notification = document.getElementById("air-quality-popup")
  const sound = document.getElementById("aqi-alert-sound")

  // Avoid showing again if dismissed for same status
  if (alertDismissedForStatus === statusText) {
    return
  }

  if (notification) {
    notification.querySelector(".notification-message").textContent = message
    notification.style.display = "flex"

    if (sound) {
      sound.currentTime = 0
      sound.play().catch(() => {}) // Ignore audio errors
    }
  }
}

// Close AQI alert
document.getElementById("aqi-confirm-btn").addEventListener("click", () => {
  const notification = document.getElementById("air-quality-popup")
  notification.style.display = "none"

  // Remember dismissed status so it doesn't show again
  alertDismissedForStatus = lastAirQualityStatus
})

// Add alert to alerts tab
function addAlert(type, title, message) {
  alertCount++
  updateAlertBadge()

  const alertsList = document.getElementById("alerts-list")
  if (!alertsList) return

  const alertItem = document.createElement("div")
  alertItem.className = `alert-item ${type}`
  alertItem.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h4 style="font-weight: 700; margin-bottom: 0.5rem; color: var(--gray-900);">${title}</h4>
        <p style="color: var(--gray-600); margin-bottom: 0.5rem;">${message}</p>
        <small style="color: var(--gray-400);">${new Date().toLocaleString()}</small>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="this.parentElement.parentElement.remove(); alertCount--; updateAlertBadge();">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `

  alertsList.insertBefore(alertItem, alertsList.firstChild)
}

// Update alert badge
function updateAlertBadge() {
  const badge = document.getElementById("alert-count")
  if (badge) {
    badge.textContent = alertCount
    badge.style.display = alertCount > 0 ? "flex" : "none"
  }
}

// Weather functions
function getWeatherDescription(code) {
  const weatherMap = {
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
  }
  return weatherMap[code] || "Unknown conditions"
}

// Fetch weather data
function fetchWeather() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateWeather(position.coords.latitude, position.coords.longitude)
      },
      () => {
        updateWeather(40.7128, -74.006) // Default to New York
      },
    )
  } else {
    updateWeather(40.7128, -74.006)
  }
}

function updateWeather(lat, lon) {
  fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=3`,
  )
    .then((response) => response.json())
    .then((data) => {
      const weather = data.current_weather
      const temp = Math.round(weather.temperature)
      const description = getWeatherDescription(weather.weathercode)

      document.getElementById("weather-summary").textContent = `${temp}°C, ${description}`
      document.getElementById("weather-details").textContent = `Wind: ${weather.windspeed} km/h`

      // Update forecast
      const forecast = document.getElementById("weather-forecast")
      if (forecast && data.daily) {
        forecast.innerHTML = ""
        for (let i = 1; i < Math.min(4, data.daily.time.length); i++) {
          const day = new Date(data.daily.time[i]).toLocaleDateString("en", { weekday: "short" })
          const maxTemp = Math.round(data.daily.temperature_2m_max[i])
          const weatherCode = data.daily.weathercode[i]
          const icon = getWeatherIcon(weatherCode)

          const forecastItem = document.createElement("div")
          forecastItem.className = "forecast-item"
          forecastItem.innerHTML = `
            <span>${day}</span>
            <i class="${icon}"></i>
            <span>${maxTemp}°C</span>
          `
          forecast.appendChild(forecastItem)
        }
      }
    })
    .catch((error) => {
      console.error("Failed to fetch weather:", error)
      document.getElementById("weather-summary").textContent = "Weather data unavailable"
      document.getElementById("weather-details").textContent = ""
    })
}

function getWeatherIcon(code) {
  const iconMap = {
    0: "fas fa-sun",
    1: "fas fa-sun",
    2: "fas fa-cloud-sun",
    3: "fas fa-cloud",
    45: "fas fa-smog",
    48: "fas fa-smog",
    51: "fas fa-cloud-drizzle",
    53: "fas fa-cloud-drizzle",
    55: "fas fa-cloud-rain",
    61: "fas fa-cloud-rain",
    63: "fas fa-cloud-rain",
    65: "fas fa-cloud-showers-heavy",
    71: "fas fa-snowflake",
    73: "fas fa-snowflake",
    75: "fas fa-snowflake",
    80: "fas fa-cloud-rain",
    81: "fas fa-cloud-rain",
    82: "fas fa-cloud-showers-heavy",
    95: "fas fa-bolt",
  }
  return iconMap[code] || "fas fa-question"
}

// Settings modal functionality
function initSettings() {
  const settingsBtn = document.getElementById("settings-btn")
  const settingsModal = document.getElementById("settings-modal")
  const closeSettings = document.getElementById("close-settings")
  const cancelSettings = document.getElementById("cancel-settings")
  const saveSettings = document.getElementById("save-settings")

  settingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("active")
  })

  closeSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active")
  })

  cancelSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active")
  })

  saveSettings.addEventListener("click", () => {
    // Save settings logic here
    settingsModal.classList.remove("active")
    addAlert("success", "Settings", "Settings saved successfully")
  })

  // Close modal when clicking outside
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove("active")
    }
  })
}

// Schedule management
let schedules = [
  { time: "06:00", duration: 30, enabled: true },
  { time: "18:00", duration: 20, enabled: true },
]
let activeSchedule = null

// Check schedules every minute
function checkSchedules() {
  const now = new Date()
  const currentTime = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0")

  schedules.forEach((schedule, index) => {
    if (schedule.enabled && schedule.time === currentTime && !activeSchedule) {
      // Start scheduled watering
      startScheduledWatering(schedule, index)
    }
  })
}

// Start scheduled watering
async function startScheduledWatering(schedule, scheduleIndex) {
  try {
    activeSchedule = {
      ...schedule,
      index: scheduleIndex,
      startTime: Date.now(),
      endTime: Date.now() + schedule.duration * 60 * 1000,
    }

    // Set pump and manual override to true
    await fetch(`${FIREBASE_URL}/controls.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pump: true,
        manual_override: true,
        scheduled: true,
      }),
    })

    updateControlMode("Scheduled")
    addAlert("info", "Scheduled Watering", `Started ${schedule.duration} minute watering session`)

    // Set timeout to stop watering
    setTimeout(
      () => {
        stopScheduledWatering()
      },
      schedule.duration * 60 * 1000,
    )
  } catch (error) {
    console.error("Failed to start scheduled watering:", error)
  }
}

// Stop scheduled watering
async function stopScheduledWatering() {
  if (!activeSchedule) return

  try {
    await fetch(`${FIREBASE_URL}/controls.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pump: false,
        manual_override: false,
        scheduled: false,
      }),
    })

    const duration = Math.round((Date.now() - activeSchedule.startTime) / (1000 * 60))
    addAlert("success", "Scheduled Watering Complete", `Watering completed after ${duration} minutes`)

    activeSchedule = null
    updateControlMode("Automatic")
  } catch (error) {
    console.error("Failed to stop scheduled watering:", error)
  }
}

// Add schedule functionality to the UI
function initSchedule() {
  const scheduleBtn = document.getElementById("schedule-btn")
  const scheduleSection = document.getElementById("control-schedule")

  scheduleBtn.addEventListener("click", () => {
    if (scheduleSection.style.display === "none") {
      scheduleSection.style.display = "block"
      scheduleBtn.innerHTML = '<i class="fas fa-calendar-times"></i> Hide Schedule <div class="btn-ripple"></div>'
      renderSchedules()
    } else {
      scheduleSection.style.display = "none"
      scheduleBtn.innerHTML = '<i class="fas fa-calendar-alt"></i> Schedule <div class="btn-ripple"></div>'
    }
  })
}

// Render schedules in the UI
function renderSchedules() {
  const scheduleSection = document.getElementById("control-schedule")
  if (!scheduleSection) return

  scheduleSection.innerHTML = `
    <h4>Irrigation Schedule</h4>
    <div id="schedule-list">
      ${schedules
        .map(
          (schedule, index) => `
        <div class="schedule-item" data-index="${index}">
          <input type="time" value="${schedule.time}" onchange="updateScheduleTime(${index}, this.value)">
          <span>Duration: </span>
          <input type="number" value="${schedule.duration}" min="1" max="120" onchange="updateScheduleDuration(${index}, this.value)">
          <span>min</span>
          <label>
            <input type="checkbox" ${schedule.enabled ? "checked" : ""} onchange="toggleSchedule(${index}, this.checked)">
            Enabled
          </label>
          <button class="btn btn-sm btn-danger" onclick="removeSchedule(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `,
        )
        .join("")}
    </div>
    <button class="btn btn-sm btn-primary" onclick="addNewSchedule()">
      <i class="fas fa-plus"></i>
      Add Schedule
    </button>
  `
}

// Schedule management functions
function updateScheduleTime(index, time) {
  schedules[index].time = time
  saveSchedulesToLocalStorage()
}

function updateScheduleDuration(index, duration) {
  schedules[index].duration = Number.parseInt(duration)
  saveSchedulesToLocalStorage()
}

function toggleSchedule(index, enabled) {
  schedules[index].enabled = enabled
  saveSchedulesToLocalStorage()
}

function removeSchedule(index) {
  schedules.splice(index, 1)
  renderSchedules()
  saveSchedulesToLocalStorage()
}

function addNewSchedule() {
  schedules.push({
    time: "12:00",
    duration: 15,
    enabled: true,
  })
  renderSchedules()
  saveSchedulesToLocalStorage()
}

function saveSchedulesToLocalStorage() {
  localStorage.setItem("aquaclima_schedules", JSON.stringify(schedules))
}

function loadSchedulesFromLocalStorage() {
  const saved = localStorage.getItem("aquaclima_schedules")
  if (saved) {
    schedules = JSON.parse(saved)
  }
}

// Button ripple effect
function addRippleEffect() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("control-btn")) {
      const button = e.target
      const ripple = button.querySelector(".btn-ripple")

      if (ripple) {
        const rect = button.getBoundingClientRect()
        const size = Math.max(rect.width, rect.height)
        const x = e.clientX - rect.left - size / 2
        const y = e.clientY - rect.top - size / 2

        ripple.style.width = ripple.style.height = size + "px"
        ripple.style.left = x + "px"
        ripple.style.top = y + "px"

        ripple.classList.add("animate")
        setTimeout(() => {
          ripple.classList.remove("animate")
        }, 600)
      }
    }
  })
}

// Clear all alerts
function initAlertsClear() {
  const clearAlertsBtn = document.getElementById("clear-alerts")
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener("click", () => {
      const alertsList = document.getElementById("alerts-list")
      if (alertsList) {
        alertsList.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">No alerts</p>'
        alertCount = 0
        updateAlertBadge()
      }
    })
  }
}

// Export data functionality
function initDataExport() {
  const exportBtn = document.getElementById("export-data")
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const csvContent =
        "data:text/csv;charset=utf-8," +
 "Timestamp,Soil Moisture (%),Air Humidity (%),Air Temperature (°C),pH Level,Water Level (%)\n" +
 sensorHistory
          .map(
            (row) =>
 `${row.timestamp},${row.soil_moisture || 0},${row.air_humidity || 0},${row.air_temp || 0},${row.ph || 0},${row.water_level || 0}`,
          )
          .join("\n")

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `aquaclima_data_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      addAlert("success", "Data Export", "Data exported successfully")
    })
  }
}

// Update history table
function updateHistoryTable() {
  console.log("Sensor History:", sensorHistory);

  const tbody = document.getElementById("history-tbody");
  if (!tbody) return

  tbody.innerHTML = ""

  // Show last 20 entries
  const recentHistory = sensorHistory.slice(-20).reverse()

  recentHistory.forEach((entry) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${new Date(entry.timestamp).toLocaleString()}</td>
      <td>${entry.soil_moisture || "--"}%</td>
      <td>${entry.air_humidity || "--"}%</td>
      <td>${entry.air_temp || "--"}°C</td>
      <td>${entry.ph ? entry.ph.toFixed(1) : "--"}</td>
      <td>${entry.water_level || "--"}%</td>
    `
    tbody.appendChild(row)
  })

  if (recentHistory.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: var(--gray-500);">No data available</td></tr>'
  }
}

// Refresh all data
function refreshAllData() {
  fetchSensorData()
  fetchAIRecommendation()
  fetchWeather()
  fetchPumpStatus()
  updateHistoryTable()
}

// Refresh button functionality
document.getElementById("refresh-btn").addEventListener("click", function () {
  refreshAllData()

  // Add visual feedback
  const icon = this.querySelector("i")
  icon.style.transform = "rotate(360deg)"
  icon.style.transition = "transform 0.5s ease"

  setTimeout(() => {
    icon.style.transform = ""
  }, 500)

  addAlert("info", "Data Refresh", "All data refreshed successfully")
})

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  // Load schedules from localStorage
  loadSchedulesFromLocalStorage()

  // Initialize all components
  initThemeToggle()
  initTabs()
  initSettings()
  initSchedule()
  addRippleEffect()
  initAlertsClear()
  initDataExport()

  // Initial data fetch
  refreshAllData()

  // Set up periodic updates every 5 seconds
  setInterval(refreshAllData, 2000)

  // Check schedules every minute
  setInterval(checkSchedules, 1000)

  // Update pump runtime display every second when pump is running
  setInterval(() => {
    if (lastPumpState) {
      updatePumpStatus(true) // This will update the runtime display
    }
  }, 1000)

  // Add smooth animations to cards
  const cards = document.querySelectorAll(".sensor-card, .status-card, .info-card")
  cards.forEach((card, index) => {
    card.style.opacity = "0"
    card.style.transform = "translateY(20px)"

    setTimeout(() => {
      card.style.transition = "all 0.5s ease"
      card.style.opacity = "1"
      card.style.transform = "translateY(0)"
    }, index * 100)
  })

  // Add some initial alerts for demo
  setTimeout(() => {
    addAlert("info", "System Started", "CLIMANEER dashboard initialized successfully")
  }, 3000)
})
