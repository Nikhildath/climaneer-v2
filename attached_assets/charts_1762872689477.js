// Chart functionality for AQUACLIMA dashboard
// This file handles all chart rendering and data visualization

class ChartManager {
  constructor() {
    this.charts = new Map();
    this.chartData = {
      moisture: [],
      humidity: [],
      temperature: [],
      ph: [],
      waterLevel: [],
      flow: [],
      timestamps: []
    };
    this.maxDataPoints = 50;
    this.init();
  }

  init() {
    this.initMiniCharts();
    this.initAnalyticsCharts();
    this.generateSampleData();
  }

  // Generate sample data for demonstration
  generateSampleData() {
    const now = new Date();
    for (let i = 49; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
      this.chartData.timestamps.push(timestamp);
      
      // Generate realistic sample data with some variation
      this.chartData.moisture.push(45 + Math.sin(i * 0.1) * 10 + Math.random() * 5);
      this.chartData.humidity.push(60 + Math.cos(i * 0.15) * 15 + Math.random() * 5);
      this.chartData.temperature.push(22 + Math.sin(i * 0.08) * 5 + Math.random() * 2);
      this.chartData.ph.push(6.8 + Math.sin(i * 0.12) * 0.5 + Math.random() * 0.2);
      this.chartData.waterLevel.push(70 + Math.cos(i * 0.1) * 20 + Math.random() * 5);
      this.chartData.flow.push(2.5 + Math.sin(i * 0.2) * 1 + Math.random() * 0.5);
    }
  }

  // Initialize mini charts for sensor cards
  initMiniCharts() {
    this.createMiniChart('moisture-mini-chart', this.chartData.moisture, '#10b981');
    this.createMiniChart('humidity-mini-chart', this.chartData.humidity, '#06b6d4');
  }

  // Create mini sparkline charts
  createMiniChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    // Calculate min/max for scaling
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '20');
    gradient.addColorStop(1, color + '05');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    // Draw area chart
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Initialize analytics charts
  initAnalyticsCharts() {
    this.createTrendsChart();
    this.createUsageChart();
  }

  // Create trends chart
  createTrendsChart() {
    const canvas = document.getElementById('trends-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart configuration
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw background grid
    this.drawGrid(ctx, padding, padding, chartWidth, chartHeight);

    // Draw axes
    this.drawAxes(ctx, padding, padding, chartWidth, chartHeight);

    // Draw multiple data series
    const series = [
      { data: this.chartData.moisture, color: '#10b981', label: 'Soil Moisture' },
      { data: this.chartData.humidity, color: '#06b6d4', label: 'Air Humidity' },
      { data: this.chartData.temperature.map(t => t * 2), color: '#f59e0b', label: 'Temperature (×2)' }
    ];

    series.forEach(serie => {
      this.drawLineSeries(ctx, serie.data, serie.color, padding, padding, chartWidth, chartHeight);
    });

    // Draw legend
    this.drawLegend(ctx, series, width - 150, 20);
  }

  // Create usage chart (bar chart)
  createUsageChart() {
    const canvas = document.getElementById('usage-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Sample usage data for last 7 days
    const usageData = [45, 52, 38, 61, 47, 55, 42];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw background grid
    this.drawGrid(ctx, padding, padding, chartWidth, chartHeight);

    // Draw axes
    this.drawAxes(ctx, padding, padding, chartWidth, chartHeight);

    // Draw bars
    const barWidth = chartWidth / usageData.length * 0.8;
    const barSpacing = chartWidth / usageData.length * 0.2;
    const maxValue = Math.max(...usageData);

    usageData.forEach((value, index) => {
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const barHeight = (value / maxValue) * chartHeight;
      const y = padding + chartHeight - barHeight;

      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#1d4ed8');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Add value labels
      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(value + 'L', x + barWidth / 2, y - 5);

      // Add day labels
      ctx.fillText(labels[index], x + barWidth / 2, padding + chartHeight + 20);
    });
  }

  // Helper method to draw grid
  drawGrid(ctx, x, y, width, height) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const lineX = x + (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(lineX, y + height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 5; i++) {
      const lineY = y + (i / 5) * height;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + width, lineY);
      ctx.stroke();
    }
  }

  // Helper method to draw axes
  drawAxes(ctx, x, y, width, height) {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.stroke();
  }

  // Helper method to draw line series
  drawLineSeries(ctx, data, color, x, y, width, height) {
    if (data.length === 0) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;

    ctx.beginPath();

    data.forEach((value, index) => {
      const pointX = x + (index / (data.length - 1)) * width;
      const pointY = y + height - ((value - min) / range) * height;

      if (index === 0) {
        ctx.moveTo(pointX, pointY);
      } else {
        ctx.lineTo(pointX, pointY);
      }
    });

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw data points
    ctx.fillStyle = color;
    data.forEach((value, index) => {
      const pointX = x + (index / (data.length - 1)) * width;
      const pointY = y + height - ((value - min) / range) * height;

      ctx.beginPath();
      ctx.arc(pointX, pointY, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Helper method to draw legend
  drawLegend(ctx, series, x, y) {
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';

    series.forEach((serie, index) => {
      const legendY = y + index * 20;

      // Draw color indicator
      ctx.fillStyle = serie.color;
      ctx.fillRect(x, legendY, 12, 12);

      // Draw label
      ctx.fillStyle = '#374151';
      ctx.fillText(serie.label, x + 18, legendY + 9);
    });
  }

  // Update chart data with new sensor readings
  updateChartData(newData) {
    const timestamp = new Date();

    // Add new data point
    this.chartData.timestamps.push(timestamp);
    this.chartData.moisture.push(newData.soil || 0);
    this.chartData.humidity.push(newData.humidity || 0);
    this.chartData.temperature.push(newData.air_temp || 0);
    this.chartData.ph.push(newData.ph || 0);
    this.chartData.waterLevel.push(newData.water_level || 0);
    this.chartData.flow.push(newData.flow || 0);

    // Remove old data points if we exceed max
    if (this.chartData.timestamps.length > this.maxDataPoints) {
      Object.keys(this.chartData).forEach(key => {
        this.chartData[key].shift();
      });
    }

    // Refresh charts
    this.refreshCharts();
  }

  // Refresh all charts with new data
  refreshCharts() {
    this.createMiniChart('moisture-mini-chart', this.chartData.moisture, '#10b981');
    this.createMiniChart('humidity-mini-chart', this.chartData.humidity, '#06b6d4');
    this.createTrendsChart();
    this.createUsageChart();
  }

  // System chart for status card
  createSystemChart() {
    const canvas = document.getElementById('system-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 25;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw progress arc (simulating system health)
    const progress = 0.95; // 95% system health
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * progress);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw center text
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('95%', centerX, centerY + 4);
  }

  // Export chart data as CSV
  exportChartData() {
    const headers = ['Timestamp', 'Soil Moisture', 'Air Humidity', 'Temperature', 'pH', 'Water Level', 'Flow Rate'];
    const rows = this.chartData.timestamps.map((timestamp, index) => [
      timestamp.toISOString(),
      this.chartData.moisture[index]?.toFixed(1) || '',
      this.chartData.humidity[index]?.toFixed(1) || '',
      this.chartData.temperature[index]?.toFixed(1) || '',
      this.chartData.ph[index]?.toFixed(2) || '',
      this.chartData.waterLevel[index]?.toFixed(1) || '',
      this.chartData.flow[index]?.toFixed(2) || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return csvContent;
  }
}

// Real-time chart updates
class RealTimeCharts {
  constructor(chartManager) {
    this.chartManager = chartManager;
    this.isUpdating = false;
    this.updateInterval = null;
  }

  startRealTimeUpdates() {
    if (this.isUpdating) return;

    this.isUpdating = true;
    this.updateInterval = setInterval(() => {
      this.simulateDataUpdate();
    }, 5000); // Update every 5 seconds
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isUpdating = false;
  }

  simulateDataUpdate() {
    // Simulate new sensor data (in real app, this would come from the API)
    const newData = {
      soil: 45 + Math.random() * 20,
      humidity: 60 + Math.random() * 20,
      air_temp: 22 + Math.random() * 8,
      ph: 6.5 + (Math.random() - 0.5) * 2,
      water_level: 70 + Math.random() * 20,
      flow: 2.5 + Math.random() * 2
    };

    this.chartManager.updateChartData(newData);
  }
}

// Chart interaction handlers
class ChartInteractions {
  constructor(chartManager) {
    this.chartManager = chartManager;
    this.init();
  }

  init() {
    this.addTimeRangeHandlers();
    this.addChartHoverEffects();
    this.addExportHandlers();
  }

  addTimeRangeHandlers() {
    const timeRangeBtns = document.querySelectorAll('[data-range]');
    
    timeRangeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all buttons
        timeRangeBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        e.target.classList.add('active');
        
        // Update charts based on selected range
        const range = e.target.dataset.range;
        this.updateChartsForRange(range);
      });
    });
  }

  updateChartsForRange(range) {
    // This would filter the data based on the selected time range
    // For now, we'll just refresh the charts
    this.chartManager.refreshCharts();
  }

  addChartHoverEffects() {
    const chartCards = document.querySelectorAll('.chart-card');
    
    chartCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });
  }

  addExportHandlers() {
    // This would be connected to export buttons in the UI
    document.addEventListener('click', (e) => {
      if (e.target.id === 'export-charts') {
        this.exportCharts();
      }
    });
  }

  exportCharts() {
    const csvData = this.chartManager.exportChartData();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquaclima_charts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    window.URL.revokeObjectURL(url);
  }
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const chartManager = new ChartManager();
  const realTimeCharts = new RealTimeCharts(chartManager);
  const chartInteractions = new ChartInteractions(chartManager);

  // Create system chart
  setTimeout(() => {
    chartManager.createSystemChart();
  }, 1000);

  // Start real-time updates
  realTimeCharts.startRealTimeUpdates();

  // Make chart manager globally available
  window.chartManager = chartManager;
  window.realTimeCharts = realTimeCharts;
});

// Export for use in other modules
window.ChartSystems = {
  ChartManager,
  RealTimeCharts,
  ChartInteractions
};