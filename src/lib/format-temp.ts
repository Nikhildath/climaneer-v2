export function formatCelsius(celsius: number): number {
  return Math.round(celsius * 10) / 10;
}

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9 / 5 + 32) * 10) / 10;
}

export function formatTemp(celsius: number, unit: "celsius" | "fahrenheit"): string {
  if (unit === "fahrenheit") {
    return `${celsiusToFahrenheit(celsius)}°F`;
  }
  return `${formatCelsius(celsius)}°C`;
}

export function tempUnitLabel(unit: "celsius" | "fahrenheit"): string {
  return unit === "celsius" ? "°C" : "°F";
}
