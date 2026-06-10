# CLIMANEER Dashboard - Design Guidelines

## Design Approach: Utility-Focused Dashboard System

**Selected Approach**: Design System (Material Design + Fluent Design hybrid)
- **Justification**: Real-time monitoring dashboard requiring data clarity, efficiency, and consistent patterns
- **Key Principles**: Information hierarchy, glanceable metrics, responsive data visualization, touch-friendly mobile interface

## Core Design Elements

### A. Typography
**Font Stack**: Inter (primary), system fonts fallback
- **Headings**: 
  - H1: 2rem (32px), weight 700, letter-spacing 0.05em
  - H2: 1.5rem (24px), weight 600
  - H3: 1.25rem (20px), weight 600
- **Body**: 0.9375rem (15px), weight 400, line-height 1.6
- **Small/Metadata**: 0.875rem (14px), weight 500
- **Micro/Labels**: 0.75rem (12px), weight 600, uppercase, letter-spacing 0.1em

### B. Layout System
**Tailwind Spacing Units**: Consistent use of 2, 4, 6, 8, 12, 16, 20, 24, 32
- Card padding: `p-6` (desktop), `p-4` (mobile)
- Section spacing: `py-12` to `py-20`
- Grid gaps: `gap-6` (desktop), `gap-4` (mobile)
- Container max-width: 1400px with `px-8` (desktop), `px-4` (mobile)

### C. Component Library

**1. Sensor Cards (Primary Dashboard Elements)**
- Glassmorphic cards with subtle backdrop blur
- Icon + title header with trend indicator (up/down/stable arrows)
- Large metric display (3rem font size, gradient text)
- Visual gauge (progress rings, bars, or custom visualizations)
- Mini sparkline chart at bottom
- Hover: Subtle lift (translateY -4px), enhanced shadow
- Mobile: Stack to single column, reduce padding

**2. Status Overview Cards**
- System status, pump, battery, network
- Status dot indicators (green/yellow/red with pulse animation)
- Icon visualization (pump animation, battery fill, signal bars)
- Runtime/uptime metadata
- Grid: 4 columns desktop, 2 columns tablet, 1 column mobile

**3. Navigation Tabs**
- Sticky horizontal tab bar below header
- Active indicator: 3px gradient bottom border
- Badge counters for alerts
- Mobile: Horizontal scroll with snap points

**4. Control Panels**
- Pump controls with large toggle switches
- Mode selector (Auto/Manual) with radio buttons
- Settings threshold inputs with increment/decrement buttons
- Clear labels and helper text

**5. Charts & Visualizations**
- Line charts with gradient fills for trends
- Bar charts for usage statistics
- Comparison view toggles (day/week/month)
- Canvas-based with touch-responsive interactions
- Mobile: Reduce height, simplify axes

**6. Modals & Overlays**
- Settings panel: Slide-in from right (400px wide desktop)
- Export modal: Center overlay with backdrop blur
- Alert notifications: Toast-style from top-right
- Mobile: Full-screen takeover for modals

**7. Action Buttons**
- Primary: Gradient background (emerald to teal), white text, shadow glow
- Secondary: Border outline, transparent background
- Icon buttons: 40px square, rounded-lg
- Floating action button (FAB): Voice control mic, bottom-left, 60px circle
- Touch targets: Minimum 44px for mobile

### D. Responsive Breakpoints
- **Mobile**: 320px - 640px (single column, stacked cards)
- **Tablet**: 641px - 1024px (2-column grid, condensed spacing)
- **Desktop**: 1025px+ (multi-column dashboard, full features)

**Mobile Optimizations**:
- Collapsible header on scroll
- Bottom navigation for quick tab switching
- Swipe gestures between tabs
- Pull-to-refresh on dashboard
- Reduced animation complexity
- Touch-optimized slider controls

### E. Interactive States
**Hover** (desktop only): 
- Cards: lift + shadow enhancement
- Buttons: brightness increase + scale 1.02

**Active/Focus**:
- Buttons: scale 0.98 + brightness reduction
- Form inputs: 2px border with primary color

**Loading States**:
- Skeleton loaders with shimmer animation
- Spinner overlays for data refresh
- Progress indicators for exports

**Error States**:
- Red border + warning icon
- Inline error messages below inputs

### F. Data Visualization Principles
- Use emerald (#10b981) for positive/good metrics
- Cyan (#06b6d4) for neutral/info metrics  
- Amber (#f59e0b) for warnings
- Red (#ef4444) for critical alerts
- Consistent gauge designs across all sensors
- Animated transitions when values update (300ms ease-out)

### G. Accessibility & UX
- ARIA labels on all interactive elements
- Keyboard navigation support (tab order, escape to close)
- Screen reader announcements for value changes
- Color contrast ratio 4.5:1 minimum
- Text alternatives for all icons
- Touch targets minimum 44x44px on mobile

### H. Additional Features Integration
**Offline Mode**: Banner indicator when offline, cached data display
**Export Functionality**: Download icon in header, format selector (CSV/JSON)
**Notifications**: Toast system with dismiss button, sound toggle, priority levels
**Quick Actions Panel**: Floating speed dial or dashboard shortcuts widget
**Statistics Dashboard**: Dedicated tab with comparison charts, averages, trends
**Settings Panel**: Threshold configuration, unit preferences (°C/°F), polling intervals

## Images
**Not applicable** - This is a data dashboard focused on real-time sensor metrics and charts. No hero images or decorative photography needed. All visual elements are functional (icons, charts, gauges, status indicators).