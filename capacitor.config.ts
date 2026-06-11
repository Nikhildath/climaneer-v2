import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.climaneer.dashboard",
  appName: "CLIMANEER V2",
  webDir: ".next",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#10b981",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0f",
    },
  },
  android: {
    permissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.INTERNET",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.VIBRATE",
      "android.permission.WAKE_LOCK",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
    ],
  },
};

export default config;
