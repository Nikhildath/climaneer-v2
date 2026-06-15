# Firebase Sync Testing Guide

## Testing Auto Mode Update to Firebase

### Steps:
1. Open app at http://localhost:5000
2. Click ⚙️ Settings
3. Select "Control Mode" → Choose "Automatic (Firebase-controlled)"
4. Click "Save Changes"

### Expected:
- Toast: "Settings Saved" → "Settings synced"
- Firebase `/controls.json` should contain:
  ```json
  {
    "pump": false,
    "manual_override": false,
    "mode": "FIREBASE",
    "last_settings_saved_at": "2025-11-11T22:12:00.000Z"
  }
  ```

### Debug:
- Check browser DevTools → Network tab
- Look for PUT request to `https://aquaclima-datatabase-default-rtdb.firebaseio.com/controls.json`
- Verify response contains the sent data

---

## Testing Scheduled Mode Display

### Steps:
1. Open app at http://localhost:5000
2. Click ⚙️ Settings
3. Select "Control Mode" → Choose "Scheduled (Time-based)"

### Expected:
- A new section should appear below the mode selector
- Fields visible:
  - "Enable Schedule" toggle
  - "Start Time (HH:MM)" input
  - "End Time (HH:MM)" input  
  - "Pump Duration (minutes)" input

### If Not Showing:
- Check browser console for errors
- Verify `localSettings.controlMode === "scheduled"`
- Ensure `scheduledSettings` object exists with defaults

---

## Testing Scheduled Mode Firebase Update

### Steps:
1. Open app at http://localhost:5000
2. Click ⚙️ Settings
3. Select "Scheduled Mode"
4. Set:
   - Start Time: 09:00
   - End Time: 17:00
   - Duration: 45 minutes
5. Enable Schedule toggle
6. Click "Save Changes"

### Expected:
- Toast: "Settings Saved" → "Settings synced"
- Firebase `/controls.json` should contain:
  ```json
  {
    "pump": false,
    "manual_override": false,
    "mode": "scheduled",
    "scheduled_start_time": "09:00",
    "scheduled_end_time": "17:00",
    "scheduled_duration_minutes": 45,
    "scheduled_enabled": true,
    "last_settings_saved_at": "2025-11-11T22:12:00.000Z"
  }
  ```

### Debug:
- Check browser DevTools → Network tab
- Look for PUT request to `/controls.json`
- Verify all schedule fields are included

---

## Testing Scheduled Mode Runtime

### Steps:
1. Set current time to within schedule window (e.g., 14:00 if schedule is 09:00-17:00)
2. Enable scheduled mode with settings from above
3. Wait 30-60 seconds (scheduler checks every 30s)

### Expected:
- Toast notification: "Scheduled Pump Started" with end time and duration
- Dashboard shows pump status as "running"
- After configured duration (45 min), toast: "Scheduled Pump Stopped"

### Debug:
- Check browser console for schedule debug logs
- Monitor Firebase `/controls.json` for pump status changes
- Verify scheduled mode effect is active (look for `setInterval` in React DevTools)

---

## Testing Manual Mode Control

### Steps:
1. Select Manual mode in Settings
2. Save
3. Return to Dashboard
4. Click pump toggle button in Quick Actions

### Expected:
- Pump toggle button appears on Dashboard
- Click toggles pump ON/OFF immediately
- Toast confirms action
- Firebase `/controls.json` updates with pump status

---

## Firebase Data Structure

Expected complete `/controls.json`:
```json
{
  "pump": true,
  "manual_override": false,
  "mode": "FIREBASE",
  "dataUsage": 125,
  "firebase_online": true,
  "pump_runtime": 3600,
  "uptime": 86400,
  "scheduled_start_time": "09:00",
  "scheduled_end_time": "17:00",
  "scheduled_duration_minutes": 45,
  "scheduled_enabled": true,
  "last_settings_saved_at": "2025-11-11T22:12:00.000Z",
  "last_manual_pump_change": "2025-11-11T22:12:00.000Z"
}
```

---

## Common Issues & Fixes

### Issue: Settings not syncing to Firebase
**Cause**: Firebase rules may not allow unauthenticated writes
**Fix**: Check Firebase RTDB rules are set to public (development only)

### Issue: Scheduled mode fields not appearing
**Cause**: `controlMode !== "scheduled"` in the condition
**Fix**: Verify select dropdown is actually changing value

### Issue: Auto mode not setting manual_override=false
**Cause**: Logic error in handleSettingsSave
**Fix**: Ensure `isManual = (mode === "manual")` is correct

### Issue: Pump not toggling on schedule
**Cause**: Client time out of sync, or schedule window calculation wrong
**Fix**: Check system time, verify start/end time logic for midnight spans

---

## Verification Checklist

- [ ] Auto mode sends `manual_override: false` to Firebase
- [ ] Scheduled mode sends all schedule fields to Firebase
- [ ] Scheduled mode UI appears when mode selected
- [ ] Scheduled mode runtime enforcer triggers pump toggle
- [ ] Settings are persisted across page refresh
- [ ] All toasts appear when settings saved
- [ ] Manual pump toggle works on Dashboard
