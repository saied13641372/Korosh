// Static, original Nova-themed artwork and offline Persian voice clips.
export const SPEAKER_ALERT_EVENTS = [
  {key:'powerOn',label:'اسپیکر روشن شد',description:'فقط با گزارش صریح روشن‌شدن از دستگاه',image:require('../assets/speaker_alerts_custom/speaker_power_on.png'),color:'#63e8ff'},
  {key:'powerOff',label:'اسپیکر خاموش شد',description:'فقط با گزارش صریح خاموش‌شدن از دستگاه',image:require('../assets/speaker_alerts_custom/speaker_power_off.png'),color:'#ff465f'},
  {key:'wifiConnected',label:'Wi‑Fi وصل شد',description:'وقتی اتصال وای‌فای تأیید شود',image:require('../assets/speaker_alerts_custom/wifi_connected.png'),color:'#72ffc5'},
  {key:'wifiDisconnected',label:'Wi‑Fi قطع شد',description:'وقتی اتصال وای‌فای از دست برود',image:require('../assets/speaker_alerts_custom/wifi_disconnected.png'),color:'#ff465f'},
  {key:'bluetoothConnected',label:'بلوتوث وصل شد',description:'وقتی خروجی صوتی Bluetooth با نام اسپیکر نوا فعال شود',image:require('../assets/speaker_alerts_custom/bluetooth_connected.png'),color:'#63e8ff'},
  {key:'bluetoothDisconnected',label:'بلوتوث قطع شد',description:'وقتی خروجی صوتی Bluetooth نوا از گوشی جدا شود',image:require('../assets/speaker_alerts_custom/bluetooth_disconnected.png'),color:'#ff465f'},
  {key:'online',label:'آنلاین شد',description:'وقتی دسترسی اینترنت برقرار شود',image:require('../assets/speaker_alerts_custom/online.png'),color:'#72ffc5'},
  {key:'offline',label:'آفلاین شد',description:'وقتی دسترسی اینترنت قطع شود',image:require('../assets/speaker_alerts_custom/offline.png'),color:'#8992a8'},
  {key:'usbConnected',label:'USB وصل شد',description:'فقط با گزارش صریح دستگاه',image:require('../assets/speaker_alerts_custom/usb_connected.png'),color:'#63e8ff'},
  {key:'usbDisconnected',label:'USB جدا شد',description:'فقط با گزارش صریح دستگاه',image:require('../assets/speaker_alerts_custom/usb_disconnected.png'),color:'#ff465f'},
  {key:'deviceReady',label:'نوا آماده است',description:'با گزارش آماده‌بودن از دستگاه',image:require('../assets/speaker_alerts_custom/system_ready.png'),color:'#ffd166'},
  {key:'deviceFault',label:'هشدار دستگاه',description:'با گزارش خطای واقعی از دستگاه',image:require('../assets/speaker_alerts_custom/system_fault.png'),color:'#ff9d35'},
  {key:'batteryLow',label:'هشدار توان پایین',description:'فقط با گزارش صریح سطح توان/باتری',image:require('../assets/speaker_alerts_custom/battery_low.png'),color:'#ffd166'},
  {key:'childLockOn',label:'قفل کودک فعال شد',description:'هنگام فعال‌شدن قفل کودک برنامه',image:require('../assets/speaker_alerts_custom/child_lock_speaker.png'),color:'#ff9d35'},
  {key:'childLockOff',label:'قفل کودک غیرفعال شد',description:'هنگام آزادسازی قفل کودک',image:require('../assets/speaker_alerts_custom/touch_control.png'),color:'#72ffc5'},
] as const;

export const SPEAKER_VOICE_PRESETS = [
  {id:'aurora',label:'طلوع نوا',image:require('../assets/speaker_alerts_custom/voice_aurora.png'),color:'#63e8ff'},
  {id:'heartbeat',label:'نبض نوا',image:require('../assets/speaker_alerts_custom/voice_heartbeat.png'),color:'#ff79c8'},
  {id:'calm',label:'آرام نوا',image:require('../assets/speaker_alerts_custom/voice_calm.png'),color:'#72ffc5'},
  {id:'cosmic',label:'نوا کیهانی',image:require('../assets/speaker_alerts_custom/voice_cosmic.png'),color:'#b28cff'},
  {id:'royal',label:'نوا سلطنتی',image:require('../assets/speaker_alerts_custom/voice_royal.png'),color:'#ffd166'},
] as const;

export const SPEAKER_ALERT_CLIPS: Record<string, number[]> = {
  powerOn: [
    require('../assets/speaker_alerts_custom/audio/powerOn_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOn_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOn_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOn_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOn_royal.mp3'),
  ],
  powerOff: [
    require('../assets/speaker_alerts_custom/audio/powerOff_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOff_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOff_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOff_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/powerOff_royal.mp3'),
  ],
  wifiConnected: [
    require('../assets/speaker_alerts_custom/audio/wifiConnected_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiConnected_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiConnected_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiConnected_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiConnected_royal.mp3'),
  ],
  wifiDisconnected: [
    require('../assets/speaker_alerts_custom/audio/wifiDisconnected_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiDisconnected_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiDisconnected_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiDisconnected_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/wifiDisconnected_royal.mp3'),
  ],
  bluetoothConnected: [
    require('../assets/speaker_alerts_custom/audio/bluetoothConnected_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothConnected_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothConnected_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothConnected_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothConnected_royal.mp3'),
  ],
  bluetoothDisconnected: [
    require('../assets/speaker_alerts_custom/audio/bluetoothDisconnected_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothDisconnected_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothDisconnected_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothDisconnected_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/bluetoothDisconnected_royal.mp3'),
  ],
  online: [
    require('../assets/speaker_alerts_custom/audio/online_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/online_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/online_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/online_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/online_royal.mp3'),
  ],
  offline: [
    require('../assets/speaker_alerts_custom/audio/offline_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/offline_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/offline_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/offline_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/offline_royal.mp3'),
  ],
  usbConnected: [
    require('../assets/speaker_alerts_custom/audio/usbConnected_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbConnected_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbConnected_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbConnected_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbConnected_royal.mp3'),
  ],
  usbDisconnected: [
    require('../assets/speaker_alerts_custom/audio/usbDisconnected_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbDisconnected_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbDisconnected_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbDisconnected_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/usbDisconnected_royal.mp3'),
  ],
  deviceReady: [
    require('../assets/speaker_alerts_custom/audio/deviceReady_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceReady_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceReady_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceReady_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceReady_royal.mp3'),
  ],
  deviceFault: [
    require('../assets/speaker_alerts_custom/audio/deviceFault_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceFault_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceFault_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceFault_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/deviceFault_royal.mp3'),
  ],
  batteryLow: [
    require('../assets/speaker_alerts_custom/audio/batteryLow_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/batteryLow_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/batteryLow_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/batteryLow_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/batteryLow_royal.mp3'),
  ],
  childLockOn: [
    require('../assets/speaker_alerts_custom/audio/childLockOn_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOn_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOn_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOn_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOn_royal.mp3'),
  ],
  childLockOff: [
    require('../assets/speaker_alerts_custom/audio/childLockOff_aurora.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOff_heartbeat.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOff_calm.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOff_cosmic.mp3'),
    require('../assets/speaker_alerts_custom/audio/childLockOff_royal.mp3'),
  ],
};

export const DEFAULT_SPEAKER_ALERTS: Record<string, {mode:'preset'|'file'|'off'; presetId:number; fileUri:string|null; fileName:string|null}> = Object.fromEntries(
  SPEAKER_ALERT_EVENTS.map(event => [event.key, {mode:'preset', presetId:0, fileUri:null, fileName:null}])
);
