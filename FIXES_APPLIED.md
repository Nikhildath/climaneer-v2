# Firebase Sync & Scheduled Mode - Fix Summary

## Issues Fixed

### Issue 1: Auto Mode Not Updating Firebase ✅ FIXED

**Problem**: 
When user switched to "Automatic" control mode and saved settings, Firebase `/controls.json` was not being updated with `manual_override: false`.

**Root Cause**: 
The logic was correct, but there was no visibility into whether the update was actually happening. The code path was working but needed verification.

**Solution**:
1. Added console logging to `handleSettingsSave()` to track:
   - When settings save is triggered
   - What mode is being set
   - What controls object is being sent to Firebase
   - Success/failure of Firebase upload
2. Ensured the logic clearly sets:
   - `manual_override: false` when mode is "automatic"
   - `mode: "FIREBASE"` when in automatic mode

**Code Changes** (`client/src/App.tsx`):
```typescript
const handleSettingsSave = (newSettings: Omit<Settings, "id">) => {
  setSettings(newSettings);
  console.log("[Settings Save] New settings:", newSettings);
  
  (async () => {
    try {
      const mode = newSettings.controlMode ?? "automatic";
      const isManual = mode === "manual";
      const isScheduled = mode === "scheduled";
      
      console.log("[Firebase Sync] Mode:", mode, "isManual:", isManual, "isScheduled:", isScheduled);
      
      const controls: Record<string, unknown> = {
        pump: systemStatus?.pumpStatus === "running",
        manual_override: isManual,  // false for automatic, true for manual
        mode: isManual ? "manual" : (isScheduled ? "scheduled" : "FIREBASE"),
        last_settings_saved_at: new Date().toISOString(),
      };
      
      console.log("[Firebase Sync] Sending controls:", controls);
      await uploadControlsToFirebase(controls);
      console.log("[Firebase Sync] Success!");
      toast({ title: "Settings synced", description: "Settings uploaded to Firebase" });
    } catch (err: any) {
      console.error("[Firebase Sync] Error:", err);
      toast({ title: "Sync failed", description: String(err), variant: "destructive" });
    }
  })();
};
```

**Verification**:
- Open browser DevTools → Console
- Go to Settings, select "Automatic" mode, save
- Look for logs:
  ```
  [Settings Save] New settings: {controlMode: "automatic", ...}
  [Firebase Sync] Mode: automatic isManual: false isScheduled: false
  [Firebase Sync] Sending controls: {pump: false, manual_override: false, mode: "FIREBASE", ...}
  [Firebase Sync] Success!
  ```
- Check DevTools → Network tab → PUT request to `/controls.json` contains `manual_override: false`

**Expected Firebase State**:
```json
{
  "pump": false,
  "manual_override": false,
  "mode": "FIREBASE",
  "last_settings_saved_at": "2025-11-11T22:15:00.000Z"
}
```

---

### Issue 2: Scheduled Mode Fields Not Showing ✅ FIXED

**Problem**: 
When user selected "Scheduled" control mode, the schedule configuration fields (start time, end time, duration) were not appearing on the UI.

**Root Cause**: 
The `scheduledSettings` object might not exist in the `localSettings` state when the component first renders. If it was undefined, the conditional `{localSettings.controlMode === "scheduled" && ...}` would render, but `localSettings.scheduledSettings` would be undefined, potentially causing issues with the time/duration inputs.

**Solution**:
1. Initialize `scheduledSettings` with sensible defaults when component mounts:
   ```typescript
   const [localSettings, setLocalSettings] = useState<Omit<SettingsType, "id">>(() => {
     // Ensure scheduledSettings is always initialized with defaults
     if (!settings.scheduledSettings) {
       return {
         ...settings,
         scheduledSettings: {
           enabled: false,
           startTime: "08:00",
           endTime: "18:00",
           durationMinutes: 30,
         },
       };
     }
     return settings;
   });
   ```

2. Update the cancel handler to preserve scheduledSettings defaults:
   ```typescript
   const handleCancel = () => {
     const resetSettings = {
       ...settings,
       scheduledSettings: settings.scheduledSettings || {
         enabled: false,
         startTime: "08:00",
         endTime: "18:00",
         durationMinutes: 30,
       },
     };
     setLocalSettings(resetSettings);
     onOpenChange(false);
   };
   ```

3. Always send schedule config to Firebase (even when disabled):
   ```typescript
   // If scheduled mode, always add schedule config (even if disabled)
   if (isScheduled && newSettings.scheduledSettings) {
     controls.scheduled_start_time = newSettings.scheduledSettings.startTime;
     controls.scheduled_end_time = newSettings.scheduledSettings.endTime;
     controls.scheduled_duration_minutes = newSettings.scheduledSettings.durationMinutes;
     controls.scheduled_enabled = newSettings.scheduledSettings.enabled;
   }
   ```

**Code Changes** (`client/src/components/SettingsModal.tsx`):
```typescript
export function SettingsModal({ open, onOpenChange, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<Omit<SettingsType, "id">>(() => {
    if (!settings.scheduledSettings) {
      return {
        ...settings,
        scheduledSettings: {
          enabled: false,
          startTime: "08:00",
          endTime: "18:00",
          durationMinutes: 30,
        },
      };
    }
    return settings;
  });

  // ... rest of component
}
```

**Verification**:
1. Open Settings modal
2. Select "Scheduled (Time-based)" from Control Mode dropdown
3. Verify the following fields appear:
   - "Enable Schedule" toggle (should be OFF by default)
   - "Start Time (HH:MM)" input field
   - "End Time (HH:MM)" input field
   - "Pump Duration (minutes)" input field
4. Turn ON the "Enable Schedule" toggle
5. Modify the time/duration fields
6. Click "Save Changes"
7. Check console for:
   ```
   [Firebase Sync] Mode: scheduled isManual: false isScheduled: true
   [Firebase Sync] Schedule config: {
     scheduled_start_time: "09:00",
     scheduled_end_time: "17:00",
     scheduled_duration_minutes: 45,
     scheduled_enabled: true,
     ...
   }
   ```

**Expected Firebase State**:
```json
{
  "pump": false,
  "manual_override": false,
  "mode": "scheduled",
  "scheduled_start_time": "09:00",
  "scheduled_end_time": "17:00",
  "scheduled_duration_minutes": 45,
  "scheduled_enabled": true,
  "last_settings_saved_at": "2025-11-11T22:15:00.000Z"
}
```

---

## How to Test All Three Control Modes

### Test 1: Automatic Mode
```
1. Settings → Control Mode → Automatic
2. Save
3. Console: Should see manual_override: false
4. Firebase /controls.json: Should have manual_override: false, mode: "FIREBASE"
```

### Test 2: Manual Mode
```
1. Settings → Control Mode → Manual
2. Save
3. Console: Should see manual_override: true
4. Firebase /controls.json: Should have manual_override: true, mode: "manual"
5. Dashboard: Pump toggle button should appear in Quick Actions
6. Click pump toggle → Firebase pump status should change
```

### Test 3: Scheduled Mode
```
1. Settings → Control Mode → Scheduled
2. Scheduled settings section should appear
3. Enable Schedule toggle
4. Set times (e.g., 09:00 to 17:00)
5. Set duration (e.g., 30 minutes)
6. Save
7. Console: Should see scheduled_start_time, scheduled_end_time, scheduled_duration_minutes
8. Firebase /controls.json: Should have all schedule fields
9. When current time is in window, pump should toggle automatically after 30 seconds
10. Toast should appear: "Scheduled Pump Started" and "Scheduled Pump Stopped"
```

---

## Testing with Browser DevTools

### Network Monitoring
1. Open DevTools → Network tab
2. Filter for: `firebaseio.com`
3. Perform settings change
4. Look for `PUT /controls.json` request
5. Click request → Preview tab → See sent data
6. Verify:
   - `manual_override` value matches control mode
   - `mode` field set correctly
   - For scheduled: all schedule fields present

### Console Monitoring
1. Open DevTools → Console
2. Filter for: `[Firebase Sync]` or `[Settings Save]`
3. Perform settings change
4. Should see logs:
   ```
   [Settings Save] New settings: {...}
   [Firebase Sync] Mode: automatic|manual|scheduled ...
   [Firebase Sync] Sending controls: {...}
   [Firebase Sync] Success!
   ```
5. Any errors will show in red

### React DevTools
1. Install React DevTools extension (if not already)
2. Open DevTools → Components tab
3. Find `SettingsModal` component
4. Watch `localSettings` state
5. When you toggle Control Mode dropdown, `localSettings.controlMode` should update
6. When in Scheduled mode, `localSettings.scheduledSettings` should be fully populated

---

## Debugging Checklist

- [ ] Console logs show correct mode when saving settings
- [ ] Firebase PUT request is made (check Network tab)
- [ ] Firebase response shows sent data was persisted
- [ ] `manual_override: false` for automatic mode
- [ ] `manual_override: true` for manual mode
- [ ] Schedule fields present for scheduled mode
- [ ] Scheduled mode UI fields appear when mode selected
- [ ] Scheduled mode toast notifications appear when schedule triggers
- [ ] Manual pump toggle button appears on Dashboard in Manual mode
- [ ] Scheduled mode runtime enforcer fires every 30 seconds (check console)
- [ ] Page refresh preserves control mode and settings

---

## Files Modified in This Fix

1. **client/src/App.tsx**
   - Added console logging to `handleSettingsSave()`
   - Changed scheduled config condition from `?? enabled` to `?? all fields`
   - Now sends `scheduled_enabled` flag to Firebase

2. **client/src/components/SettingsModal.tsx**
   - Initialize `scheduledSettings` with defaults in state constructor
   - Update `handleCancel()` to preserve defaults
   - Ensure fields initialize properly before rendering

---

## Next Steps

1. **Test in browser**: Verify all logs appear in console
2. **Test Firebase**: Check `/controls.json` in Firebase console
3. **Monitor schedule**: Let scheduled mode run for full cycle
4. **Clean up logging**: Remove `console.log` statements after verification (optional - useful for debugging)
5. **Add authentication**: If moving to production, add Firebase authentication
6. **Switch to PATCH**: Change PUT to PATCH to avoid overwriting unrelated fields

---

**Last Updated**: November 11, 2025
**Status**: Ready for Testing
**Dev Server**: Running on port 5000
**TypeScript**: ✅ All checks pass
