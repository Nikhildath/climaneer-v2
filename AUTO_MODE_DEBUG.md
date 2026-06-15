# Auto Mode Button Debug Guide

## Status
I've added comprehensive logging to help identify why the auto mode button isn't working. 

## How to Test & Debug

### Step 1: Open Developer Tools
```
Press F12 (or right-click → Inspect)
Go to "Console" tab
Filter for logs with: [Auto Mode Button] or [Switch to Auto Mode]
```

### Step 2: Switch to Manual Mode First
```
1. Go to Settings ⚙️
2. Control Mode → Select "Manual"
3. Save
```

### Step 3: Click Auto Mode Button
```
1. Look at the Quick Actions buttons (bottom-right of Dashboard)
2. The Zap button should be muted (outline style)
3. Click the Zap button
4. Watch the Console for logs
```

### Step 4: Check Console Logs

You should see ONE of these patterns:

#### ✅ SUCCESS - Logs appear in order:
```
[Auto Mode Button] Clicked, currentMode: manual onAutoMode: function
[Switch to Auto Mode] Starting...
[Switch to Auto Mode] Uploading controls: {manual_override: false, mode: "FIREBASE", last_mode_change: "2025-11-11T22:50:00.000Z"}
[Firebase Sync] Mode: automatic isManual: false isScheduled: false
[Firebase Sync] Sending controls: {...}
[Firebase Sync] Success!
[Switch to Auto Mode] Firebase upload successful
[Switch to Auto Mode] Updating settings from: manual to: automatic
[Switch to Auto Mode] Complete!
```

#### ⚠️ ISSUE 1 - Button not firing:
```
Console is empty when clicked
→ Problem: onClick handler not wired correctly
→ Solution: Check if onAutoMode prop is being passed from App.tsx
```

#### ⚠️ ISSUE 2 - Button says function is undefined:
```
[Auto Mode Button] Clicked, currentMode: manual onAutoMode: undefined
→ Problem: onAutoMode prop not passed from parent
→ Solution: Verify App.tsx line 734 has onAutoMode prop
```

#### ⚠️ ISSUE 3 - Firebase error:
```
[Switch to Auto Mode] Firebase upload successful NOT shown
[Firebase Sync] Error: ...
→ Problem: Firebase request failed
→ Solution: Check internet connection, Firebase rules, CORS
```

---

## Quick Checklist

- [ ] Dev server running? (`npm run dev`)
- [ ] In Dashboard view? (bottom-right Quick Actions visible)
- [ ] Currently in Manual or Scheduled mode? (button should be clickable)
- [ ] DevTools Console open and monitoring?
- [ ] Clicked the Zap button (not another button)?

---

## What Should Happen When You Click

1. ✅ Button click registered (see console logs)
2. ✅ Firebase receives update (manual_override: false, mode: FIREBASE)
3. ✅ Toast notification appears: "Auto Mode Enabled"
4. ✅ Button highlights with gradient color
5. ✅ Button becomes disabled (grayed out)
6. ✅ Settings modal shows "Automatic" mode when opened

---

## If Nothing Works

Try these steps:

### 1. Hard Refresh
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### 2. Clear Browser Cache
```
F12 → Application tab → Clear Site Data
```

### 3. Restart Dev Server
```
Terminal: Ctrl + C (stop)
Terminal: npm run dev (restart)
Wait for "serving on port 5000"
Refresh browser
```

### 4. Check Network Tab
```
F12 → Network tab
Click Auto button
Look for PUT request to: https://aquaclima-datatabase-default-rtdb.firebaseio.com/controls.json
Should return 200 OK with response data
```

---

## Expected Behavior Summary

| State | Button Style | Button State | Action on Click |
|-------|--------------|--------------|-----------------|
| Manual | Outline/muted | Enabled | Switch to auto, highlight, disable |
| Scheduled | Outline/muted | Enabled | Switch to auto, highlight, disable |
| Automatic | Gradient/bright | Disabled | Nothing (already in mode) |

---

## Console Log Locations

| Log Prefix | File | Function | Purpose |
|-----------|------|----------|---------|
| `[Auto Mode Button]` | QuickActions.tsx | onClick handler | Track button clicks |
| `[Switch to Auto Mode]` | App.tsx | switchToAutoMode() | Track mode switch process |
| `[Firebase Sync]` | App.tsx | uploadControlsToFirebase() | Track Firebase upload |

---

## Next Steps

1. **Open the app**: http://localhost:5000
2. **Open DevTools**: F12
3. **Switch to Manual Mode**: Settings → Manual → Save
4. **Click Auto Button**: Zap icon in Quick Actions
5. **Check Console**: Should see logs as listed above
6. **Report what you see**: Let me know which logs appear (or don't appear)

---

**Current Status**: Debugging logs added, ready for testing
**Files Modified**: 
- `client/src/App.tsx` (added console logs to switchToAutoMode)
- `client/src/components/QuickActions.tsx` (added console logs to onClick)
**TypeScript**: ✅ No errors
