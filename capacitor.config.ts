import { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.climaneer.dashboard",
  appName: "CLIMANEER V2",
  webDir: "out",

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
    Camera: {
      permissions: ["camera", "photos"],
    },
    Geolocation: {
      permissions: ["location"],
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    Haptics: {},
    Motion: {},
    Clipboard: {},
    Share: {},
    Browser: {},
    Dialog: {},
    ActionSheet: {},
    Toast: {
      duration: "short",
    },
    PrivacyScreen: {
      enable: true,
    },
    ScreenReader: {},
    TextZoom: {
      enabled: true,
    },
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: "mobile",
  },
};

export default config;
