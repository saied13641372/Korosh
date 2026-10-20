import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Animated, AppState, BackHandler, Easing, Image, Linking, Modal, Keyboard, KeyboardAvoidingView, PanResponder, PermissionsAndroid, Platform, Pressable as BasePressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, NativeEventEmitter, NativeModules} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {Image as ExpoImage} from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Network from 'expo-network';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import * as Camera from 'expo-camera';
import {CameraView} from 'expo-camera';
import * as Battery from 'expo-battery';
import * as Contacts from 'expo-contacts';
import {Contact, ContactField} from 'expo-contacts';
import {createAudioPlayer, setAudioModeAsync} from 'expo-audio';
import {Ionicons} from '@expo/vector-icons';
import {LotusBle} from './modules/lotus-ble/src';
import {DjAudio} from './modules/dj-audio/src';
import {NoraVoice} from './modules/nora-voice/src';
import {CarrierBalance} from './modules/carrier-balance/src';
import {AudioRoute} from './modules/audio-route/src';
import {LiveMic} from './modules/live-mic/src';
import {EmergencyTools} from './modules/emergency-tools/src';
import {WifiEsp32} from './src/wifiEsp32';
import {LOTUS_EFFECT_FILES, LOTUS_MODE_IDS} from './src/lotusData';
import {DEFAULT_SPEAKER_ALERTS, SPEAKER_ALERT_CLIPS, SPEAKER_ALERT_EVENTS, SPEAKER_VOICE_PRESETS} from './src/speakerAlerts';
import {FAMILY_SECURITY_CONFIGURED, checkFamilyService, requestFamilyEmailCode, verifyFamilyEmailCode, registerAdminDevice, fetchFamilySecurity, fetchFamilyDevicePolicy, getFamilyDeviceToken, enrollFamilyDevice, createFamilyPairCode, fetchFamilyDevices, revokeFamilyDevice, saveFamilySecurityPolicy, saveFamilyCredential, verifyFamilyCredential, verifyFamilyBiometricAllowed, recoverFamilyCredential, clearFamilyDeviceToken, FamilySecuritySnapshot, FamilyAuthMethod, FamilyDevice} from './src/familySecurity';

const APP_VERSION='3.3.40';

const PAGES = [
  ['bluetooth','بلوتوث'],['usb','گنجینه نوا'],['music','آوای نوا'],['rgb','RGB'],['galaxy','کهکشانی'],['ai','نورا'],['equalizer','اکولایزر'],['control','اتاق فرمان']
] as const;
type PageId = typeof PAGES[number][0] | 'secret';
type SecretSection = 'door' | 'chests' | 'albums' | 'frame';
type Bg = {kind:'preset'|'presetGif'|'image'|'gif'|'musicCustom'|'musicCustomGif'; value:string};
type MusicLibraryTrack = {id:string;title:string;artist:string;album:string;durationMs:number;uri:string};
const STORE='@korosh_nova_from_zero_v1';
const APP_ICON=require('./assets/app_icon.png');
const GALAXY_SPEAKER_IMAGE=require('./assets/galaxy/korosh_nova_fiber_galaxy_speaker.jpg');
const GALAXY_POWER_IMAGE=require('./assets/galaxy/galaxy_power_button.jpg');
const SECRET_ROOM_ASSETS={
  doorFull:require('./assets/secret_room/door_closed.jpg'),
  doorLeft:require('./assets/secret_room/door_left.png'),
  doorRight:require('./assets/secret_room/door_right.png'),
  chests:[require('./assets/secret_room/chest_turquoise.png'),require('./assets/secret_room/chest_flower.png'),require('./assets/secret_room/chest_cosmic.png'),require('./assets/secret_room/chest_forest.png'),require('./assets/secret_room/chest_heart.png')],
  settingsChest:require('./assets/secret_room/chest_settings.png'),
  openChest:require('./assets/secret_room/chest_open_glowing.png'),
  familyDefault:require('./assets/secret_room/family_default.jpg'),
  familyAlbumDefault:require('./assets/secret_room/family_album_default.jpg'),
  frames:[require('./assets/secret_room/family_frame_blue.png'),require('./assets/secret_room/family_frame_rosewood.png'),require('./assets/secret_room/family_frame_garden.png')],
};
const CONTROL_ART={
  fuseGalaxy:require('./assets/control_custom/fuse_galaxy.png'),fuseNeon:require('./assets/control_custom/fuse_neon.png'),fuseRgb4:require('./assets/control_custom/fuse_rgb4.png'),fuseAmplifier:require('./assets/control_custom/fuse_amplifier.png'),fuseController:require('./assets/control_custom/fuse_controller.png'),liveMic:require('./assets/control_custom/live_mic.png'),liveWifi:require('./assets/control_custom/live_wifi.png'),liveBluetooth:require('./assets/control_custom/live_bluetooth.png'),livePhone:require('./assets/control_custom/live_phone.png'),
  touchPower:require('./assets/control_custom/touch_power.png'),touchGalaxy:require('./assets/control_custom/touch_galaxy.png'),touchNeon:require('./assets/control_custom/touch_neon.png'),touchRgb:require('./assets/control_custom/touch_rgb.png'),touchVolume:require('./assets/control_custom/touch_volume.png'),
  authPin:require('./assets/control_custom/auth_pin.png'),authPattern:require('./assets/control_custom/auth_pattern.png'),authBiometric:require('./assets/control_custom/auth_biometric.png'),authFamily:require('./assets/control_custom/auth_family_owner.png'),authRecovery:require('./assets/control_custom/auth_recovery.png'),securityBack:require('./assets/control_custom/security_back.png'),securityEmail:require('./assets/control_custom/security_email.png'),securityRefresh:require('./assets/control_custom/security_refresh.png'),securityExit:require('./assets/control_custom/security_exit.png'),securityRevoke:require('./assets/control_custom/security_revoke.png'),ownerFather:require('./assets/control_custom/owner_father.png'),ownerMother:require('./assets/control_custom/owner_mother.png'),
  lockApp:require('./assets/control_custom/lock_app.png'),lockSpeaker:require('./assets/control_custom/lock_speaker.png'),lockNora:require('./assets/control_custom/lock_nora.png'),lockContacts:require('./assets/control_custom/lock_contacts.png'),lockGallery:require('./assets/control_custom/lock_gallery.png'),lockCamera:require('./assets/control_custom/lock_camera.png'),childLockSpeaker:require('./assets/speaker_alerts_custom/child_lock_speaker.png'),
  backArrow:require('./assets/control_custom/back_arrow.png'),forwardArrow:require('./assets/control_custom/forward_arrow.png'),closeCustom:require('./assets/control_custom/close_custom.png'),cameraEmergency:require('./assets/control_custom/camera_emergency.png'),cameraParty:require('./assets/control_custom/camera_party.png'),batteryOne:require('./assets/control_custom/battery_one.png'),batteryTwo:require('./assets/control_custom/battery_two.png'),contactsBook:require('./assets/control_custom/contacts_book.png'),messageTemplate:require('./assets/control_custom/message_template.png'),phoneCall:require('./assets/control_custom/phone_call.png'),aiAlert:require('./assets/control_custom/ai_alert.png'),durationTimer:require('./assets/control_custom/duration_timer.png'),storageUsb:require('./assets/control_custom/storage_usb.png'),networkCore:require('./assets/control_custom/network_core.png'),profileNora:require('./assets/control_custom/profile_nora.png'),simCard:require('./assets/control_custom/sim_card.png'),memoryChip:require('./assets/control_custom/memory_chip.png'),diagnosticsCore:require('./assets/control_custom/diagnostics_core.png'),refresh:require('./assets/control_custom/update_core.png'),lightCore:require('./assets/control_custom/light_core.png'),equalizerCore:require('./assets/control_custom/equalizer_core.png'),soundCore:require('./assets/control_custom/sound_core.png'),musicCore:require('./assets/control_custom/music_core.png'),fuseCore:require('./assets/control_custom/fuse_core.png'),hardwareCore:require('./assets/control_custom/hardware_core.png'),futureModule:require('./assets/control_custom/future_module.png'),contactAdd:require('./assets/control_custom/contact_add.png'),sendMessage:require('./assets/control_custom/send_message.png'),callAction:require('./assets/control_custom/call_action.png'),recordVideo:require('./assets/control_custom/record_video.png'),usbSave:require('./assets/control_custom/usb_save.png')
};
const SECURE_KEYS={active:'korosh_nova_security_active_v3',pinPrefix:'korosh_nova_security_pin_v3_',patternPrefix:'korosh_nova_security_pattern_v3_',recoveryPrefix:'korosh_nova_security_recovery_v3_',ownerPrefix:'korosh_nova_security_owner_v3_'};
const secureRecordKey=(kind:'pin'|'pattern'|'recovery'|'owner',id:string)=>`${kind==='pin'?SECURE_KEYS.pinPrefix:kind==='pattern'?SECURE_KEYS.patternPrefix:kind==='recovery'?SECURE_KEYS.recoveryPrefix:SECURE_KEYS.ownerPrefix}${id}`;
const getActiveSecurityRecordId=()=>SecureStore.getItemAsync(SECURE_KEYS.active);
const getActiveSecuritySecret=async(kind:'pin'|'pattern'|'recovery'|'owner')=>{const id=await getActiveSecurityRecordId();return id?SecureStore.getItemAsync(secureRecordKey(kind,id)):null;};
const SECRET_FRAME_NAMES=['باغ فیروزه‌ای','چوب رز و یاقوت','باغ سفید و طلایی'];
const SECRET_BG_PRESETS=[
  {name:'باغ خانوادگی',image:require('./assets/secret_room/family_default.jpg'),gif:require('./assets/music_backgrounds_custom/nature.gif')},
  {name:'شهر شب',image:require('./assets/music_backgrounds_custom/city.jpg'),gif:require('./assets/music_backgrounds_custom/city.gif')},
  {name:'پاییز',image:require('./assets/music_backgrounds_custom/autumn.jpg'),gif:require('./assets/music_backgrounds_custom/autumn.gif')},
  {name:'بهار',image:require('./assets/music_backgrounds_custom/spring.jpg'),gif:require('./assets/music_backgrounds_custom/spring.gif')},
  {name:'زمستان',image:require('./assets/music_backgrounds_custom/winter.jpg'),gif:require('./assets/music_backgrounds_custom/winter.gif')},
  {name:'کوهستان',image:require('./assets/music_backgrounds_custom/mountain.jpg'),gif:require('./assets/music_backgrounds_custom/mountain.gif')},
];
const SECRET_DEFAULT_CHEST_NAMES=['یادگار پدر','یادگار مادر','یادگار فرزند اول','یادگار فرزند دوم','یادگار فرزند سوم'];
const SECRET_DEFAULT_ALBUM_NAMES=['پدر','مادر','فرزند اول','فرزند دوم','فرزند سوم','یادگار عزیز خانواده','آلبوم خانوادگی'];
const SECRET_DEFAULT_CHEST_MESSAGES=[
  'هرچه از عشق آموختیم، در خاطره‌های تو ریشه دارد.',
  'خانه با مهربانی تو گرم می‌ماند؛ این صندوقچه برای لبخندهای توست.',
  'روزهای کوچک، گنج‌های بزرگ زندگی‌اند؛ اینجا برای لحظه‌های توست.',
  'هر خاطره چراغی‌ست که مسیر فردا را روشن می‌کند.',
  'برای لحظه‌هایی که همیشه در دل خانواده می‌مانند؛ با عشق از کوروش نوا.',
];
const SECRET_DEFAULT_ALBUM_MESSAGES=[
  'خاطره‌های شیرین تو، بخشی از قصه‌ی خانواده‌ی ماست.',
  'مهربانی تو، خانه را روشن‌تر می‌کند.',
  'هر روز تو صفحه‌ای تازه از داستان ماست.',
  'لبخندهایت را برای روزهای آینده نگه می‌داریم.',
  'این لحظه‌ها ساده‌اند، اما برای ما گران‌بها هستند.',
  'برای یکی از عزیزان خانواده؛ عکس‌ها و یادگارهایی که جای ویژه‌ای در دل ما دارند.',
  'خانواده یعنی خاطره‌هایی که کنار هم می‌سازیم و با عشق نگه می‌داریم.',
];
// Migrate the former six-album layout (five people + family) without losing saved family data.
function normalizeSecretAlbumArray(value:unknown, defaults:any[]):any[]{
  if(!Array.isArray(value)) return [...defaults];
  if(value.length===6) return [...value.slice(0,5), defaults[5], value[5]??defaults[6]];
  const normalized=value.slice(0,7);
  while(normalized.length<7) normalized.push(defaults[normalized.length]);
  return normalized;
}
function secretAlbumFallbackPhoto(albumIndex:number,photoIndex:number):any{
  if(albumIndex===6&&photoIndex===0) return SECRET_ROOM_ASSETS.familyAlbumDefault;
  return SECRET_BG_PRESETS[(albumIndex*2+photoIndex+1)%SECRET_BG_PRESETS.length].image;
}
const EQUALIZER_ENTRY_ICON=require('./assets/ui_controls/equalizer_round.png');
const START_LOGO=require('./assets/korosh_nova_start_logo_user.png');
const START_CITY=require('./assets/start_selected_city.png');
const START_CITY_CLEAN=require('./assets/start_background_exact.png');
const UI_ICONS:any={settings:require('./assets/ui_icons/settings.png'),bluetooth:require('./assets/ui_icons/bluetooth.png'),usb:require('./assets/ui_icons/usb.png'),music:require('./assets/ui_icons/music.png'),rgb:require('./assets/ui_icons/rgb.png'),galaxy:require('./assets/ui_icons/galaxy.png'),ai:require('./assets/ui_icons/ai.png'),equalizer:require('./assets/ui_icons/equalizer.png'),control:require('./assets/ui_icons/control.png'),heartbeat:require('./assets/ui_icons/heartbeat.png'),power:require('./assets/ui_icons/power.png'),wifi:require('./assets/ui_icons/wifi.png'),scan:require('./assets/ui_icons/scan.png')};
const NAV_PAGES=PAGES.filter(([id])=>id!=='equalizer');
const NAV_ICON_GIF_ASSETS:any={
  bluetooth:require('./assets/page_icons_custom_gif/bluetooth_1.gif'),usb:require('./assets/page_icons_custom_gif/usb_1.gif'),music:require('./assets/page_icons_custom_gif/music_1.gif'),rgb:require('./assets/page_icons_custom_gif/rgb_1.gif'),galaxy:require('./assets/page_icons_custom_gif/galaxy_1.gif'),ai:require('./assets/page_icons_custom_gif/ai_1.gif'),control:require('./assets/page_icons_custom_gif/control_1.gif')
};
const NAV_ICON_NAMES:any={
  bluetooth:['الماس ارتباط','موج بی‌سیم','حلقهٔ اتصال','پل ارتباط','نبض رادیویی','شبکهٔ پیوند'],
  usb:['دروازهٔ USB','حافظهٔ نوا','آرشیو نور','کریستال داده','مخزن امن','مدار ذخیره'],
  music:['نت شناور','صفحهٔ صدا','هدست نوا','نبض موسیقی','الماس ریتم','موج شب'],
  rgb:['حلقهٔ طیف','منشور رنگ','سه‌نور','مدار رنگ','کریستال RGB','گل طیف'],
  galaxy:['مدار ستاره','سیارهٔ نوا','هستهٔ کیهانی','ستارهٔ هشت‌پر','شهاب‌مدار','خوشهٔ ستاره'],
  ai:['چهرهٔ نوا','هستهٔ هوش','شبکهٔ ذهن','پردازندهٔ نوا','موج هوشمند','چشم نورا'],
  control:['سه‌فرمان','پنل کنترل','سپر فرمان','هستهٔ مرکزی','فرمان چهارجهت','میز فرمان'],
};
const NAV_ICON_GIF_NAMES:any={bluetooth:'GIF نبض ارتباط',usb:'GIF دروازهٔ داده',music:'GIF موج موسیقی',rgb:'GIF طیف زنده',galaxy:'GIF مدار ستاره',ai:'GIF نبض نورا',control:'GIF هستهٔ فرمان'};
const NORA_CHARACTER_PRESETS=[require('./assets/nora_characters/nora_character_1.png'),require('./assets/nora_characters/nora_character_2.png'),require('./assets/nora_characters/nora_character_3.png')];
const NORA_CHARACTER_NAMES=['زهره','زینب','حسین'];
const NORA_ICON_PRESETS=[require('./assets/nora_icons_meaningful/nora_icon_1.png'),require('./assets/nora_icons_meaningful/nora_icon_2.png'),require('./assets/nora_icons_meaningful/nora_icon_3.png'),require('./assets/nora_icons_meaningful/nora_icon_4.png'),require('./assets/nora_icons_meaningful/nora_icon_5.png'),require('./assets/nora_icons_meaningful/nora_icon_6.png'),require('./assets/nora_icons_meaningful/nora_icon_7.png'),require('./assets/nora_icons_meaningful/nora_icon_8.png')];
const NORA_ICON_NAMES=['پروانه نورا','میکروفون هوشمند','گفت‌وگوی نورا','صدای اسپیکر','موسیقی','کهکشان','گل نیلوفر','چهره هوشمند'];
const NORA_MIC_IMAGE=require('./assets/nora_icons_meaningful/nora_mic_custom.png');
const NORA_MIC_DESIGNS=[
  {name:'نبض کریستال',shape:'ring',primary:'#63e8ff',secondary:'#ff79c8',detail:'حلقهٔ درخشان و نبض مرکزی'},
  {name:'الماس آوا',shape:'diamond',primary:'#b28cff',secondary:'#63e8ff',detail:'قاب الماسی زاویه‌دار'},
  {name:'مدار کهکشانی',shape:'orbit',primary:'#72ffc5',secondary:'#b28cff',detail:'مدارهای دوگانه و نقطهٔ نور'},
  {name:'فرکانس سایبر',shape:'hex',primary:'#ffd166',secondary:'#63e8ff',detail:'قاب فنی و خطوط صوتی'},
  {name:'گل نور',shape:'flower',primary:'#ff79c8',secondary:'#ffd166',detail:'گلبرگ‌های نوری پیرامون میکروفون'},
  {name:'کپسول نوا',shape:'capsule',primary:'#ff8c69',secondary:'#72ffc5',detail:'بدنهٔ بلند و موج‌های صوتی'}
];
const NORA_MIC_PALETTES=[
  {name:'رنگ اختصاصی هر مدل',primary:null,secondary:null},
  {name:'فیروزه‌ای و صورتی',primary:'#63e8ff',secondary:'#ff79c8'},
  {name:'بنفش و سبز نوا',primary:'#b28cff',secondary:'#72ffc5'},
  {name:'طلایی و آبی',primary:'#ffd166',secondary:'#63e8ff'},
  {name:'رز و کهربا',primary:'#ff79c8',secondary:'#ffd166'},
  {name:'زمرد و مرجانی',primary:'#72ffc5',secondary:'#ff8c69'},
  {name:'آبی قطبی و بنفش',primary:'#5794ff',secondary:'#c98cff'}
];
const NORA_MIC_ANIMATIONS=[
  {name:'تپش کریستالی',icon:'pulse-outline',desc:'حلقه با ضربان آرام'},
  {name:'مدار چرخان',icon:'sync-outline',desc:'مدار نورانی دور میکروفون'},
  {name:'موج صوتی',icon:'radio-outline',desc:'موج‌های بازشونده'},
  {name:'اکولایزر زنده',icon:'bar-chart-outline',desc:'میله‌های فرکانس متحرک'},
  {name:'ذرات ستاره‌ای',icon:'sparkles-outline',desc:'جرقه‌های چرخان'}
];
const NORA_MIC_ANIMATION_SPEEDS=[
  {name:'آرام',duration:1450,rotation:9800},
  {name:'متعادل',duration:850,rotation:4800},
  {name:'پرشتاب',duration:520,rotation:2600}
];
const NORA_MIC_SIZES=[
  {name:'فشرده',diameter:104,artwork:62},
  {name:'استاندارد',diameter:116,artwork:75},
  {name:'بزرگ',diameter:132,artwork:84}
];
const NORA_MIC_GLOWS=[
  {name:'هاله ملایم',opacity:.22,radius:12},
  {name:'هاله متعادل',opacity:.48,radius:22},
  {name:'هاله درخشان',opacity:.82,radius:34}
];
const NORA_COMPOSER_STYLES=[
  {name:'شیشهٔ نوا',radius:22,borderStyle:'solid' as const,edge:1.5,fill:'rgba(8,9,27,.76)'},
  {name:'سایبر زاویه‌دار',radius:9,borderStyle:'solid' as const,edge:2,fill:'rgba(5,12,28,.86)'},
  {name:'هالهٔ نرم',radius:30,borderStyle:'solid' as const,edge:1,fill:'rgba(21,9,34,.78)'},
  {name:'فرکانس خط‌چین',radius:16,borderStyle:'dashed' as const,edge:1.5,fill:'rgba(5,15,30,.82)'},
  {name:'کپسول آینده',radius:34,borderStyle:'solid' as const,edge:1.5,fill:'rgba(8,18,30,.84)'}
];
const NORA_COMPOSER_PALETTES=[
  {name:'بنفش و فیروزه‌ای',frame:'#b28cff',send:'#63e8ff'},
  {name:'فیروزه‌ای و زمرد',frame:'#63e8ff',send:'#72ffc5'},
  {name:'صورتی و طلایی',frame:'#ff79c8',send:'#ffd166'},
  {name:'یاقوت و آبی',frame:'#ff5f8f',send:'#5794ff'},
  {name:'سبز و بنفش',frame:'#72ffc5',send:'#b28cff'},
  {name:'کهربایی و مرجانی',frame:'#ffd166',send:'#ff8c69'}
];
const NORA_SEND_BUTTONS=[
  {name:'پیکان نئون',icon:'send',shape:'square'},
  {name:'موشک',icon:'rocket-outline',shape:'round'},
  {name:'جرقه',icon:'flash-outline',shape:'diamond'},
  {name:'پیکان مهتاب',icon:'arrow-up',shape:'pill'},
  {name:'فرستادن موج',icon:'paper-plane-outline',shape:'orb'}
];
const NORA_COMPOSER_SIZES=[
  {name:'فشرده',height:56,input:38},
  {name:'استاندارد',height:66,input:44},
  {name:'باز',height:78,input:56}
];
const NORA_SEND_SIZES=[
  {name:'کوچک',size:42},
  {name:'استاندارد',size:50},
  {name:'بزرگ',size:58}
];
const PAGE_BG_PRESETS:any={
  bluetooth:[require('./assets/page_backgrounds/bluetooth_1.jpg'),require('./assets/page_backgrounds/bluetooth_2.jpg'),require('./assets/page_backgrounds/bluetooth_3.jpg'),require('./assets/page_backgrounds/bluetooth_4.jpg'),require('./assets/page_backgrounds/bluetooth_5.jpg'),require('./assets/page_backgrounds/bluetooth_6.jpg')],
  usb:[require('./assets/page_backgrounds/usb_1.jpg'),require('./assets/page_backgrounds/usb_2.jpg'),require('./assets/page_backgrounds/usb_3.jpg'),require('./assets/page_backgrounds/usb_4.jpg'),require('./assets/page_backgrounds/usb_5.jpg'),require('./assets/page_backgrounds/usb_6.jpg')],
  music:[require('./assets/page_backgrounds/music_1.jpg'),require('./assets/page_backgrounds/music_2.jpg'),require('./assets/page_backgrounds/music_3.jpg'),require('./assets/page_backgrounds/music_4.jpg'),require('./assets/page_backgrounds/music_5.jpg'),require('./assets/page_backgrounds/music_6.jpg')],
  rgb:[require('./assets/page_backgrounds/rgb_1.jpg'),require('./assets/page_backgrounds/rgb_2.jpg'),require('./assets/page_backgrounds/rgb_3.jpg'),require('./assets/page_backgrounds/rgb_4.jpg'),require('./assets/page_backgrounds/rgb_5.jpg'),require('./assets/page_backgrounds/rgb_6.jpg')],
  galaxy:[require('./assets/page_backgrounds/galaxy_1.jpg'),require('./assets/page_backgrounds/galaxy_2.jpg'),require('./assets/page_backgrounds/galaxy_3.jpg'),require('./assets/page_backgrounds/galaxy_4.jpg'),require('./assets/page_backgrounds/galaxy_5.jpg'),require('./assets/page_backgrounds/galaxy_6.jpg')],
  ai:[require('./assets/page_backgrounds/ai_1.jpg'),require('./assets/page_backgrounds/ai_2.jpg'),require('./assets/page_backgrounds/ai_3.jpg'),require('./assets/page_backgrounds/ai_4.jpg'),require('./assets/page_backgrounds/ai_5.jpg'),require('./assets/page_backgrounds/ai_6.jpg')],
  equalizer:[require('./assets/page_backgrounds/equalizer_1.jpg'),require('./assets/page_backgrounds/equalizer_2.jpg'),require('./assets/page_backgrounds/equalizer_3.jpg'),require('./assets/page_backgrounds/equalizer_4.jpg'),require('./assets/page_backgrounds/equalizer_5.jpg'),require('./assets/page_backgrounds/equalizer_6.jpg')],
  control:[require('./assets/page_backgrounds/control_1.jpg'),require('./assets/page_backgrounds/control_2.jpg'),require('./assets/page_backgrounds/control_3.jpg'),require('./assets/page_backgrounds/control_4.jpg'),require('./assets/page_backgrounds/control_5.jpg'),require('./assets/page_backgrounds/control_6.jpg')],
};
const PAGE_BG_NAMES:any={
  bluetooth:['نبض آبی','مدار فیروزه‌ای','شفق بنفش','سیگنال ستاره‌ای','موج بلوتوث','پل ارتباطی'],
  usb:['گنجینه طلایی','دروازه نور','صندوق کیهانی','مدار USB','آرشیو نور','مخزن نوا'],
  music:['موج نئون','حلقه صدا','نبض صورتی','موج باران','ریتم شب','صحنه DJ'],
  rgb:['منشور RGB','طیف نئون','کریستال رنگ','رنگین‌کمان','موج رنگی','شیشه نور'],
  galaxy:['هسته ستاره','مدار کهکشانی','شهاب فیروزه‌ای','سحابی عمیق','ابر ستاره‌ای','مدار نور'],
  ai:['هوش سبز','چهره نورا','مدار هوشمند','شب هوش','شبکه ذهن','نبض نورا'],
  equalizer:['طیف طلایی','موج زنده','ریتم فیروزه‌ای','نبض DJ','خطوط صدا','میکس شب'],
  control:['هسته فرمان','مدار کنترل','شب فرمان','شبکه مرکزی','پنل هوشمند','اتاق فرمان'],
};
const CUSTOM_PAGE_ICON_ASSETS:any={
  bluetooth:[require('./assets/page_icons_custom/bluetooth_1.png'),require('./assets/page_icons_custom/bluetooth_2.png'),require('./assets/page_icons_custom/bluetooth_3.png'),require('./assets/page_icons_custom/bluetooth_4.png'),require('./assets/page_icons_custom/bluetooth_5.png'),require('./assets/page_icons_custom/bluetooth_6.png')],
  usb:[require('./assets/page_icons_custom/usb_1.png'),require('./assets/page_icons_custom/usb_2.png'),require('./assets/page_icons_custom/usb_3.png'),require('./assets/page_icons_custom/usb_4.png'),require('./assets/page_icons_custom/usb_5.png'),require('./assets/page_icons_custom/usb_6.png')],
  music:[require('./assets/page_icons_custom/music_1.png'),require('./assets/page_icons_custom/music_2.png'),require('./assets/page_icons_custom/music_3.png'),require('./assets/page_icons_custom/music_4.png'),require('./assets/page_icons_custom/music_5.png'),require('./assets/page_icons_custom/music_6.png')],
  rgb:[require('./assets/page_icons_custom/rgb_1.png'),require('./assets/page_icons_custom/rgb_2.png'),require('./assets/page_icons_custom/rgb_3.png'),require('./assets/page_icons_custom/rgb_4.png'),require('./assets/page_icons_custom/rgb_5.png'),require('./assets/page_icons_custom/rgb_6.png')],
  galaxy:[require('./assets/page_icons_custom/galaxy_1.png'),require('./assets/page_icons_custom/galaxy_2.png'),require('./assets/page_icons_custom/galaxy_3.png'),require('./assets/page_icons_custom/galaxy_4.png'),require('./assets/page_icons_custom/galaxy_5.png'),require('./assets/page_icons_custom/galaxy_6.png')],
  ai:[require('./assets/page_icons_custom/ai_1.png'),require('./assets/page_icons_custom/ai_2.png'),require('./assets/page_icons_custom/ai_3.png'),require('./assets/page_icons_custom/ai_4.png'),require('./assets/page_icons_custom/ai_5.png'),require('./assets/page_icons_custom/ai_6.png')],
  equalizer:[require('./assets/page_icons_custom/equalizer_1.png'),require('./assets/page_icons_custom/equalizer_2.png'),require('./assets/page_icons_custom/equalizer_3.png'),require('./assets/page_icons_custom/equalizer_4.png'),require('./assets/page_icons_custom/equalizer_5.png'),require('./assets/page_icons_custom/equalizer_6.png')],
  control:[require('./assets/page_icons_custom/control_1.png'),require('./assets/page_icons_custom/control_2.png'),require('./assets/page_icons_custom/control_3.png'),require('./assets/page_icons_custom/control_4.png'),require('./assets/page_icons_custom/control_5.png'),require('./assets/page_icons_custom/control_6.png')],
};
const PRESET_NAMES=['اختصاصی ۱','اختصاصی ۲','اختصاصی ۳','اختصاصی ۴','اختصاصی ۵','اختصاصی ۶'];
const NORA_STATIC_BG=[require('./assets/nora_static_backgrounds/nora_static_1.jpg'),require('./assets/nora_static_backgrounds/nora_static_2.jpg'),require('./assets/nora_static_backgrounds/nora_static_3.jpg'),require('./assets/nora_static_backgrounds/nora_static_4.jpg'),require('./assets/nora_static_backgrounds/nora_static_5.jpg')];
const NORA_STATIC_BG_NAMES=['شفق فیروزه‌ای','گل ارغوانی','مدار زمردی','شهاب کبود','مارپیچ رزگلد'];
const NORA_GIF_BG_PRESETS=[{id:1,name:'آبی قطبی',source:require('./assets/default_gif_backgrounds/nora_bg_1.gif')},{id:2,name:'شب ارغوانی',source:require('./assets/default_gif_backgrounds/nora_bg_2.gif')},{id:3,name:'شفق زمردی و طلایی',source:require('./assets/default_gif_backgrounds/nora_bg_3.gif')},{id:4,name:'مدار کهربایی و بنفش',source:require('./assets/default_gif_backgrounds/nora_bg_4.gif')},{id:5,name:'موج فیروزه‌ای و صورتی',source:require('./assets/default_gif_backgrounds/nora_bg_5.gif')},{id:6,name:'کهکشان زمردی',source:require('./assets/default_gif_backgrounds/nora_bg_6.gif')}];
const EFFECT_FILES=LOTUS_EFFECT_FILES;

const PAGE_GIF_BG_PRESETS:any={
  bluetooth:[{id:1,source:require('./assets/page_gif_backgrounds/bluetooth_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/bluetooth_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/bluetooth_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/bluetooth_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/bluetooth_5.gif')}],
  usb:[{id:1,source:require('./assets/page_gif_backgrounds/usb_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/usb_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/usb_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/usb_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/usb_5.gif')}],
  music:[{id:1,source:require('./assets/page_gif_backgrounds/music_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/music_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/music_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/music_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/music_5.gif')}],
  rgb:[{id:1,source:require('./assets/page_gif_backgrounds/rgb_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/rgb_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/rgb_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/rgb_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/rgb_5.gif')}],
  galaxy:[{id:1,source:require('./assets/page_gif_backgrounds/galaxy_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/galaxy_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/galaxy_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/galaxy_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/galaxy_5.gif')}],
  ai:[{id:1,source:require('./assets/page_gif_backgrounds/ai_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/ai_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/ai_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/ai_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/ai_5.gif')}],
  equalizer:[{id:1,source:require('./assets/page_gif_backgrounds/equalizer_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/equalizer_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/equalizer_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/equalizer_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/equalizer_5.gif')}],
  control:[{id:1,source:require('./assets/page_gif_backgrounds/control_1.gif')},{id:2,source:require('./assets/page_gif_backgrounds/control_2.gif')},{id:3,source:require('./assets/page_gif_backgrounds/control_3.gif')},{id:4,source:require('./assets/page_gif_backgrounds/control_4.gif')},{id:5,source:require('./assets/page_gif_backgrounds/control_5.gif')}]
};
const PRESET_GIF_BG=PAGE_GIF_BG_PRESETS;


const DEFAULTS={
  power:false,wifi:false,wifiEsp32:false,wifiBaseUrl:'http://192.168.4.1',connected:false,bluetoothEnabled:false,brightness:75,speed:55,rgbColor:'#7f8cff',rgbEffect:0,rgbPower:false,neonEffect:0,neonMode:0,neonPower:false,neonColor:'#ff4fd8',neonBrightness:75,neonSpeed:55,rgbDefaultTab:0,rgbColorTarget:'rgb',rgbWheelStyle:0,rgbMusicReactiveMode:0,neonMusicReactiveMode:0,galaxyEffect:0,eq:[55,50,65,58],eqPages:{dj:[55,50,65,58],manual:[55,50,65,58],visual:0},secretMode:0,secretColor:'#63e8ff',secretTapEffect:0,secretDoorEffect:1,secretChestEffect:2,secretAlbumEffect:0,secretPageBackgrounds:{door:{kind:'preset',preset:0,uri:null},chests:{kind:'preset',preset:2,uri:null},albums:{kind:'preset',preset:3,uri:null}},secretFramePhotoUri:null,secretFramePreset:0,
  secretChestNames:SECRET_DEFAULT_CHEST_NAMES,secretChestStyle:[0,1,2,3,4],secretChestArtUris:[null,null,null,null,null],secretChestCoverUris:[null,null,null,null,null],secretChestMessages:SECRET_DEFAULT_CHEST_MESSAGES,
  secretAlbumNames:SECRET_DEFAULT_ALBUM_NAMES,secretAlbumCoverUris:[null,null,null,null,null,null,null],secretAlbumPhotos:[[],[],[],[],[],[],[]],secretAlbumMessages:SECRET_DEFAULT_ALBUM_MESSAGES,
  galaxySpeakerPreset:0,galaxySpeakerColor:'#63e8ff',galaxyWheelTop:false,galaxyWheelBottom:false,galaxyPower:false,galaxyBrightness:75,galaxySpeed:55,galaxySpeakerImageUri:null,galaxySpeakerImageKind:'image',galaxyPageBackgroundUri:null,galaxyPageBackgroundKind:'image',galaxyFiberMotion:true,galaxyFiberGlow:true,galaxyDefaultTab:0,galaxyWheelStyle:0,galaxyMusicReactiveMode:0,
  djTrackUri:null,djTrackName:'هنوز آهنگی انتخاب نشده',djLoaded:false,djPlaying:false,djVolume:80,djTempo:100,djEq:[0,0,0,0],djPresetName:null,djLedOn:false,eqSettingsOpen:false,eqAutoSave:true,eqDjLeds:true,eqVisualSensitivity:1,eqVisualMode:0,
  playing:false,musicTrackUri:null,musicTrackTitle:'',musicTrackArtist:'',musicArtworkUri:null,musicArtworkMode:'preset',musicArtworkPreset:0,musicVisualEffect:0,
  usbDirectoryUri:null,usbSort:'name',usbRecursive:false,usbAutoPlay:false,usbWaveformSensitivity:1,usbLastCategory:'music',
  navIconPreset:Object.fromEntries(PAGES.map(([id])=>{const navIndex=NAV_PAGES.findIndex(([navId])=>navId===id);return [id,navIndex>=0?navIndex%6:0]})),
  navIconColor:Object.fromEntries(PAGES.map(([id])=>[id,'#63e8ff'])),
  navIconGallery:Object.fromEntries(PAGES.map(([id])=>[id,null])),
  navIconGalleryKind:Object.fromEntries(PAGES.map(([id])=>[id,null])),
  navIconGifPreset:Object.fromEntries(PAGES.map(([id])=>[id,0])),
  navIconSourceKind:Object.fromEntries(PAGES.map(([id])=>[id,'static'])),
  pageIconPreset:Object.fromEntries(PAGES.map(([id])=>[id,0])),
  pageIconColor:Object.fromEntries(PAGES.map(([id])=>[id,'#63e8ff'])),
  pageIconEffect:Object.fromEntries(PAGES.map(([id])=>[id,1])),
  pageIconGallery:{},pageIconGalleryKind:{},pageFramePreset:Object.fromEntries(PAGES.map(([id])=>[id,0])),noraCharacter:0,noraMood:0,noraOutput:'speaker',noraMode:'online',noraListening:false,noraMessages:[],noraAutoSend:true,noraVoiceEnabled:true,micMode:1,noraMicDesign:0,noraMicAnimation:0,noraMicPalette:0,noraMicAnimationSpeed:1,noraMicSize:1,noraMicGlow:2,noraComposerStyle:0,noraComposerPalette:0,noraSendStyle:0,noraComposerFontSize:1,noraComposerHeight:1,noraSendSize:1,noraComposerPlaceholder:'پیام برای نورا…',noraRiskLevel:'unknown',emergencyCameraEnabled:true,emergencyCameraDurationMin:10,partyCameraEnabled:false,partyCameraQuality:'1080p',cameraStorageMode:'app',cameraStorageUri:null,emergencyContacts:[],emergencyMessage:'هشدار کوروش نوا: نورا یک وضعیت خطرناک را تشخیص داد. لطفاً فوراً بررسی کنید.',emergencyAutoSms:false,emergencyAutoCall:false,emergencyStreamPublicUrl:'',emergencyCameraTrigger:null,batteryTelemetry:null,
  securityEnabled:false,securityPinSet:false,securityBiometric:false,securityOwnerSetup:false,securityOwnerRole:'',securityOwnerName:'',securityMethod:'pin',securityOptions:{appStart:false,speakerPower:false,childLock:false,nora:false,contacts:false,camera:false,commandRoom:false,lighting:false,musicLibrary:false,fuses:false,diagnostics:false,imageSettings:false,liveMic:false},childLockDeviceConfirmed:false,childLockDeviceMayBeLocked:false,speakerAlertsEnabled:true,speakerAlertVolume:70,speakerAlerts:DEFAULT_SPEAKER_ALERTS,speakerBluetoothName:'Nova',bluetoothSpeakerConnected:null,liveMicTransport:'dual',networkOnline:null,devicePowerStatus:null,deviceUsbConnected:null,deviceReady:null,deviceFault:false,deviceBatteryLow:null,transportMode:'dual',noraApiBaseUrl:'',
};
const OPTION_ART:any={
  settings:require('./assets/control_custom/hardware_core.png'),icons:require('./assets/control_custom/nav_icons_manager.png'),cameras:require('./assets/control_custom/camera_emergency.png'),batteries:require('./assets/control_custom/battery_one.png'),lights:require('./assets/control_custom/light_core.png'),aiProfile:require('./assets/control_custom/profile_nora.png'),fuses:require('./assets/control_custom/fuse_core.png'),network:require('./assets/control_custom/live_wifi.png'),wifi:require('./assets/control_custom/live_wifi.png'),bluetooth:require('./assets/control_custom/live_bluetooth.png'),mic:require('./assets/control_custom/live_mic.png'),music:require('./assets/control_custom/music_core.png'),rgb:require('./assets/control_custom/fuse_rgb4.png'),galaxy:require('./assets/control_custom/fuse_galaxy.png'),ai:require('./assets/control_custom/lock_nora.png'),equalizer:require('./assets/control_custom/equalizer_core.png'),sound:require('./assets/control_custom/sound_core.png'),contacts:require('./assets/control_custom/lock_contacts.png'),security:require('./assets/control_custom/auth_family_owner.png'),shield:require('./assets/control_custom/auth_family_owner.png'),fuse:require('./assets/control_custom/fuse_core.png'),backgrounds:require('./assets/control_custom/lock_gallery.png'),gallery:require('./assets/control_custom/lock_gallery.png'),image:require('./assets/control_custom/lock_gallery.png'),memory:require('./assets/control_custom/memory_chip.png'),diagnostics:require('./assets/control_custom/diagnostics_core.png'),simBalance:require('./assets/control_custom/sim_card.png'),phone:require('./assets/control_custom/phone_call.png'),power:require('./assets/control_custom/touch_power.png'),effect:require('./assets/control_custom/fuse_neon.png'),folder:require('./assets/page_icons_custom/usb_1.png'),options:require('./assets/control_custom/nav_icons_manager.png'),profile:require('./assets/control_custom/profile_nora.png'),'card-outline':require('./assets/control_custom/sim_card.png'),camera:require('./assets/control_custom/camera_emergency.png'),battery:require('./assets/control_custom/battery_one.png'),contactsBook:require('./assets/control_custom/contacts_book.png'),message:require('./assets/control_custom/message_template.png'),phoneCall:require('./assets/control_custom/phone_call.png'),timer:require('./assets/control_custom/duration_timer.png'),storage:require('./assets/control_custom/storage_usb.png'),networkCore:require('./assets/control_custom/network_core.png'),profileNora:require('./assets/control_custom/profile_nora.png'),sim:require('./assets/control_custom/sim_card.png'),memoryChip:require('./assets/control_custom/memory_chip.png'),diagnosticsCore:require('./assets/control_custom/diagnostics_core.png'),refresh:require('./assets/control_custom/update_core.png'),lightCore:require('./assets/control_custom/light_core.png'),equalizerCore:require('./assets/control_custom/equalizer_core.png'),soundCore:require('./assets/control_custom/sound_core.png'),musicCore:require('./assets/control_custom/music_core.png'),fuseCore:require('./assets/control_custom/fuse_core.png'),hardwareCore:require('./assets/control_custom/hardware_core.png'),futureModule:require('./assets/control_custom/future_module.png'),contactAdd:require('./assets/control_custom/contact_add.png'),sendMessage:require('./assets/control_custom/send_message.png'),callAction:require('./assets/control_custom/call_action.png'),recordVideo:require('./assets/control_custom/record_video.png'),usbSave:require('./assets/control_custom/usb_save.png')
};
const icons:any={
  bluetooth:'bluetooth',usb:'folder-open',music:'musical-notes',rgb:'color-palette',galaxy:'planet-outline',ai:'chatbubble-ellipses-outline',equalizer:'options',control:'settings-outline',power:'power',wifi:'wifi',scan:'search',back:'arrow-back',play:'play',pause:'pause',prev:'play-skip-back',next:'play-skip-forward',settings:'settings-outline',close:'close',gallery:'images',image:'image',refresh:'refresh',mic:'mic',save:'checkmark-circle',lock:'lock-closed',flash:'flash',shield:'shield-checkmark',fuse:'construct',network:'globe-outline',memory:'layers-outline',diagnostics:'pulse-outline',hardware:'hardware-chip-outline',sound:'volume-high',contacts:'people',profile:'person-circle',future:'hardware-chip',backgrounds:'images',speaker:'volume-high-outline',palette:'color-palette-outline',effect:'color-wand-outline',timer:'timer-outline',camera:'camera',folder:'folder-open',phone:'phone-portrait',secret:'lock-open',grid:'grid-outline',check:'checkmark-circle',rotate:'sync-outline',brightness:'sunny',wave:'pulse-outline',color:'color-palette-outline'
};
const PAGE_META:any={
  bluetooth:{icon:'bluetooth',color:'#56dfff',effect:'pulse'},usb:{icon:'folder-open',color:'#ffd166',effect:'glow'},music:{icon:'musical-notes',color:'#ff79c8',effect:'rotate'},rgb:{icon:'color-palette',color:'#63e8ff',effect:'rainbow'},galaxy:{icon:'planet-outline',color:'#b28cff',effect:'orbit'},ai:{icon:'chatbubble-ellipses-outline',color:'#63f0c1',effect:'pulse'},equalizer:{icon:'options',color:'#ffd166',effect:'bars'},control:{icon:'settings-outline',color:'#b28cff',effect:'orbit'},secret:{icon:'lock-open',color:'#ff79c8',effect:'pulse'}
};
const PAGE_HEADER_COLORS:any={bluetooth:'#55d9ff',usb:'#ffd05a',music:'#ff63b5',rgb:'#55ff8a',galaxy:'#a875ff',ai:'#54f2d2',equalizer:'#ff914d',control:'#ff4f6d',secret:'#ff67cf'};
const NAV_ICON_VARIANTS:any={
  bluetooth:['bluetooth','bluetooth-outline','radio-outline','pulse-outline','planet-outline'],
  usb:['folder-open','folder','archive-outline','albums-outline','file-tray-full-outline'],
  music:['musical-notes','musical-note','disc-outline','headset-outline','radio-outline'],
  rgb:['color-palette','bulb-outline','color-filter-outline','rainbow-outline','flash-outline'],
  galaxy:['planet-outline','moon-outline','aperture-outline','earth-outline','globe-outline'],
  ai:['chatbubble-ellipses-outline','mic-outline','brain-outline','hardware-chip-outline','person-outline'],
  equalizer:['options','stats-chart-outline','pulse-outline','bar-chart-outline','analytics-outline'],
  control:['settings-outline','construct-outline','options-outline','shield-checkmark-outline','tune-outline']
};
const ICON_COLORS=['#63e8ff','#ff79c8','#ffd166','#72ffc5','#b28cff','#ff8c69'];
const ICON_COLOR_NAMES=['فیروزه‌ای','صورتی نئونی','طلایی','سبز نوا','بنفش کیهانی','مرجانی'];
const CONTROL_CATS=[
  ['icons','آیکن‌های پایین','options-outline'],['network','شبکه و اتصال','network'],['hardwareCore','هسته ارتباطی اسپیکر','hardwareCore'],['liveMic','میکروفن زنده','mic'],['simBalance','اعتبار سیم‌کارت','card-outline'],['ai','هوش مصنوعی','ai'],['aiProfile','پروفایل نورا','profile'],['contacts','مخاطبین اضطراری','contacts'],['lights','نورپردازی','rgb'],['music','آوای نوا','music'],['equalizer','اکولایزر','equalizer'],['sound','آواهای اسپیکر','sound'],['memory','حافظه و پروفایل','memory'],['diagnostics','تشخیص و نگهداری','diagnostics'],['security','رمز مشترک','shield'],['cameras','دوربین‌ها','camera'],['batteries','باتری‌ها','battery'],['fuses','فیوزهای نوا','fuse']
] as const;
const FUSE_STATUS_ITEMS=[
  {id:'galaxy',key:'galaxy',label:'کهکشانی',desc:'فیبرهای نوری و افکت‌های کهکشانی',image:CONTROL_ART.fuseGalaxy},
  {id:'neon',key:'neon',label:'نئون',desc:'حلقه و نوار نئون',image:CONTROL_ART.fuseNeon},
  {id:'rgb4',key:'rgb4',label:'RGB چهار سیم',desc:'نوارهای رنگی دو سمت اسپیکر',image:CONTROL_ART.fuseRgb4},
  {id:'amplifier',key:'amplifier',label:'آمپلی‌فایر',desc:'تقویت صدا و خروجی بلندگوها',image:CONTROL_ART.fuseAmplifier},
  {id:'controller',key:'controller',label:'کنترلر مرکزی نوا',desc:'هماهنگی فرمان‌ها و ارتباطات اسپیکر',image:CONTROL_ART.fuseController},
];
const TOUCH_STATUS_ITEMS=[
  {id:'power',key:'power',label:'روشن/خاموش اصلی',desc:'کلید لمسی برق اسپیکر',image:CONTROL_ART.touchPower},
  {id:'galaxy',key:'galaxy',label:'کلید لمسی کهکشانی',desc:'فرمان نور کهکشانی',image:CONTROL_ART.touchGalaxy},
  {id:'neon',key:'neon',label:'کلید لمسی نئون',desc:'فرمان حلقه و نئون',image:CONTROL_ART.touchNeon},
  {id:'rgb4',key:'rgb4',label:'کلید لمسی RGB چهار سیم',desc:'فرمان نوارهای RGB',image:CONTROL_ART.touchRgb},
  {id:'volume',key:'volume',label:'کلید لمسی صدا',desc:'فرمان صوتی/بلندی صدا',image:CONTROL_ART.touchVolume},
];
const SECURITY_METHODS=[
  {id:'pin',label:'رمز عددی',desc:'ورود با رمز عددی',image:CONTROL_ART.authPin,color:'#63e8ff'},
  {id:'pattern',label:'الگوی رسم‌شدنی',desc:'اتصال حداقل چهار نقطه',image:CONTROL_ART.authPattern,color:'#b28cff'},
  {id:'biometric',label:'اثر انگشت یا چهره',desc:'احراز هویت واقعی گوشی با رمز پشتیبان',image:CONTROL_ART.authBiometric,color:'#72ffc5'},
];
const SECURITY_TARGETS=[
  {key:'appStart',label:'قفل کامل اپلیکیشن',desc:'در شروع هر بار اجرای دوباره رمز می‌خواهد',image:CONTROL_ART.lockApp,color:'#63e8ff'},
  {key:'speakerPower',label:'روشن‌کردن اسپیکر',desc:'قبل از روشن‌کردن باید تأیید هویت شود',image:CONTROL_ART.lockSpeaker,color:'#ffd166'},
  {key:'childLock',label:'قفل کودک اسپیکر',desc:'قفل‌کردن کنترل‌های برنامه و درخواست قفل کلیدهای دستگاه',image:CONTROL_ART.childLockSpeaker,color:'#ff9d35'},
  {key:'nora',label:'هوش مصنوعی نورا',desc:'ورود به صفحهٔ نورا و فرمان‌های حساس',image:CONTROL_ART.lockNora,color:'#b28cff'},
  {key:'liveMic',label:'میکروفن زنده',desc:'ارسال صدای زندهٔ میکروفن گوشی',image:CONTROL_ART.liveMic,color:'#63e8ff'},
  {key:'contacts',label:'مخاطبین اضطراری',desc:'تغییر اطلاعات تماس فقط پس از احراز هویت',image:CONTROL_ART.lockContacts,color:'#ff79c8'},
  {key:'camera',label:'دوربین و ثبت تصویر',desc:'دسترسی به بخش‌های حساس تصویری',image:CONTROL_ART.lockCamera,color:'#ff8c69'},
  {key:'imageSettings',label:'تنظیمات تصویر و گالری',desc:'ورود به تنظیمات پس‌زمینه، GIF و آیکن‌های سفارشی',image:CONTROL_ART.lockGallery,color:'#ffd166'},
  {key:'commandRoom',label:'اتاق فرمان',desc:'قفل ورود به صفحهٔ اتاق فرمان',image:CONTROL_ART.fuseController,color:'#63e8ff'},
  {key:'lighting',label:'کنترل نورپردازی',desc:'صفحه‌های RGB و کهکشانی',image:CONTROL_ART.fuseRgb4,color:'#72ffc5'},
  {key:'musicLibrary',label:'آوا و گنجینهٔ USB',desc:'دسترسی به موسیقی و فایل‌های USB',image:CONTROL_ART.touchVolume,color:'#ff79c8'},
  {key:'fuses',label:'فیوزها و کلیدهای لمسی',desc:'نمایش وضعیت مدارها و کلیدهای لمسی',image:CONTROL_ART.fuseGalaxy,color:'#ffd166'},
  {key:'diagnostics',label:'تشخیص و نگهداری',desc:'بررسی وضعیت و نسخهٔ برنامه',image:CONTROL_ART.authRecovery,color:'#72ffc5'},
];
const STATUS_DISPLAY:any={connected:{color:'#39ff8a',label:'وصل / پاسخ‌گو'},cut:{color:'#ff465f',label:'قطع / پاسخ منفی'},fault:{color:'#ffd166',label:'خطا گزارش شد'},unknown:{color:'#8992a8',label:'هنوز اطلاعاتی نیست'}};
const fourWireIcons=['bulb-outline','pulse-outline','water-outline','radio-outline','heart-outline','trail-sign-outline','flash-outline','color-palette-outline','rainy-outline','sync-outline'];
const neonIcons=['bulb-outline','pulse-outline','water-outline','radio-outline','trail-sign-outline','flash-outline','rainbow-outline','rainy-outline','moon-outline','sync-outline'];
const MUSIC_ART_PRESETS = [
  {name:'شهر شب',image:require('./assets/music_artwork_custom/art_1.png'),color:'#63e8ff'},
  {name:'پاییز',image:require('./assets/music_artwork_custom/art_2.png'),color:'#ff8c69'},
  {name:'بهار',image:require('./assets/music_artwork_custom/art_3.png'),color:'#72ffc5'},
  {name:'زمستان',image:require('./assets/music_artwork_custom/art_4.png'),color:'#b8dcff'},
  {name:'کوهستان',image:require('./assets/music_artwork_custom/art_5.png'),color:'#ffd166'},
  {name:'طبیعت',image:require('./assets/music_artwork_custom/art_6.png'),color:'#54f2d2'},
  {name:'مدار نوا',image:require('./assets/music_artwork_custom/art_7.png'),color:'#ff79c8'},
];
const MUSIC_BG_CUSTOM = [
  {name:'شهر شب',image:require('./assets/music_backgrounds_custom/city.jpg'),gif:require('./assets/music_backgrounds_custom/city.gif')},
  {name:'پاییزی',image:require('./assets/music_backgrounds_custom/autumn.jpg'),gif:require('./assets/music_backgrounds_custom/autumn.gif')},
  {name:'بهاری',image:require('./assets/music_backgrounds_custom/spring.jpg'),gif:require('./assets/music_backgrounds_custom/spring.gif')},
  {name:'زمستانی',image:require('./assets/music_backgrounds_custom/winter.jpg'),gif:require('./assets/music_backgrounds_custom/winter.gif')},
  {name:'کوهستانی',image:require('./assets/music_backgrounds_custom/mountain.jpg'),gif:require('./assets/music_backgrounds_custom/mountain.gif')},
  {name:'طبیعت',image:require('./assets/music_backgrounds_custom/nature.jpg'),gif:require('./assets/music_backgrounds_custom/nature.gif')},
];
const MUSIC_EFFECT_NAMES = ['نبض همگام','حلقه صوتی','موج صدا','مدار نور','ریتم عمودی','هاله زنده','ضربان عمیق'];
const MUSIC_EFFECT_COLORS = ['#ff79c8','#63e8ff','#72ffc5','#b28cff','#ffd166','#54f2d2','#ff8c69'];
const COLOR_WHEEL_APPEARANCES=[
  {id:0,name:'حلقه طیفی',icon:'color-palette-outline'},
  {id:1,name:'دو حلقه نئون',icon:'radio-button-on-outline'},
  {id:2,name:'کریستال رنگ',icon:'diamond-outline'},
  {id:3,name:'مارپیچ طیف',icon:'sync-outline'},
  {id:4,name:'گلبرگ‌های نور',icon:'flower-outline'},
];
const MUSIC_REACTIVE_MODES=[
  {id:1,name:'نبض ضربی',icon:'pulse-outline'},
  {id:2,name:'طیف رنگ',icon:'color-palette-outline'},
  {id:3,name:'شوک ریتم',icon:'flash-outline'},
];
const galaxyEffects=['نورانی','طوفان ستاره‌ای','موج کهکشانی','رقص ستارگان','انفجار نور','گردباد انرژی','حلقه نور','شفق قطبی','کهکشان طلایی','نبض بنفش','شهاب آبی','موج رنگین','ستاره دنباله‌دار','هاله زنده','شفق صورتی','ابر بنفش','باران ستاره','مدار نور','شب فیروزه‌ای','کهکشان زنده','موج آبی','طلوع بنفش','شعله نور','رقص رنگ','شهاب صورتی','هاله طلایی','نبض آبی','آسمان زنده','گرداب نور','کهکشان خانواده'];
const EQ_PRESETS=[['مدار آرام',[40,50,42,46]],['کهکشان',[58,54,72,66]],['نبض شب',[72,48,64,76]],['ستاره شفاف',[52,68,78,84]],['عمق سینمایی',[82,46,58,62]]];

async function btPermissions(){
  if(Platform.OS!=='android') return true;
  if(Number(Platform.Version)>=31){const r=await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);return r[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]===PermissionsAndroid.RESULTS.GRANTED&&r[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]===PermissionsAndroid.RESULTS.GRANTED;}
  const r=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);return r===PermissionsAndroid.RESULTS.GRANTED;
}

function AnimatedFrame({preset=0}:{preset?:number}){
  const glow=useRef(new Animated.Value(.55)).current;
  useEffect(()=>{
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(glow,{toValue:1,duration:1500,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(glow,{toValue:.45,duration:1900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    ])); loop.start(); return()=>loop.stop();
  },[glow]);
  const variants=[
    {a:'rgba(99,232,255,.82)',b:'rgba(255,121,200,.52)',radius:25,inner:21,corner:'#63e8ff'},
    {a:'rgba(255,209,102,.86)',b:'rgba(178,140,255,.58)',radius:27,inner:23,corner:'#ffd166'},
    {a:'rgba(114,255,197,.84)',b:'rgba(99,232,255,.55)',radius:23,inner:19,corner:'#72ffc5'},
    {a:'rgba(178,140,255,.86)',b:'rgba(255,121,200,.58)',radius:29,inner:24,corner:'#b28cff'},
    {a:'rgba(255,140,105,.84)',b:'rgba(255,209,102,.58)',radius:24,inner:20,corner:'#ff8c69'},
  ];
  const v=variants[Math.max(0,Math.min(variants.length-1,Number(preset)||0))];
  return <View pointerEvents="none" style={styles.globalFrameLayer}>
    <Animated.View style={[styles.frameBorderOuter,{borderColor:v.a,shadowColor:v.corner,borderRadius:v.radius,opacity:glow,transform:[{scale:glow.interpolate({inputRange:[.45,1],outputRange:[.997,1.002]})}]}]}/>
    <View style={[styles.frameBorderInner,{borderColor:v.b,borderRadius:v.inner,shadowColor:v.corner}]}/>
    <Animated.View style={[styles.frameCornerGlow,styles.frameCornerTL,{backgroundColor:v.corner,shadowColor:v.corner,opacity:glow}]}/>
    <Animated.View style={[styles.frameCornerGlow,styles.frameCornerTR,{backgroundColor:v.corner,shadowColor:v.corner,opacity:glow}]}/>
    <Animated.View style={[styles.frameCornerGlow,styles.frameCornerBL,{backgroundColor:v.corner,shadowColor:v.corner,opacity:glow}]}/>
    <Animated.View style={[styles.frameCornerGlow,styles.frameCornerBR,{backgroundColor:v.corner,shadowColor:v.corner,opacity:glow}]}/>
  </View>;
}

function MagicPressable({children,onPress,onPressIn,onPressOut,style,disabled=false,magicColor,accessibilityLabel,...rest}:any){
  const [active,setActive]=useState(false);
  const [variant,setVariant]=useState(0);
  const burst=useRef(new Animated.Value(0)).current;
  const flash=useRef(new Animated.Value(0)).current;
  const spark=useRef(new Animated.Value(0)).current;
  const wave=useRef(new Animated.Value(0)).current;
  const palette=['#63e8ff','#ff79c8','#ffd166','#72ffc5','#b28cff','#ff8c69'];
  const color=magicColor||palette[variant%palette.length];
  const trigger=()=>{
    if(disabled)return;
    const v=Math.floor(Math.random()*5);setVariant(v);setActive(true);
    burst.setValue(0);flash.setValue(0);spark.setValue(0);wave.setValue(0);
    Animated.parallel([
      Animated.timing(burst,{toValue:1,duration:520,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
      Animated.timing(flash,{toValue:1,duration:190,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      Animated.timing(spark,{toValue:1,duration:620,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
      Animated.timing(wave,{toValue:1,duration:700,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
    ]).start(()=>setActive(false));
    onPressIn?.();
  };
  const particleOffsets=[[-1,-.85],[.15,-1],[1,-.55],[1,.25],[.45,1],[-.45,1],[-1,.35],[-.9,-.25]];
  const tx=(dx:number)=>burst.interpolate({inputRange:[0,1],outputRange:[0,dx*30]});
  const ty=(dy:number)=>burst.interpolate({inputRange:[0,1],outputRange:[0,dy*30]});
  const fade=wave.interpolate({inputRange:[0,.15,1],outputRange:[0,.95,0]});
  const scale=spark.interpolate({inputRange:[0,.25,1],outputRange:[.15,1.2,.05]});
  return <BasePressable {...rest} disabled={disabled} accessibilityLabel={accessibilityLabel} onPress={onPress} onPressIn={trigger} onPressOut={onPressOut} style={style}>
    {children}
    {active&&<View pointerEvents="none" style={styles.magicLayer}>
      {variant===0&&<><Animated.View style={[styles.magicFlash,{backgroundColor:color,opacity:flash.interpolate({inputRange:[0,.18,1],outputRange:[0,.95,0]}),transform:[{scale:flash.interpolate({inputRange:[0,1],outputRange:[.2,1.8]})},{rotate:'45deg'}]}]}/>{[0,1,2,3].map(i=><Animated.View key={`d${i}`} style={[styles.magicRay,{backgroundColor:i%2?color:'#fff',opacity:fade,transform:[{rotate:`${45+i*90}deg`},{scaleY:wave.interpolate({inputRange:[0,1],outputRange:[.1,1.5]})}]}]}/>)}</>}
      {variant===1&&<>{particleOffsets.concat([[.2,-.4],[-.2,.45],[.7,-.1],[-.7,.15]]).map(([dx,dy],i)=><Animated.View key={`p${i}`} style={[styles.magicParticle,{backgroundColor:i%3===0?'#fff':color,opacity:spark.interpolate({inputRange:[0,.12,1],outputRange:[0,1,0]}),transform:[{translateX:tx(dx)},{translateY:ty(dy)},{scale},{rotate:`${i*37}deg`}]}]}/>)}</>}
      {variant===2&&<>{Array.from({length:8},(_,i)=><Animated.View key={`r${i}`} style={[styles.magicRay,{width:i%2?3:2,height:24+i*2,backgroundColor:i%2?color:'#fff',opacity:fade,transform:[{rotate:`${i*22.5}deg`},{scaleY:wave.interpolate({inputRange:[0,1],outputRange:[.05,1.4]})}]}]}/>)}</>}
      {variant===3&&<>{[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]].map(([dx,dy],i)=><Animated.View key={`s${i}`} style={[styles.magicParticle,{width:i%2?8:5,height:i%2?8:5,borderRadius:1,backgroundColor:i%2?color:'#fff',opacity:spark.interpolate({inputRange:[0,.15,1],outputRange:[0,1,0]}),transform:[{translateX:tx(dx)},{translateY:ty(dy)},{rotate:`${i*45}deg`},{scale}]}]}/>)}</>}
      {variant===4&&<><Animated.View style={[styles.magicFlash,{width:30,height:4,borderRadius:1,backgroundColor:color,opacity:fade,transform:[{scaleX:wave.interpolate({inputRange:[0,1],outputRange:[.1,1.7]})}]}]}/><Animated.View style={[styles.magicFlash,{width:4,height:30,borderRadius:1,backgroundColor:'#fff',opacity:fade,transform:[{scaleY:wave.interpolate({inputRange:[0,1],outputRange:[.1,1.7]})}]}]}/><Animated.View style={[styles.magicCore,{backgroundColor:color,shadowColor:color,opacity:flash.interpolate({inputRange:[0,.2,1],outputRange:[0,1,0]}),transform:[{scale:flash.interpolate({inputRange:[0,.2,1],outputRange:[.2,1.8,.2]})}]}]}/></>}
    </View>}
  </BasePressable>;
}
function StartSplash(){
  const spin=useRef(new Animated.Value(0)).current;
  const pulse=useRef(new Animated.Value(.92)).current;
  useEffect(()=>{
    const spinLoop=Animated.loop(Animated.timing(spin,{toValue:1,duration:5000,easing:Easing.linear,useNativeDriver:true}));
    const pulseLoop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1.035,duration:520,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:.92,duration:780,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:1.018,duration:420,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:.92,duration:980,useNativeDriver:true}),
    ]));
    spinLoop.start();
    pulseLoop.start();
    return()=>{spinLoop.stop();pulseLoop.stop();};
  },[spin,pulse]);
  const rotation=spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const logoScale=pulse;
  return <View style={styles.splash}>
    <Image source={START_CITY_CLEAN} style={styles.splashCityFill} resizeMode="cover" blurRadius={10}/>
    <View pointerEvents="none" style={styles.splashCityFillShade}/>
    <Image source={START_CITY_CLEAN} style={styles.splashCity} resizeMode="contain"/>

    <View pointerEvents="none" style={styles.splashLogoStage}>
      <Animated.View style={[styles.splashLogoSpinLayer,{transform:[{perspective:900},{rotateY:rotation},{scale:logoScale}]}]}>
        <Image source={START_LOGO} style={styles.splashLogoReal} resizeMode="contain"/>
      </Animated.View>
    </View>

  </View>;
}
function BgView({bg,page}:{bg?:Bg,page:PageId}){
  if(page==='music'&&bg?.kind==='musicCustom'){const item=MUSIC_BG_CUSTOM[Math.max(0,Math.min(MUSIC_BG_CUSTOM.length-1,Number(bg.value)||0))];return <Image source={item.image} resizeMode="cover" style={StyleSheet.absoluteFillObject}/>;}
  if(page==='music'&&bg?.kind==='musicCustomGif'){const item=MUSIC_BG_CUSTOM[Math.max(0,Math.min(MUSIC_BG_CUSTOM.length-1,Number(bg.value)||0))];return <ExpoImage source={item.gif} contentFit="cover" autoplay style={StyleSheet.absoluteFillObject}/>;}
  if(bg?.kind==='image'||bg?.kind==='gif')return <ExpoImage source={{uri:bg.value,isAnimated:bg.kind==='gif'}} contentFit="cover" autoplay={bg.kind==='gif'} style={StyleSheet.absoluteFillObject}/>;
  if(bg?.kind==='presetGif'){
    const list=page==='ai'?NORA_GIF_BG_PRESETS:(PAGE_GIF_BG_PRESETS[page]||PAGE_GIF_BG_PRESETS.control);
    const item=list[Math.max(0,Math.min(list.length-1,Number(bg.value)||0))];
    return item?<ExpoImage source={item.source} contentFit="cover" autoplay style={StyleSheet.absoluteFillObject}/>:null;
  }
  if(page==='ai'){
    const i=bg?.kind==='preset'?Math.max(0,Math.min(NORA_STATIC_BG.length-1,Number(bg.value)||0)):0;
    return <Image source={NORA_STATIC_BG[i]} resizeMode="cover" style={StyleSheet.absoluteFillObject}/>;
  }
  const list=PAGE_BG_PRESETS[page]||PAGE_BG_PRESETS.control;
  const i=bg?.kind==='preset'?Math.max(0,Math.min(list.length-1,Number(bg.value)||0)):Math.max(0,PAGES.findIndex(x=>x[0]===page))%list.length;
  return <Image source={list[i]} resizeMode="cover" style={StyleSheet.absoluteFillObject}/>;
}
const ICON_LABELS:any={power:'اسپیکر',wifi:'Wi‑Fi',scan:'جستجو',prev:'قبلی',play:'پخش',pause:'توقف',next:'بعدی',check:'تأیید',close:'بازگشت'};
function IconButton({name,label,onPress,active=false,size=58,color='#fff',showLabel=true}:{name:string;label?:string;onPress:()=>void;active?:boolean;size?:number;color?:string;showLabel?:boolean;key?:React.Key}){const visibleLabel=label||ICON_LABELS[name]||'';const image=UI_ICONS[name];return <View style={styles.iconButtonWrap}><MagicPressable accessibilityRole="button" accessibilityLabel={visibleLabel||name} onPress={onPress} style={({pressed})=>[styles.iconButton,{width:size,height:size,borderRadius:size/2,borderColor:color,shadowColor:color},active&&styles.iconActive,pressed&&styles.pressed]}>{image?<Image source={image} resizeMode="contain" style={[styles.actionImage,{width:size*.55,height:size*.55}]}/>:<Ionicons name={(icons[name]||name) as any} size={Math.round(size*.39)} color={color}/>}</MagicPressable>{showLabel&&visibleLabel?<Text style={[styles.iconButtonLabel,{color}]}>{visibleLabel}</Text>:null}</View>}
function Option({icon,label,onPress,active=false,children,color,image}:{icon:string;label:string;onPress?:()=>void;active?:boolean;children?:React.ReactNode;color?:string;image?:any;key?:React.Key}){const c=color||PAGE_META[icon]?.color||'#63e8ff';const art=image||OPTION_ART[icon];return <MagicPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>[styles.option,active&&styles.optionActive,pressed&&styles.pressed]}><View style={[styles.optionIcon,{borderColor:c,shadowColor:c}]}>{art?<Image source={art} resizeMode="contain" style={styles.optionCustomArt}/>:<Ionicons name={(icons[icon]||icon) as any} size={23} color={c}/>}</View><View style={{flex:1}}><Text style={styles.optionLabel}>{label}</Text>{children}</View>{onPress&&<Image source={CONTROL_ART.forwardArrow} resizeMode="contain" style={{width:22,height:22}}/>}</MagicPressable>}
function Header({page,onSettings,onBack,onEqualizer,s}:{page:string;onSettings:()=>void;onBack?:()=>void;onEqualizer?:()=>void;s?:any}){
  const key=Object.keys(PAGE_META).find(k=>labelFor(k as any)===page||`تنظیمات ${labelFor(k as any)}`===page)||page;
  const meta=PAGE_META[key]||PAGE_META.control;
  const accent=PAGE_HEADER_COLORS[key]||meta.color;
  const compactAIHeader=key==='ai';
  const rawCustomPreset=Math.max(0,Number(s?.pageIconPreset?.[key])||0);
  const customPreset=key==='ai'?rawCustomPreset%NORA_ICON_PRESETS.length:Math.min(5,rawCustomPreset);
  const customGallery=s?.pageIconGallery?.[key];
  const hasIconPreset=s?.pageIconPreset?.[key]!==undefined&&s?.pageIconPreset?.[key]!==null;
  const selectedIconVariant=NAV_ICON_VARIANTS[key]?.[customPreset]||PAGE_META[key]?.icon||'sparkles';
  const customPageIcon=key==='ai'?null:CUSTOM_PAGE_ICON_ASSETS[key]?.[customPreset%6];
  const galleryIconIsGif=s?.pageIconGalleryKind?.[key]==='gif';
  const pulse=useRef(new Animated.Value(.82)).current;
  const iconSpin=useRef(new Animated.Value(0)).current;
  const selectedIconEffect=Math.max(0,Math.min(4,Number(s?.pageIconEffect?.[key])||0));
  useEffect(()=>{
    iconSpin.stopAnimation();
    if(selectedIconEffect===1){iconSpin.setValue(0);const spinLoop=Animated.loop(Animated.timing(iconSpin,{toValue:1,duration:9000,useNativeDriver:true}));spinLoop.start();return()=>spinLoop.stop();}
    iconSpin.setValue(0);
  },[iconSpin,selectedIconEffect]);
  useEffect(()=>{
    pulse.stopAnimation();
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:850,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:.82,duration:1150,useNativeDriver:true}),
    ]));
    loop.start();
    return()=>loop.stop();
  },[pulse]);
  const iconSource=key==='ai'&&NORA_ICON_PRESETS[customPreset]?NORA_ICON_PRESETS[customPreset]:UI_ICONS[key];
  const iconScale=pulse.interpolate({inputRange:[.82,1],outputRange:selectedIconEffect===4?[.88,1.12]:[.96,1.02]});
  const iconRotation=iconSpin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return <View style={[styles.header,compactAIHeader&&styles.headerCompactAI]}>
    <View style={styles.headerTopRow}>
      <View style={styles.headerLeftAction}>
        {onBack ? <MagicPressable accessibilityRole="button" accessibilityLabel="بازگشت" onPress={onBack} style={styles.imageTopButton}>
          <Image source={CONTROL_ART.backArrow} resizeMode="contain" style={styles.topButtonImage}/>
        </MagicPressable> : <MagicPressable accessibilityRole="button" accessibilityLabel="تنظیمات صفحه" onPress={onSettings} style={styles.imageTopButton}>
          <Image source={UI_ICONS.settings} style={[styles.topButtonImage,{tintColor:accent}]}/>
        </MagicPressable>}
        {onEqualizer ? <MagicPressable accessibilityRole="button" accessibilityLabel="ورود به اکولایزر و دی‌جی" onPress={onEqualizer} style={[styles.eqHeaderLauncher,{borderColor:accent,shadowColor:accent}]}>
          <Image source={EQUALIZER_ENTRY_ICON} resizeMode="contain" style={styles.eqHeaderLauncherImage}/>
        </MagicPressable> : null}
      </View>
      <View style={styles.headerBrandBlock}>
        <Text style={styles.brand}>کوروش نوا</Text>
        <Text style={styles.slogan}>یک صدا</Text>
        <Text style={styles.slogan}>یک زندگی</Text>
        <Image source={UI_ICONS.heartbeat} resizeMode="contain" style={[styles.headerHeartbeat,{tintColor:accent}]}/>
      </View>
    </View>
    {!compactAIHeader&&<View style={styles.headerCenterStage}>
      <Animated.View style={[styles.headerIconHalo,{borderColor:accent,shadowColor:accent,opacity:selectedIconEffect===2?1:pulse,borderWidth:selectedIconEffect===2?3:1,shadowOpacity:selectedIconEffect===3?1:.55,shadowRadius:selectedIconEffect===2||selectedIconEffect===3?23:14,transform:[{scale:iconScale},{rotate:iconRotation}]}]}>
        {customGallery ? <ExpoImage source={{uri:customGallery,isAnimated:galleryIconIsGif}} style={styles.headerCustomImage} contentFit="contain" autoplay={galleryIconIsGif}/> : customPageIcon ? <Image source={customPageIcon} style={styles.headerCustomImage} resizeMode="contain"/> : key==='ai' ? <Image source={NORA_ICON_PRESETS[customPreset%NORA_ICON_PRESETS.length]} style={styles.headerCustomImage} resizeMode="contain"/> : hasIconPreset ? <Ionicons name={selectedIconVariant as any} size={58} color={accent}/> : iconSource ? <Image source={iconSource} style={styles.headerCustomImage} resizeMode="contain"/> : <Ionicons name={selectedIconVariant as any} size={58} color={accent}/>}
      </Animated.View>
      {key!=='rgb'&&<View style={[styles.pageTitlePlaque,{borderColor:accent,shadowColor:accent}]}>
        {customGallery ? <ExpoImage source={{uri:customGallery,isAnimated:galleryIconIsGif}} style={styles.plaqueIcon} contentFit="contain" autoplay={galleryIconIsGif}/> : key==='ai' ? <Image source={NORA_ICON_PRESETS[customPreset]} style={styles.plaqueIcon} resizeMode="contain"/> : hasIconPreset ? <Ionicons name={selectedIconVariant as any} size={17} color={accent}/> : iconSource ? <Image source={iconSource} style={styles.plaqueIcon} resizeMode="contain"/> : <Ionicons name={selectedIconVariant as any} size={17} color={accent}/>}
        <Text style={styles.pageTitle}>{page}</Text>
      </View>}
    </View>}
  </View>;
}

function NavIcon({id,preset,color,gallery,galleryKind,sourceKind,gifPreset=0}:{id:string;preset:number;color:string;gallery?:string|null;galleryKind?:string|null;sourceKind?:string;gifPreset?:number}){
  const useGif=sourceKind==='gif'&&!gallery;
  const source=gallery?{uri:gallery}:useGif?(NAV_ICON_GIF_ASSETS[id]||CUSTOM_PAGE_ICON_ASSETS[id]?.[gifPreset%6]||UI_ICONS[id]):(CUSTOM_PAGE_ICON_ASSETS[id]?.[preset%6]||UI_ICONS[id]||UI_ICONS.control);
  const animated=!!gallery&&galleryKind==='gif'||useGif;
  const custom=!!CUSTOM_PAGE_ICON_ASSETS[id]?.[preset%6]||useGif; return <ExpoImage source={typeof source==='object'&&source?.uri?{...source,isAnimated:animated}:source} contentFit="contain" autoplay={animated} style={[styles.navImage,{tintColor:(gallery||custom)?undefined:color}]}/>;
}

function Dock({page,go,s,setS}:{page:PageId;go:(p:PageId)=>void;s:any;setS:(p:any)=>void}){return <View style={styles.dock}>{NAV_PAGES.map(([id,label])=>{const active=page===id;const color=s.navIconColor?.[id]||ICON_COLORS[PAGES.findIndex(x=>x[0]===id)%ICON_COLORS.length];const preset=Number(s.navIconPreset?.[id])||0;return <MagicPressable key={id} accessibilityLabel={label} onPress={()=>go(id)} style={({pressed})=>[styles.dockItem,active&&styles.dockItemActive,{borderColor:color,shadowColor:color},pressed&&styles.pressed]}><View style={[styles.dockIconRing,{borderColor:color,shadowColor:color,backgroundColor:active?`${color}22`:'rgba(8,9,27,.72)'}]}><NavIcon id={id} preset={preset} color={color} gallery={s.navIconGallery?.[id]} galleryKind={s.navIconGalleryKind?.[id]} sourceKind={s.navIconSourceKind?.[id]} gifPreset={Number(s.navIconGifPreset?.[id])||0}/></View><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.dockLabel,{color}]}>{label}</Text></MagicPressable>})}</View>}

async function persistGalleryUri(uri:string,prefix:string,fileName?:string,mimeType?:string){try{const dir=FileSystem.documentDirectory+'korosh-nova-gallery/';await FileSystem.makeDirectoryAsync(dir,{intermediates:true});const sourceName=String(fileName||uri.split(/[?#]/)[0].split('/').pop()||'image.jpg');const match=sourceName.match(/\.([a-z0-9]{2,5})$/i);const mimeExt=mimeType==='image/gif'?'gif':mimeType==='image/png'?'png':mimeType==='image/webp'?'webp':mimeType==='image/jpeg'?'jpg':undefined;const candidate=(mimeExt||match?.[1]||'jpg').toLowerCase();const ext=['jpg','jpeg','png','webp','gif','heic','avif','bmp'].includes(candidate)?candidate:'jpg';const target=dir+prefix.replace(/[^a-z0-9_-]/gi,'_')+'_'+Date.now()+'.'+ext;await FileSystem.copyAsync({from:uri,to:target});return target}catch{return uri}}
async function persistSecretGalleryUri(uri:string,prefix:string,fileName?:string,mimeType?:string){
  const root=FileSystem.documentDirectory;
  if(!root) throw new Error('App document directory is unavailable');
  const saved=await persistGalleryUri(uri,prefix,fileName,mimeType);
  const expectedPrefix=root+'korosh-nova-gallery/';
  if(!saved.startsWith(expectedPrefix)) throw new Error('Selected media could not be copied to durable app storage');
  const info=await FileSystem.getInfoAsync(saved);
  if(!info.exists) throw new Error('Stored media file was not found after copy');
  return saved;
}
function isGifAsset(a:any){const name=String(a?.fileName||a?.filename||a?.uri||'').toLowerCase();const mime=String(a?.mimeType||'').toLowerCase();return mime==='image/gif'||name.split(/[?#]/)[0].endsWith('.gif')}
function MusicSettings({s,setS,onBack,bg,onSave}:{s:any;setS:(p:any)=>void;onBack:()=>void;bg?:Bg;onSave:(b:Bg)=>void}){
  const [saving,setSaving]=useState(false);const [effectsModal,setEffectsModal]=useState(false);
  const pickArtwork=async(kind:'image'|'gif')=>{
    setSaving(true);
    try{
      const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:kind==='image',...(kind==='image'?{aspect:[1,1] as [number,number]}:{}),quality:kind==='gif'?1:0.9});
      if(!r.canceled&&r.assets?.[0]?.uri){
        const asset=r.assets[0];
        if(kind==='gif'&&!isGifAsset(asset)){Alert.alert('GIF لازم است','برای گزینه GIF یک فایل با فرمت GIF انتخاب کن.');return;}
        const saved=await persistGalleryUri(asset.uri,`music_artwork_${kind}`,asset.fileName||undefined,asset.mimeType||undefined);
        setS({musicArtworkUri:saved,musicArtworkMode:kind});
      }
    }finally{setSaving(false)}
  };
  const pickBackground=async(kind:'image'|'gif')=>{
    setSaving(true);
    try{
      const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
      if(!r.canceled&&r.assets?.[0]?.uri){
        const asset=r.assets[0];
        if(kind==='gif'&&!isGifAsset(asset)){Alert.alert('GIF لازم است','برای پس‌زمینه متحرک یک فایل با فرمت GIF انتخاب کن.');return;}
        const saved=await persistGalleryUri(asset.uri,`music_background_${kind}`,asset.fileName||undefined,asset.mimeType||undefined);
        onSave({kind,value:saved});
      }
    }finally{setSaving(false)}
  };
  return <SafeAreaView style={styles.safe}><View style={styles.settingsPage}><AnimatedFrame preset={Number(s.pageFramePreset?.music||0)}/><Header page="تنظیمات آوای نوا" onBack={onBack} onSettings={onBack} s={s}/><ScrollView contentContainerStyle={styles.pad}>
    <Text style={styles.sectionTitle}>تصویر چرخان آوای نوا</Text>
    
    <View style={styles.musicSettingsHero}>{s.musicArtworkUri?<ExpoImage source={{uri:s.musicArtworkUri,isAnimated:s.musicArtworkMode==='gif'}} style={styles.musicSettingsHeroImage} contentFit="cover" autoplay={s.musicArtworkMode==='gif'}/>:<MusicDefaultArtwork preset={Number(s.musicArtworkPreset)||0} size={186}/>}</View>
    <Text style={styles.musicSettingTitle}>تصاویر آماده</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.musicPresetRail}>{MUSIC_ART_PRESETS.map((preset,i)=>{const active=Number(s.musicArtworkPreset||0)===i&&!s.musicArtworkUri;return <MagicPressable key={preset.name} onPress={()=>setS({musicArtworkUri:null,musicArtworkPreset:i,musicArtworkMode:'preset'})} style={[styles.musicPresetOrb,s.musicPresetOrbCustom,active&&styles.musicPresetOrbActive]}><View style={{alignItems:'center',gap:3}}><View style={{width:58,height:58,borderRadius:29,backgroundColor:'#080b20',borderWidth:1,borderColor:preset.color,alignItems:'center',justifyContent:'center',overflow:'hidden'}}><Image source={preset.image} style={{width:58,height:58}} resizeMode="cover"/></View><Text style={{fontSize:8,color:'#fff',fontWeight:'800'}}>{preset.name}</Text>{active&&<Ionicons name="checkmark-circle" size={15} color="#72ffc5"/>}</View></MagicPressable>})}</ScrollView>
    <View style={styles.settingsActions}><Option icon="gallery" label="انتخاب تصویر از گالری" onPress={()=>pickArtwork('image')} active={s.musicArtworkMode==='image'}/><Option icon="images" label="انتخاب GIF از گالری" onPress={()=>pickArtwork('gif')} active={s.musicArtworkMode==='gif'}/></View>
    <Text style={styles.musicSettingTitle}>پس‌زمینه مستقل صفحه آوای نوا</Text>
    <View style={styles.bgGrid}>{MUSIC_BG_CUSTOM.map((item,i)=>{const active=bg?.kind==='musicCustom'&&Number(bg.value)===i;return <MagicPressable key={item.name} onPress={()=>onSave({kind:'musicCustom',value:String(i)})} style={[styles.bgChoice,active&&styles.bgChoiceSelected]}><Image source={item.image} style={styles.bgFullImage} resizeMode="cover"/><View style={styles.bgChoiceShade}/><Text style={styles.bgName}>{item.name} ثابت</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View>
    <View style={styles.bgGrid}>{MUSIC_BG_CUSTOM.map((item,i)=>{const active=bg?.kind==='musicCustomGif'&&Number(bg.value)===i;return <MagicPressable key={'g'+item.name} onPress={()=>onSave({kind:'musicCustomGif',value:String(i)})} style={[styles.bgChoice,{backgroundColor:'#0a0b20'},active&&styles.bgChoiceSelected]}><ExpoImage source={item.gif} style={styles.bgGifThumb} contentFit="cover" autoplay/><View style={styles.bgChoiceShade}/><Text style={styles.bgName}>{item.name} متحرک</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View>
    <View style={styles.settingsActions}><Option icon="gallery" label="پس‌زمینه ثابت از گالری" onPress={()=>pickBackground('image')} active={bg?.kind==='image'}/><Option icon="images" label="پس‌زمینه GIF از گالری" onPress={()=>pickBackground('gif')} active={bg?.kind==='gif'}/></View>
    <Text style={styles.musicSettingTitle}>قاب اختصاصی آوای نوا</Text><View style={styles.framePresetGrid}>{[['نوا فیروزه‌ای','#63e8ff'],['کهربایی بنفش','#ffd166'],['سبز مهتابی','#72ffc5'],['بنفش لوکس','#b28cff'],['مرجانی طلایی','#ff8c69']].map(([name,c],i)=>{const active=Number(s.pageFramePreset?.music||0)===i;return <MagicPressable key={name} onPress={()=>setS({pageFramePreset:{...(s.pageFramePreset||{}),music:i}})} style={[styles.framePresetCard,active&&styles.framePresetCardActive,{borderColor:c as string}]}><View style={[styles.framePresetPreview,{borderColor:c as string,shadowColor:c as string}]}><View style={[styles.framePresetPreviewInner,{borderColor:c as string}]}/></View><Text style={styles.modalCardText}>{name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View><Text style={styles.musicSettingTitle}>افکت‌های تصویر چرخان</Text>
    
    <View style={styles.settingsActions}><Option icon="effect" label={`انتخاب افکت تصویری · ${MUSIC_EFFECT_NAMES[Math.max(0,Math.min(MUSIC_EFFECT_NAMES.length-1,Number(s.musicVisualEffect)||0))]}`} onPress={()=>setEffectsModal(true)} active={true} color="#ff79c8"/></View>
    {saving&&<Text style={styles.muted}>در حال ذخیره…</Text>}
    {effectsModal&&<SelectionModal title="افکت چرخش آوای نوا" onClose={()=>setEffectsModal(false)}><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:10}}>{MUSIC_EFFECT_NAMES.map((name,i)=>{const active=Number(s.musicVisualEffect||0)===i;return <MagicPressable key={name} onPress={()=>{setS({musicVisualEffect:i});setTimeout(()=>setEffectsModal(false),260)}} style={({pressed})=>[{width:'47%',padding:8,borderRadius:16,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,121,200,.45)',backgroundColor:'rgba(8,9,27,.8)',alignItems:'center',gap:6},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.4,shadowRadius:8},pressed&&styles.pressed]}><MusicEffectVisual index={i} size={82}/><Text style={{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center'}}>{name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View></SelectionModal>}
  </ScrollView></View></SafeAreaView>
}
function PageSettings({page,bg,onBack,onSave,s,setS}:{page:PageId;bg?:Bg;onBack:()=>void;onSave:(b:Bg)=>void;s:any;setS:(p:any)=>void}){
  const [saving,setSaving]=useState(false);
  const [modal,setModal]=useState<'background'|'icon'|'color'|'effect'|'speaker'|'character'|'voice'|'micAppearance'|'composer'|null>(null);
  const pick=async(kind:'image'|'gif')=>{setSaving(true);try{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(!r.canceled&&r.assets?.[0]?.uri){const asset=r.assets[0];if(kind==='gif'&&!isGifAsset(asset)){Alert.alert('GIF لازم است','برای گزینه GIF یک فایل با فرمت GIF انتخاب کن.');return;}const saved=await persistGalleryUri(asset.uri,`${page}_${kind}`,asset.fileName||undefined,asset.mimeType||undefined);onSave({kind,value:saved});setModal(null);}}finally{setSaving(false)}};
  const iconColor=s.pageIconColor?.[page]||PAGE_META[page].color;const iconPreset=Number(s.pageIconPreset?.[page])||0;const effect=Number(s.pageIconEffect?.[page])||0;
  const isNora=page==='ai';const {width:pageSettingsWidth}=useWindowDimensions();const pageCharacterCardWidth=Math.max(64,Math.min(84,(Math.min(pageSettingsWidth,390)-68)/3));
  return <SafeAreaView style={styles.safe}><StatusBar style="light" backgroundColor="#070b1c" translucent={false}/><View style={styles.settingsPage}>{!isNora&&<AnimatedFrame/>}<Header page={`تنظیمات ${labelFor(page)}`} onBack={onBack} onSettings={()=>{}} s={s}/><ScrollView contentContainerStyle={styles.pad}>
    <View style={styles.settingsHero}><View style={[styles.settingsPageIcon,{borderColor:iconColor,shadowColor:iconColor,overflow:'hidden'}]}>{s.pageIconGallery?.[page]?<ExpoImage source={{uri:s.pageIconGallery[page],isAnimated:s.pageIconGalleryKind?.[page]==='gif'}} style={styles.settingsPageImage} contentFit="contain" autoplay={s.pageIconGalleryKind?.[page]==='gif'}/>:<Image source={page==='ai'?NORA_ICON_PRESETS[iconPreset%NORA_ICON_PRESETS.length]:(CUSTOM_PAGE_ICON_ASSETS[page]?.[iconPreset%6]||UI_ICONS[page])} style={styles.settingsPageImage} resizeMode="contain"/>}</View><Text style={styles.sectionTitle}>تنظیمات مستقل {labelFor(page)}</Text><Text style={styles.muted}>هر انتخاب فقط روی همین صفحه اعمال می‌شود.</Text></View>
    {isNora ? <View style={styles.optionList}>
      <Option icon="backgrounds" label="پس‌زمینه نورا" onPress={()=>setModal('background')} color="#63e8ff"/>
      <Option icon="grid" label="آیکن بالای نورا" onPress={()=>setModal('icon')} color="#72ffc5" active={!!s.pageIconGallery?.ai}/>
      <Option icon="effect" label="افکت آیکن نورا" onPress={()=>setModal('effect')} color="#ff79c8"/>
      <Option icon="profile" label="شخصیت نورا" onPress={()=>setModal('character')} color="#b28cff"/>
      <Option icon="mic" label="حالت میکروفون و اتصال آنلاین" onPress={()=>setModal('voice')} color="#72ffc5"/>
      <Option icon="pulse" label="مدل و رقص نور میکروفون" onPress={()=>setModal('micAppearance')} color="#ff79c8" active={Number(s.noraMicDesign||0)!==0||Number(s.noraMicAnimation||0)!==0}/>
      <Option icon="palette" label="کادر پیام و دکمه ارسال" onPress={()=>setModal('composer')} color="#b28cff" active={Number(s.noraComposerStyle||0)!==0||Number(s.noraSendStyle||0)!==0}/>

      <Option icon="sound" label={s.noraVoiceEnabled===false?'فعال‌کردن پاسخ صوتی':'خاموش‌کردن پاسخ صوتی'} onPress={()=>setS({noraVoiceEnabled:s.noraVoiceEnabled===false})} color="#ffd166" active={s.noraVoiceEnabled!==false}><Text style={styles.muted}>{s.noraVoiceEnabled===false?'پاسخ متنی':'پاسخ متنی و گفتاری'}</Text></Option>
    </View> : <View style={styles.optionList}>
      <Option icon="backgrounds" label="پس‌زمینه‌های آماده" onPress={()=>setModal('background')} color="#63e8ff"/>
      <Option icon="gallery" label="تصویر ثابت از گالری" onPress={()=>pick('image')} color="#ffd166" active={bg?.kind==='image'}/>
      <Option icon="effect" label="GIF متحرک از گالری" onPress={()=>pick('gif')} color="#ff79c8" active={bg?.kind==='gif'}/>
      <Option icon="grid" label="طرح آیکن بالای صفحه" onPress={()=>setModal('icon')} color={iconColor}/>
      <Option icon="palette" label="رنگ آیکن بالای صفحه" onPress={()=>setModal('color')} color={iconColor}/>
      <Option icon="effect" label="افکت آیکن و نور دور صفحه" onPress={()=>setModal('effect')} color={iconColor}/>
      {page==='usb'&&<UsbSettingsPanel s={s} setS={setS}/>}
      <Text style={styles.musicSettingTitle}>قاب اختصاصی همین صفحه</Text><View style={styles.framePresetGrid}>{[['فیروزه‌ای صورتی','#63e8ff'],['کهربایی بنفش','#ffd166'],['سبز فیروزه‌ای','#72ffc5'],['بنفش لوکس','#b28cff'],['مرجانی طلایی','#ff8c69']].map(([name,c],i)=>{const active=Number(s.pageFramePreset?.[page]||0)===i;return <MagicPressable key={name} onPress={()=>setS({pageFramePreset:{...(s.pageFramePreset||{}),[page]:i}})} style={[styles.framePresetCard,active&&styles.framePresetCardActive,{borderColor:c as string}]}><View style={[styles.framePresetPreview,{borderColor:c as string,shadowColor:c as string}]}><View style={[styles.framePresetPreviewInner,{borderColor:c as string}]}/></View><Text style={styles.modalCardText}>{name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View>{page==='galaxy'&&<Option icon="speaker" label="تصویر اختصاصی اسپیکر کهکشانی" onPress={()=>setModal('speaker')} color="#b28cff" active={!!s.galaxySpeakerImageUri}/>}
    </View>}
    {saving&&<Text style={styles.muted}>در حال ذخیره…</Text>}
    {modal==='background'&&<SelectionModal title={isNora?'پس‌زمینه نورا':'پس‌زمینه صفحه'} onClose={()=>setModal(null)}>
      {isNora ? <>
        <Text style={styles.musicSettingTitle}>تصویرهای اختصاصی نورا</Text>
        <View style={styles.bgGrid}>{NORA_STATIC_BG.map((src:any,i:number)=><MagicPressable key={`ns${i}`} onPress={()=>{onSave({kind:'preset',value:String(i)});setModal(null)}} style={[styles.bgChoice,bg?.kind==='preset'&&Number(bg.value)===i&&styles.bgChoiceSelected]}><Image source={src} style={styles.bgFullImage} resizeMode="cover"/><View style={styles.bgChoiceShade}/><Text style={styles.bgName}>{NORA_STATIC_BG_NAMES[i]}</Text>{bg?.kind==='preset'&&Number(bg.value)===i&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>)}</View>
        <Text style={styles.musicSettingTitle}>۶ تصویر متحرک پیش‌فرض</Text>
        <View style={styles.bgGrid}>{NORA_GIF_BG_PRESETS.map((e:any,i:number)=><MagicPressable key={`g${e.id}`} onPress={()=>{onSave({kind:'presetGif',value:String(i)});setModal(null)}} style={[styles.bgChoice,{backgroundColor:'#0a0b20'},bg?.kind==='presetGif'&&Number(bg.value)===i&&styles.bgChoiceSelected]}><ExpoImage source={e.source} style={styles.bgGifThumb} contentFit="cover" autoplay/><View style={styles.bgChoiceShade}/><Text style={styles.bgName}>{e.name}</Text>{bg?.kind==='presetGif'&&Number(bg.value)===i&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>)}</View>
      </> : <>
        <Text style={styles.musicSettingTitle}>تصویرهای اختصاصی همین صفحه</Text><View style={styles.bgGrid}>{(PAGE_BG_PRESETS[page]||PAGE_BG_PRESETS.control).map((src:any,i:number)=><MagicPressable key={`p${i}`} onPress={()=>{onSave({kind:'preset',value:String(i)});setModal(null)}} style={[styles.bgChoice,bg?.kind==='preset'&&Number(bg.value)===i&&styles.bgChoiceSelected]}><Image source={src} style={styles.bgFullImage} resizeMode="cover"/><View style={styles.bgChoiceShade}/><Text style={styles.bgName}>{PAGE_BG_NAMES[page]?.[i]||`طرح ${i+1}`}</Text>{bg?.kind==='preset'&&Number(bg.value)===i&&<Ionicons name="checkmark-circle" size={18} color="#72ffc5"/>}</MagicPressable>)}</View>
        <Text style={styles.musicSettingTitle}>GIFهای پیش‌فرض</Text><View style={styles.bgGrid}>{(PAGE_GIF_BG_PRESETS[page]||PAGE_GIF_BG_PRESETS.control).map((e:any,i:number)=><MagicPressable key={`g${e.id}`} onPress={()=>{onSave({kind:'presetGif',value:String(i)});setModal(null)}} style={[styles.bgChoice,{backgroundColor:'#0a0b20'},bg?.kind==='presetGif'&&Number(bg.value)===i&&styles.bgChoiceSelected]}><ExpoImage source={e.source} style={styles.bgGifThumb} contentFit="cover" autoplay/><Text style={styles.bgName}>GIF {i+1}</Text>{bg?.kind==='presetGif'&&Number(bg.value)===i&&<Ionicons name="checkmark-circle" size={18} color="#72ffc5"/>}</MagicPressable>)}</View>
      </>}
      <View style={styles.settingsActions}><Option icon="image" label="تصویر ثابت از گالری" onPress={()=>pick('image')} active={bg?.kind==='image'} color="#ffd166"/><Option icon="images" label="تصویر متحرک GIF از گالری" onPress={()=>pick('gif')} active={bg?.kind==='gif'} color="#ff79c8"/></View>
    </SelectionModal>}
    {modal==='character'&&isNora&&<SelectionModal title="شخصیت نورا" compact onClose={()=>setModal(null)}><View style={styles.noraCharacterGrid}>{NORA_CHARACTER_PRESETS.map((src:any,i:number)=><MagicPressable key={i} accessibilityRole="button" accessibilityLabel={`انتخاب ${NORA_CHARACTER_NAMES[i]}`} onPress={()=>{setS({noraCharacter:i});setTimeout(()=>setModal(null),380)}} style={[styles.noraCharacterCard,styles.noraCharacterCompactCard,{width:pageCharacterCardWidth},Number(s.noraCharacter||0)===i&&styles.noraCharacterCardActive]}><Image source={src} style={styles.noraCharacterChoiceImage}/>{Number(s.noraCharacter||0)===i&&<View style={styles.noraCharacterSelectionTick}><Ionicons name="checkmark" size={17} color="#06111a"/></View>}</MagicPressable>)}</View></SelectionModal>}
    {modal==='voice'&&isNora&&<SelectionModal title="میکروفون و اتصال نورا" onClose={()=>setModal(null)}><Text style={styles.musicSettingTitle}>روش استفاده از میکروفون</Text><View style={styles.modalGrid}>{[['لمس برای شروع و توقف','mic-outline',0],['فقط هنگام نگه‌داشتن','hand-left-outline',1],['خاموش','mic-off-outline',2]].map(([label,ic,v]:any)=><MagicPressable key={String(v)} onPress={()=>setS({micMode:v,noraListening:false})} style={[styles.presetIconCard,Number(s.micMode??1)===v&&styles.presetIconCardActive,{borderColor:'#ff79c8'}]}><Ionicons name={ic as any} size={29} color="#ff79c8"/><Text style={styles.modalCardText}>{label}</Text>{Number(s.micMode??1)===v&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>)}</View><Option icon="sound" label={s.noraVoiceEnabled===false?'پاسخ صوتی خاموش':'پاسخ صوتی روشن'} onPress={()=>setS({noraVoiceEnabled:s.noraVoiceEnabled===false})} color="#ffd166" active={s.noraVoiceEnabled!==false}/><Text style={styles.musicSettingTitle}>نشانی سرویس آنلاین</Text><Text style={styles.muted}>برای پاسخ هوش مصنوعی داخل برنامه یا پخش موسیقی از سرویس آنلاین، نشانی یک سرویس سازگار لازم است. بدون آن، جست‌وجو به مرورگر سپرده می‌شود؛ پاسخ آنلاین داخل برنامه به‌صورت ساختگی نمایش داده نمی‌شود.</Text><TextInput value={String(s.noraApiBaseUrl||'')} onChangeText={v=>setS({noraApiBaseUrl:v.trim()})} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://نشانی-سرویس" placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/><MagicPressable style={styles.saveButton} onPress={()=>setModal(null)}><Ionicons name="checkmark-circle" size={20} color="#fff"/><Text style={styles.saveButtonText}>ذخیره تنظیمات</Text></MagicPressable></SelectionModal>}
    {modal==='micAppearance'&&isNora&&<SelectionModal title="میکروفون اختصاصی نورا" onClose={()=>setModal(null)}>
      <Text style={styles.musicSettingTitle}>۶ مدل میکروفون متفاوت</Text>
      <Text style={styles.muted}>هر مدل شکل قاب و رنگ اختصاصی دارد؛ با لمس هر کارت همان لحظه انتخاب می‌شود.</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:10,columnGap:5}}>{NORA_MIC_DESIGNS.map((d:any,i:number)=>{const active=Number(s.noraMicDesign||0)===i;return <MagicPressable key={d.name} accessibilityRole="button" accessibilityLabel={`مدل میکروفون ${d.name}`} onPress={()=>setS({noraMicDesign:i})} style={[{width:'31.5%',minHeight:111,borderRadius:17,borderWidth:1,borderColor:d.primary,backgroundColor:'rgba(6,9,26,.8)',alignItems:'center',justifyContent:'center',paddingVertical:8,paddingHorizontal:4,gap:4},active&&{borderWidth:2,borderColor:'#72ffc5',shadowColor:'#72ffc5',shadowOpacity:.62,shadowRadius:10}]}><NoraMicArtwork designIndex={i} animationIndex={Number(s.noraMicAnimation||0)} paletteIndex={Number(s.noraMicPalette||0)} size={56} animationSpeed={Number(s.noraMicAnimationSpeed??1)}/><Text style={{color:'#fff',fontSize:8,fontWeight:'900',textAlign:'center'}}>{d.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>۵ افکت متحرک مستقل</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:9,columnGap:5}}>{NORA_MIC_ANIMATIONS.map((a:any,i:number)=>{const active=Number(s.noraMicAnimation||0)===i;return <MagicPressable key={a.name} accessibilityRole="button" accessibilityLabel={`افکت میکروفون ${a.name}`} onPress={()=>setS({noraMicAnimation:i})} style={[{width:'31.5%',minHeight:92,borderRadius:16,borderWidth:1,borderColor:active?'#72ffc5':'rgba(178,140,255,.45)',backgroundColor:'rgba(8,9,27,.75)',alignItems:'center',justifyContent:'center',padding:6,gap:5},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.45,shadowRadius:9}]}><NoraMicArtwork designIndex={Number(s.noraMicDesign||0)} animationIndex={i} paletteIndex={Number(s.noraMicPalette||0)} size={49} animationSpeed={Number(s.noraMicAnimationSpeed??1)}/><Text style={styles.modalCardText}>{a.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>رنگ میکروفون</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center',justifyContent:'center'}}>{NORA_MIC_PALETTES.map((c:any,i:number)=>{const active=Number(s.noraMicPalette||0)===i;const model=NORA_MIC_DESIGNS[Number(s.noraMicDesign||0)]||NORA_MIC_DESIGNS[0];return <MagicPressable key={c.name} accessibilityRole="button" accessibilityLabel={`رنگ میکروفون ${c.name}`} onPress={()=>setS({noraMicPalette:i})} style={[{width:83,minHeight:67,borderWidth:1,borderRadius:14,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(5,8,25,.8)',padding:5,gap:5},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.45,shadowRadius:8}]}><View style={{flexDirection:'row',gap:5}}><View style={{width:17,height:17,borderRadius:9,backgroundColor:c.primary||model.primary,borderWidth:1,borderColor:'#fff'}}/><View style={{width:17,height:17,borderRadius:9,backgroundColor:c.secondary||model.secondary,borderWidth:1,borderColor:'#fff'}}/></View><Text style={{fontSize:7,color:'#fff',fontWeight:'800',textAlign:'center'}}>{c.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>سرعت انیمیشن</Text>
      <View style={{flexDirection:'row',gap:8}}>{NORA_MIC_ANIMATION_SPEEDS.map((v:any,i:number)=>{const active=Number(s.noraMicAnimationSpeed??1)===i;return <MagicPressable key={v.name} onPress={()=>setS({noraMicAnimationSpeed:i})} style={[{flex:1,minHeight:48,borderRadius:14,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',backgroundColor:'rgba(6,9,26,.78)',alignItems:'center',justifyContent:'center',padding:6},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.45,shadowRadius:8}]}><Text style={{color:'#fff',fontSize:10,fontWeight:'900'}}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>اندازه میکروفون</Text>
      <View style={{flexDirection:'row',gap:8}}>{NORA_MIC_SIZES.map((v:any,i:number)=>{const active=Number(s.noraMicSize??1)===i;return <MagicPressable key={v.name} onPress={()=>setS({noraMicSize:i})} style={[{flex:1,minHeight:56,borderRadius:14,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',backgroundColor:'rgba(6,9,26,.78)',alignItems:'center',justifyContent:'center',padding:6},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.45,shadowRadius:8}]}><View style={{width:v.diameter/2.8,height:v.diameter/2.8,borderRadius:v.diameter/5.6,borderWidth:1.5,borderColor:NORA_MIC_DESIGNS[Number(s.noraMicDesign||0)].primary,alignItems:'center',justifyContent:'center'}}><Ionicons name="mic" size={v.artwork/2.8} color={NORA_MIC_DESIGNS[Number(s.noraMicDesign||0)].primary}/></View><Text style={{color:'#fff',fontSize:9,fontWeight:'900',marginTop:4}}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>شدت هاله نوری</Text>
      <View style={{flexDirection:'row',gap:8}}>{NORA_MIC_GLOWS.map((v:any,i:number)=>{const active=Number(s.noraMicGlow??2)===i;return <MagicPressable key={v.name} onPress={()=>setS({noraMicGlow:i})} style={[{flex:1,minHeight:48,borderRadius:14,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',backgroundColor:'rgba(6,9,26,.78)',alignItems:'center',justifyContent:'center',padding:6},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.45,shadowRadius:8}]}><View style={{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:NORA_MIC_DESIGNS[Number(s.noraMicDesign||0)].primary,shadowColor:NORA_MIC_DESIGNS[Number(s.noraMicDesign||0)].primary,shadowOpacity:v.opacity,shadowRadius:v.radius}}/><Text style={{color:'#fff',fontSize:8,fontWeight:'900',marginTop:4}}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.muted}>تنظیمات بالا جداگانه ذخیره می‌شوند و با انتخاب شخصیت یا پس‌زمینه تغییر نمی‌کنند.</Text>
    </SelectionModal>}
    {modal==='composer'&&isNora&&<SelectionModal title="کادر پیام و ارسال نورا" onClose={()=>setModal(null)}>
      <Text style={styles.musicSettingTitle}>۵ مدل کادر نوشتن</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8}}>{NORA_COMPOSER_STYLES.map((v:any,i:number)=>{const active=Number(s.noraComposerStyle||0)===i;const cp=NORA_COMPOSER_PALETTES[Number(s.noraComposerPalette)||0];return <MagicPressable key={v.name} onPress={()=>setS({noraComposerStyle:i})} style={[{width:'48%',minHeight:72,padding:7,borderRadius:16,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'rgba(7,9,25,.7)'},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.4,shadowRadius:9}]}><View style={{width:'94%',height:34,borderRadius:v.radius,borderWidth:v.edge,borderStyle:v.borderStyle,borderColor:cp.frame,backgroundColor:v.fill,alignItems:'center',justifyContent:'center'}}><Text style={{color:'rgba(255,255,255,.78)',fontSize:8}}>پیام برای نورا…</Text></View><Text style={styles.modalCardText}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>۵ مدل دکمهٔ ارسال</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8}}>{NORA_SEND_BUTTONS.map((v:any,i:number)=>{const active=Number(s.noraSendStyle||0)===i;const cp=NORA_COMPOSER_PALETTES[Number(s.noraComposerPalette)||0];const radius=v.shape==='orb'?25:v.shape==='pill'?20:v.shape==='diamond'?7:v.shape==='square'?10:17;return <MagicPressable key={v.name} onPress={()=>setS({noraSendStyle:i})} style={[{width:'31.5%',minHeight:76,borderRadius:16,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center',gap:5,backgroundColor:'rgba(7,9,25,.7)'},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.4,shadowRadius:9}]}><View style={{width:42,height:42,borderRadius:radius,borderWidth:1.5,borderColor:cp.send,backgroundColor:'rgba(99,232,255,.08)',alignItems:'center',justifyContent:'center',transform:v.shape==='diamond'?[{rotate:'45deg'}]:undefined}}><Ionicons name={v.icon as any} size={19} color={cp.send} style={v.shape==='diamond'?{transform:[{rotate:'-45deg'}]}:undefined}/></View><Text style={styles.modalCardText}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>رنگ قاب و دکمه ارسال</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'}}>{NORA_COMPOSER_PALETTES.map((v:any,i:number)=>{const active=Number(s.noraComposerPalette||0)===i;return <MagicPressable key={v.name} onPress={()=>setS({noraComposerPalette:i})} style={[{width:96,minHeight:58,borderRadius:14,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',backgroundColor:'rgba(7,9,25,.75)',alignItems:'center',justifyContent:'center',gap:5,padding:5},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.42,shadowRadius:8}]}><View style={{flexDirection:'row',gap:8}}><View style={{width:19,height:19,borderRadius:10,backgroundColor:v.frame}}/><View style={{width:19,height:19,borderRadius:10,backgroundColor:v.send}}/></View><Text style={{color:'#fff',fontSize:7,fontWeight:'800',textAlign:'center'}}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>اندازه نوشته</Text><View style={{flexDirection:'row',gap:8}}>{[{label:'کوچک',value:0,size:11},{label:'معمولی',value:1,size:13},{label:'درشت',value:2,size:15}].map(v=>{const active=Number(s.noraComposerFontSize??1)===v.value;return <MagicPressable key={v.label} onPress={()=>setS({noraComposerFontSize:v.value})} style={[{flex:1,minHeight:48,borderRadius:13,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center'},active&&{borderWidth:2}]}><Text style={{color:'#fff',fontSize:v.size,fontWeight:'900'}}>{v.label}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>ارتفاع کادر پیام</Text><View style={{flexDirection:'row',gap:8}}>{NORA_COMPOSER_SIZES.map((v:any,i:number)=>{const active=Number(s.noraComposerHeight??1)===i;return <MagicPressable key={v.name} onPress={()=>setS({noraComposerHeight:i})} style={[{flex:1,minHeight:48,borderRadius:13,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center'},active&&{borderWidth:2}]}><Text style={{color:'#fff',fontSize:10,fontWeight:'900'}}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>اندازه دکمه ارسال</Text><View style={{flexDirection:'row',gap:8}}>{NORA_SEND_SIZES.map((v:any,i:number)=>{const active=Number(s.noraSendSize??1)===i;const cp=NORA_COMPOSER_PALETTES[Math.max(0,Math.min(NORA_COMPOSER_PALETTES.length-1,Number(s.noraComposerPalette)||0))];const selectedSend=NORA_SEND_BUTTONS[Math.max(0,Math.min(NORA_SEND_BUTTONS.length-1,Number(s.noraSendStyle)||0))];return <MagicPressable key={v.name} onPress={()=>setS({noraSendSize:i})} style={[{flex:1,minHeight:54,borderRadius:13,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center',gap:3},active&&{borderWidth:2}]}><View style={{width:v.size*.48,height:v.size*.48,borderRadius:10,borderWidth:1,borderColor:cp.send,alignItems:'center',justifyContent:'center'}}><Ionicons name={selectedSend.icon as any} size={v.size*.28} color={cp.send}/></View><Text style={{color:'#fff',fontSize:9,fontWeight:'900'}}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View>
      <Text style={styles.musicSettingTitle}>متن راهنمای کادر پیام</Text><TextInput value={String(s.noraComposerPlaceholder||'پیام برای نورا…')} onChangeText={v=>setS({noraComposerPlaceholder:v})} placeholder="متن راهنما" placeholderTextColor="rgba(255,255,255,.4)" style={styles.input} returnKeyType="done" maxLength={64}/>
      <MagicPressable style={styles.saveButton} onPress={()=>setModal(null)}><Ionicons name="checkmark-circle" size={20} color="#fff"/><Text style={styles.saveButtonText}>پایان شخصی‌سازی</Text></MagicPressable>
    </SelectionModal>}
    {modal==='icon'&&<SelectionModal title="آیکن بالای صفحه" onClose={()=>setModal(null)}><View style={styles.modalGrid}>{(page==='ai'?NORA_ICON_PRESETS.map((src:any)=>src):(CUSTOM_PAGE_ICON_ASSETS[page]||[])).map((src:any,i:number)=>{const active=iconPreset===i&&!s.pageIconGallery?.[page];return <MagicPressable key={i} onPress={()=>{setS({pageIconPreset:{...(s.pageIconPreset||{}),[page]:i},pageIconGallery:{...(s.pageIconGallery||{}),[page]:null},pageIconGalleryKind:{...(s.pageIconGalleryKind||{}),[page]:null}});setModal(null)}} style={[styles.presetIconCard,active&&styles.presetIconCardActive,{borderColor:iconColor}]}><Image source={src} style={styles.noraPresetImage} resizeMode="contain"/><Text style={styles.modalCardText}>{page==='ai'?NORA_ICON_NAMES[i]||`آیکن ${i+1}`:`طرح اختصاصی ${i+1}`}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View><View style={styles.settingsActions}><Option icon="image" label="تصویر آیکن از گالری" onPress={async()=>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(!r.canceled&&r.assets?.[0]?.uri){const saved=await persistGalleryUri(r.assets[0].uri,`${page}_icon_image`,r.assets[0].fileName||undefined,r.assets[0].mimeType||undefined);setS({pageIconGallery:{...(s.pageIconGallery||{}),[page]:saved},pageIconGalleryKind:{...(s.pageIconGalleryKind||{}),[page]:'image'}});setModal(null)}}} color="#72ffc5" active={s.pageIconGalleryKind?.[page]==='image'}/><Option icon="images" label="GIF آیکن از گالری" onPress={async()=>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(!r.canceled&&r.assets?.[0]?.uri){const asset=r.assets[0];if(!isGifAsset(asset)){Alert.alert('GIF لازم است','برای آیکن GIF یک فایل با فرمت GIF انتخاب کن.');return;}const saved=await persistGalleryUri(asset.uri,`${page}_icon_gif`,asset.fileName||undefined,asset.mimeType||undefined);setS({pageIconGallery:{...(s.pageIconGallery||{}),[page]:saved},pageIconGalleryKind:{...(s.pageIconGalleryKind||{}),[page]:'gif'}});setModal(null)}}} color="#ff79c8" active={s.pageIconGalleryKind?.[page]==='gif'}/></View></SelectionModal>}
    {modal==='color'&&<SelectionModal title="رنگ آیکن صفحه" onClose={()=>setModal(null)}><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:9}}>{ICON_COLORS.map((c,i)=>{const active=iconColor.toLowerCase()===c.toLowerCase();return <MagicPressable key={c} accessibilityRole="button" accessibilityLabel={`رنگ ${ICON_COLOR_NAMES[i]}`} onPress={()=>{setS({pageIconColor:{...(s.pageIconColor||{}),[page]:c}});setModal(null)}} style={[styles.presetIconCard,active&&styles.presetIconCardActive,{width:104,borderColor:active?'#72ffc5':c}]}><View style={{width:34,height:34,borderRadius:17,backgroundColor:c,borderWidth:1,borderColor:'#fff'}}/><Text style={styles.modalCardText}>{ICON_COLOR_NAMES[i]}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View></SelectionModal>}
    {modal==='speaker'&&page==='galaxy'&&<SelectionModal title="تصویر اسپیکر کهکشانی" onClose={()=>setModal(null)}>
      <View style={{alignItems:'center',padding:10,borderRadius:17,borderWidth:1,borderColor:'rgba(178,140,255,.36)',backgroundColor:'rgba(8,9,27,.72)'}}>
        <GalaxyFiberPreview effect={Number(s.galaxyEffect)||0} color={s.galaxySpeakerColor||'#63e8ff'} preset={0} height={178} small imageUri={s.galaxySpeakerImageUri} imageKind={s.galaxySpeakerImageKind||'image'} brightness={Number(s.galaxyBrightness??75)} speed={Number(s.galaxySpeed??55)} enabled motion={s.galaxyFiberMotion!==false} glow={s.galaxyFiberGlow!==false}/>
        <Text style={styles.modalCardText}>{s.galaxySpeakerImageUri?'تصویر انتخاب‌شده از گالری':'تصویر اختصاصی کوروش نوا'}</Text>
      </View>
      <View style={{flexDirection:'row',gap:8,marginTop:10}}>
        <MagicPressable style={[styles.galleryMiniButton,{flex:1}]} onPress={async()=>{try{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(!r.canceled&&r.assets?.[0]){const a=r.assets[0];const saved=await persistGalleryUri(a.uri,'galaxy_speaker',a.fileName||undefined,a.mimeType||undefined);setS({galaxySpeakerImageUri:saved,galaxySpeakerImageKind:isGifAsset(a)?'gif':'image'});setModal(null)}}catch{Alert.alert('گالری','انتخاب تصویر انجام نشد.')}}}><Ionicons name="images" size={23} color="#fff"/><Text style={styles.galleryMiniText}>انتخاب از گالری</Text></MagicPressable>
        <MagicPressable style={[styles.galleryMiniButton,{flex:1}]} onPress={()=>{setS({galaxySpeakerImageUri:null,galaxySpeakerImageKind:'image',galaxySpeakerPreset:0});setModal(null)}}><Ionicons name="refresh" size={23} color="#fff"/><Text style={styles.galleryMiniText}>طرح اختصاصی</Text></MagicPressable>
      </View>
    </SelectionModal>}
    {modal==='effect'&&<SelectionModal title="افکت آیکن" onClose={()=>setModal(null)}><View style={styles.modalGrid}>{[['pulse','تپش نور'],['rotate','چرخش آرام'],['effect','هاله رنگی'],['brightness','درخشش'],['wave','موج درخشان']].map(([ic,l],i)=><MagicPressable key={l} onPress={()=>{setS({pageIconEffect:{...(s.pageIconEffect||{}),[page]:i}});setModal(null)}} style={[styles.presetIconCard,effect===i&&styles.presetIconCardActive,{borderColor:iconColor}]}>{page==='ai'?<Image source={NORA_ICON_PRESETS[iconPreset%NORA_ICON_PRESETS.length]} style={styles.noraEffectPreview}/>:<Ionicons name={icons[ic] as any} size={31} color={iconColor}/>}<Text style={styles.modalCardText}>{l}</Text>{effect===i&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>)}</View></SelectionModal>}
  </ScrollView></View></SafeAreaView>
}
function SelectionModal({title,onClose,children,compact=false}:{title:string;onClose:()=>void;children?:React.ReactNode;compact?:boolean}){return <Modal transparent animationType="fade" statusBarTranslucent={false} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={[styles.modalCard,compact&&styles.modalCardCompact]}><View style={styles.modalHead}><Text style={styles.modalTitle}>{title}</Text><MagicPressable onPress={onClose} style={styles.modalClose}><Image source={CONTROL_ART.closeCustom} resizeMode="contain" style={{width:25,height:25}}/></MagicPressable></View><ScrollView bounces={!compact} contentContainerStyle={compact?styles.modalBodyCompact:styles.modalBody}>{children}</ScrollView></View></View></Modal>}

function labelFor(id:PageId){return PAGES.find(x=>x[0]===id)?.[1]||'اتاق مخفی'}

function BluetoothRings({enabled,connected,onPress}:{enabled:boolean;connected:boolean;onPress:()=>void}){
  const pulse=useRef(new Animated.Value(.86)).current;
  useEffect(()=>{
    pulse.stopAnimation();
    if(enabled){
      pulse.setValue(.86);
      const l=Animated.loop(Animated.sequence([
        Animated.timing(pulse,{toValue:1.08,duration:720,useNativeDriver:true}),
        Animated.timing(pulse,{toValue:.86,duration:720,useNativeDriver:true})
      ]));
      l.start();
      return()=>l.stop();
    }
    pulse.setValue(.82);
  },[enabled,pulse]);
  const color=enabled?'#39ff78':'#56dfff';
  const rings=[0,1,2,3];
  return <MagicPressable accessibilityRole="button" accessibilityLabel={enabled?'خاموش کردن یا تنظیم Bluetooth':'روشن کردن Bluetooth'} onPress={onPress} style={styles.btPowerCluster}>
    {rings.map((r)=><Animated.View key={r} pointerEvents="none" style={[styles.btRing,{width:104+r*21,height:104+r*21,borderRadius:52+r*10.5,borderColor:color,shadowColor:color,opacity:(enabled?0.9-r*.12:0.42-r*.06),transform:[{scale:pulse}]}]} />)}
    <View pointerEvents="none" style={[styles.btCore,{borderColor:color,shadowColor:color,backgroundColor:enabled?'rgba(20,90,48,.28)':'rgba(8,12,34,.72)'}]}><Image source={UI_ICONS.bluetooth} resizeMode="contain" style={[styles.btCoreIcon,{tintColor:color}]}/><Text style={styles.heroStatus}>{connected?'متصل':enabled?'Bluetooth روشن':'Bluetooth خاموش'}</Text></View>
  </MagicPressable>
}
function MusicDefaultArtwork({preset=0,size=214}:{preset?:number;size?:number}){
  const p=MUSIC_ART_PRESETS[((Number(preset)||0)%MUSIC_ART_PRESETS.length+MUSIC_ART_PRESETS.length)%MUSIC_ART_PRESETS.length];
  return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#080b20',borderWidth:2,borderColor:p.color,overflow:'hidden',shadowColor:p.color,shadowOpacity:.55,shadowRadius:20,alignItems:'center',justifyContent:'center'}}>
    <Image source={p.image} resizeMode="cover" style={{width:size,height:size}}/>
    <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:size/2,borderWidth:2,borderColor:p.color,backgroundColor:'rgba(4,7,24,.10)'}}/>
  </View>;
}
function MusicEffectVisual({index,size=76,playing=false,style}:{index:number;size?:number;playing?:boolean;style?:any}){
  const phase=useRef(new Animated.Value(0)).current;
  useEffect(()=>{phase.stopAnimation();if(!playing){phase.setValue(.25);return;}phase.setValue(0);const loop=Animated.loop(Animated.timing(phase,{toValue:1,duration:1500+(index%4)*380,useNativeDriver:true}));loop.start();return()=>loop.stop();},[phase,index,playing]);
  const p=Number(index)||0;const color=MUSIC_EFFECT_COLORS[p%MUSIC_EFFECT_COLORS.length];const rotate=phase.interpolate({inputRange:[0,1],outputRange:['0deg',p%2?'-360deg':'360deg']});const pulse=phase.interpolate({inputRange:[0,.5,1],outputRange:[.64,1,.64]});
  const base={width:size,height:size,alignItems:'center' as const,justifyContent:'center' as const,overflow:'hidden' as const,borderRadius:Math.max(10,size*.18),backgroundColor:'rgba(4,7,24,.9)',borderWidth:1,borderColor:`${color}88`};
  const rings=Array.from({length:3},(_,i)=><Animated.View key={i} style={{position:'absolute',width:size*(.34+i*.25),height:size*(.34+i*.25),borderRadius:size, borderWidth:Math.max(1,size*.018),borderColor:i%2?color:'#fff',opacity:playing?pulse:.72,transform:[{rotate}]}}/>);
  const bars=Array.from({length:13},(_,i)=><View key={i} style={{width:Math.max(2,size*.035),height:size*(.12+(((i*5+p*3)%11)/15)),borderRadius:size*.04,backgroundColor:i%4===0?'#fff':color,opacity:.92}}/>);
  const dots=Array.from({length:24},(_,i)=>{const x=((i*37+p*11)%97)/100*size;const y=((i*23+p*17)%91)/100*size;return <Animated.View key={i} style={{position:'absolute',left:x,top:y,width:Math.max(2,size*.04),height:Math.max(2,size*.04),borderRadius:size,backgroundColor:i%5===0?'#fff':color,opacity:playing?pulse:.8}}/>});
  const orbits=Array.from({length:3},(_,i)=><Animated.View key={i} style={{position:'absolute',width:size*(.9-i*.17),height:size*(.28+i*.08),borderWidth:1,borderColor:i%2?color:'#fff',borderRadius:size,transform:[{rotate: i*58+'deg'}, {rotate:playing?rotate:'0deg'}],opacity:.8}}/>);
  return <View style={[base,style]}>
    {p%4===0? <>{rings}<View style={{width:size*.18,height:size*.18,borderRadius:size,borderWidth:2,borderColor:'#fff',backgroundColor:color,shadowColor:color,shadowOpacity:.9,shadowRadius:10}}/></>:
     p%4===1? <>{orbits}<View style={{width:size*.12,height:size*.12,borderRadius:size,backgroundColor:color}}/></>:
     p%4===2? <View style={{width:'84%',height:'76%',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:Math.max(1,size*.015)}}>{bars}</View>:
     <>{dots}<Animated.View style={{position:'absolute',width:size*.74,height:size*.14,borderTopWidth:2,borderBottomWidth:2,borderColor:color,transform:[{rotate:playing?rotate:'-20deg'}],opacity:.9}}/></>}
  </View>
}
function MusicArtwork({s,setS,onSecret}:{s:any;setS:(p:any)=>void;onSecret:()=>void}){
  const spin=useRef(new Animated.Value(0)).current;
  const burst=useRef(new Animated.Value(0)).current;
  const tapTimer=useRef<any>(null);
  // Once the fifth tap is reached, ignore extra taps until navigation fires;
  // otherwise a quick sixth tap could cancel the entry timer.
  const secretEntryTriggered=useRef(false);
  const [tapStage,setTapStage]=useState(0);
  const [tapFx,setTapFx]=useState(0);
  const [tapPulse,setTapPulse]=useState(false);
  const {width}=useWindowDimensions();
  useEffect(()=>{spin.stopAnimation();if(!s.playing){spin.setValue(0);return;}spin.setValue(0);const loop=Animated.loop(Animated.timing(spin,{toValue:1,duration:9000,easing:Easing.linear,useNativeDriver:true}));loop.start();return()=>loop.stop();},[spin,s.playing]);
  useEffect(()=>()=>{if(tapTimer.current)clearTimeout(tapTimer.current)},[]);
  const rotate=spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const effectIndex=Math.max(0,Math.min(MUSIC_EFFECT_NAMES.length-1,Number(s.musicVisualEffect)||0));
  const uri=s.musicArtworkUri; const isGif=s.musicArtworkMode==='gif';
  const fireFx=(stage:number)=>{
    setTapFx(((stage-1+Math.max(0,Math.min(4,Number(s.secretTapEffect)||0)))%5)+1);setTapPulse(true);burst.stopAnimation();burst.setValue(0);
    Animated.sequence([Animated.timing(burst,{toValue:1,duration:stage===5?880:stage===4?760:480,easing:Easing.out(Easing.cubic),useNativeDriver:true}),Animated.delay(90)]).start(()=>setTapPulse(false));
  };
  const handleArtworkTap=()=>{
    if(secretEntryTriggered.current)return;
    const nowStage=(tapStage%5)+1;
    setTapStage(nowStage);setS({secretTapProgress:nowStage});fireFx(nowStage);
    if(tapTimer.current)clearTimeout(tapTimer.current);
    if(nowStage>=5){
      secretEntryTriggered.current=true;
      setS({secretTapProgress:5});
      tapTimer.current=setTimeout(()=>{setTapStage(0);setS({secretTapProgress:0});onSecret();},1000);
      return;
    }
    tapTimer.current=setTimeout(()=>{setTapStage(0);setS({secretTapProgress:0});},2400);
  };
  const pulse=burst.interpolate({inputRange:[0,.18,.5,1],outputRange:[.2,1.3,.96,1.7]});
  const fxOpacity=burst.interpolate({inputRange:[0,.08,.6,1],outputRange:[0,1,.9,0]});
  const fxSpin=burst.interpolate({inputRange:[0,1],outputRange:['0deg',`${tapFx%2?180:360}deg`]});
  const fxColor=['#63e8ff','#ff79c8','#ffd166','#72ffc5','#b28cff'][Math.max(0,tapFx-1)%5];
  return <View style={{alignItems:'center'}}>
    <MagicPressable accessibilityRole="button" accessibilityLabel="صفحه‌ی چرخان موسیقی؛ با پنج لمس پیاپی درِ اتاق خاطرات باز می‌شود" onPress={handleArtworkTap} magicColor={fxColor} style={styles.musicArtwork}>
      <Animated.View style={[styles.musicArtworkSpin,{transform:[{rotate}]}]}>{uri?<ExpoImage source={{uri,isAnimated:isGif}} contentFit="cover" autoplay={isGif} style={styles.musicArtworkImage}/>:<MusicDefaultArtwork preset={Number(s.musicArtworkPreset)||0} size={214}/>}</Animated.View>
      <MusicEffectVisual index={effectIndex} size={214} playing={!!s.playing} style={{position:'absolute',width:214,height:214,borderRadius:107,opacity:.52,borderWidth:0,backgroundColor:'transparent'}}/>
      <View style={styles.musicOrbit}/>
      {tapPulse&&<View pointerEvents="none" style={styles.secretTapFxLayer}>
        {tapFx===1&&<Animated.View style={[styles.secretTapBlast,{borderColor:fxColor,opacity:fxOpacity,transform:[{scale:pulse}]}]}/>}
        {tapFx===2&&[0,1,2].map(i=><Animated.View key={i} style={[styles.secretTapRing,{borderColor:i===1?'#fff':fxColor,opacity:fxOpacity,transform:[{scale:burst.interpolate({inputRange:[0,1],outputRange:[.15,1.5+i*.22]})}]}]}/>)}
        {tapFx===3&&<Animated.View style={[styles.secretTapOrbit,{borderColor:fxColor,opacity:fxOpacity,transform:[{rotate:fxSpin},{scale:pulse}]}]}/>}
        {tapFx===4&&Array.from({length:10},(_,i)=><Animated.View key={i} style={[styles.secretTapRay,{backgroundColor:i%2?'#fff':fxColor,opacity:fxOpacity,transform:[{rotate:`${i*36}deg`},{scaleY:pulse}]}]}/>)}
        {tapFx===5&&<><Animated.View style={[styles.secretTapBlast,{borderColor:'#fff',borderWidth:5,opacity:fxOpacity,transform:[{scale:pulse}]}]}/><Animated.View style={[styles.secretTapOrbit,{borderColor:fxColor,borderWidth:4,opacity:fxOpacity,transform:[{rotate:fxSpin},{scale:pulse}]}]}/></>}
      </View>}
      <View style={styles.musicArtworkCore}><Ionicons name="musical-notes" size={30} color="#fff"/><View style={styles.secretLockHint}><Ionicons name="lock-closed" size={16} color="#ffd166"/></View></View>
    </MagicPressable>
    {tapStage>0&&<View style={[styles.secretTapProgress,{borderColor:fxColor,shadowColor:fxColor}]}><Text style={styles.secretTapProgressText}>{['','پالس نوا بیدار شد','حلقه‌ی خاطره روشن شد','مدار پنهان فعال شد','قفل نورانی آماده است','دروازه بیدار شد'][tapStage]}  ·  {tapStage}/5</Text><View style={styles.secretTapProgressDots}>{[1,2,3,4,5].map(i=><View key={i} style={[styles.secretTapProgressDot,{backgroundColor:i<=tapStage?fxColor:'rgba(255,255,255,.18)',shadowColor:fxColor}]}/>)}</View></View>}
  </View>;
}

async function sendDualLightCommand(s:any, wifiCommand:string, wifiArgs:any, bleCall:()=>Promise<boolean>):Promise<{ble:boolean;wifi:boolean}> {
  const [ble,wifi]=await Promise.all([
    s.connected ? Promise.resolve().then(bleCall).catch(()=>false) : Promise.resolve(false),
    s.wifiEsp32 === true && s.wifiBaseUrl ? WifiEsp32.command(s.wifiBaseUrl,wifiCommand,wifiArgs).catch(()=>false) : Promise.resolve(false),
  ]);
  return {ble,wifi};
}
async function sendDualSpeakerCommand(s:any, wifiCommand:string, wifiArgs:any, bleCall:()=>Promise<boolean>):Promise<boolean>{
  const r=await sendDualLightCommand(s,wifiCommand,wifiArgs,bleCall);
  return r.ble||r.wifi;
}
function Bluetooth({s,setS,requestSecureAction}:{s:any;setS:(p:any)=>void;requestSecureAction:(target:string,title:string,action:()=>void)=>void}){
  const [devices,setDevices]=useState<any[]>([]);const [scan,setScan]=useState(false);const [wifiState,setWifiState]=useState<any>(null);const [espBusy,setEspBusy]=useState(false);
  const refreshBluetooth=async()=>{try{setS({bluetoothEnabled:await LotusBle.isEnabled()});}catch{setS({bluetoothEnabled:false})}};
  const refreshWifi=async()=>{
    try{
      const n=await Network.getNetworkStateAsync();
      const phoneWifi=n.type===Network.NetworkStateType.WIFI&&n.isConnected===true;
      setWifiState(n);setS({wifi:phoneWifi});
      if(phoneWifi&&s.wifiBaseUrl){setEspBusy(true);const ok=await WifiEsp32.ping(s.wifiBaseUrl);setS({wifiEsp32:ok});setEspBusy(false);}else setS({wifiEsp32:false});
    }catch{setWifiState(null);setS({wifi:false,wifiEsp32:false});setEspBusy(false)}
  };
  useEffect(()=>{void refreshBluetooth();void refreshWifi();const wifiSub=Network.addNetworkStateListener(()=>void refreshWifi());const appSub=AppState.addEventListener('change',state=>{if(state==='active'){void refreshBluetooth();void refreshWifi();}});return()=>{wifiSub.remove();appSub.remove()}},[s.wifiBaseUrl]);
  const toggleBluetooth=async()=>{
    if(!(await btPermissions()))return;
    const enabled=await LotusBle.isEnabled();
    if(enabled){
      await LotusBle.openBluetoothSettings();
      return;
    }
    const ok=await LotusBle.requestEnable();
    await new Promise(r=>setTimeout(r,350));
    const actual=await LotusBle.isEnabled();
    setS({bluetoothEnabled:actual});
    if(!ok&&!actual) Alert.alert('Bluetooth','روشن‌کردن Bluetooth تأیید نشد.');
  };
  const runScan=async()=>{if(s.securityOptions?.childLock){Alert.alert('قفل کودک فعال است','جستجوی اتصال اسپیکر تا زمان آزادسازی قفل متوقف است.');return;}if(!(await btPermissions()))return;const enabled=await LotusBle.isEnabled();if(!enabled){const ok=await LotusBle.requestEnable();if(!ok)return;await new Promise(r=>setTimeout(r,350));}setS({bluetoothEnabled:true});setScan(true);try{setDevices(await LotusBle.scan())}catch{Alert.alert('بلوتوث','جستجو انجام نشد.')}finally{setScan(false)}};
  const connect=async(a:string)=>{if(s.securityOptions?.childLock){Alert.alert('قفل کودک فعال است','برای اتصال یا کنترل اسپیکر، والد مسئول باید قفل کودک را غیرفعال کند.');return;}if(!(await btPermissions()))return;const enabled=await LotusBle.isEnabled();if(!enabled){const ok=await LotusBle.requestEnable();if(!ok)return;await new Promise(r=>setTimeout(r,350));}const ok=await LotusBle.connect(a);setS({connected:ok,bluetoothEnabled:true})};
  const applyPower=async()=>{if(s.securityOptions?.childLock){Alert.alert('قفل کودک فعال است','برای کنترل اسپیکر، والد مسئول باید قفل کودک را در «رمز مشترک» غیرفعال کند.');return;}const n=!s.power;const result=await sendDualLightCommand(s,'light.power',{on:n},()=>LotusBle.power(n));if(!result.ble&&!result.wifi){Alert.alert('اسپیکر','هیچ اتصال فعالی فرمان روشن/خاموش را تأیید نکرد؛ وضعیت تغییر نکرد.');return}setS({power:n});};const togglePower=()=>{if(!s.power)requestSecureAction('speakerPower','تأیید برای روشن‌کردن اسپیکر',()=>void applyPower());else void applyPower();};
  const openWifi=async()=>{await LotusBle.openWifiPanel();setTimeout(()=>void refreshWifi(),900)};
  return <ScrollView contentContainerStyle={styles.pad}>
    <BluetoothRings enabled={!!s.bluetoothEnabled} connected={!!s.connected} onPress={()=>void toggleBluetooth()}/>
    <Text style={styles.btConnectionHint}>{s.connected?'Bluetooth به اسپیکر متصل است':s.bluetoothEnabled?'Bluetooth روشن است؛ برای اتصال جستجو کن':'برای کنترل اسپیکر، Bluetooth را از دایره بزرگ روشن کن'}</Text>
    <View style={styles.actionRow}>
      <IconButton name="power" label="روشن یا خاموش کردن اسپیکر" active={s.power} color={s.power?'#39ff78':'#ff79c8'} onPress={togglePower}/>
      <IconButton name="wifi" label={s.wifiEsp32?'Wi‑Fi اسپیکر متصل است':s.wifi?'Wi‑Fi گوشی روشن است':'باز کردن کنترل Wi‑Fi'} active={!!s.wifi} color={s.wifi?'#39ff78':'#63e8ff'} onPress={()=>void openWifi()}/>
      <IconButton name="scan" label={scan?'در حال جستجوی بلوتوث':'جستجوی بلوتوث'} active={scan} color="#ffd166" onPress={runScan}/>
    </View>
    <View style={styles.btWifiStatusCard}>
      <Image source={UI_ICONS.wifi} style={[styles.btWifiStatusIcon,{tintColor:s.wifiEsp32?'#39ff78':'#63e8ff'}]}/>
      <View style={{flex:1}}><Text style={styles.optionLabel}>{s.wifiEsp32?'Wi‑Fi اسپیکر در دسترس است':s.wifi?'Wi‑Fi گوشی روشن است؛ اسپیکر پاسخ نمی‌دهد':'Wi‑Fi گوشی فعال نیست'}</Text></View>
      <View style={[styles.btStatusLed,{backgroundColor:s.wifiEsp32?'#39ff78':'#ff4f6d',shadowColor:s.wifiEsp32?'#39ff78':'#ff4f6d'}]}/>
    </View>
    <View style={styles.optionList}>{devices.map(d=><MagicPressable key={d.address} accessibilityRole="button" accessibilityLabel={d.name||'دستگاه Bluetooth'} onPress={()=>connect(d.address)} style={({pressed})=>[styles.option,pressed&&styles.pressed]}><View style={[styles.optionIcon,{borderColor:'#56dfff',shadowColor:'#56dfff'}]}><Image source={UI_ICONS.bluetooth} resizeMode="contain" style={[styles.btDeviceIcon,{tintColor:'#56dfff'}]}/></View><View style={{flex:1}}><Text style={styles.optionLabel}>{d.name||'دستگاه Bluetooth'}</Text></View></MagicPressable>)}</View>
  </ScrollView>
}
function formatTrackDuration(value:number){const seconds=Math.max(0,Math.floor((Number(value)||0)/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
function Music({s,setS,onSecret,onEqualizer}:{s:any;setS:(p:any)=>void;onSecret:()=>void;onEqualizer:()=>void}){
  const [tracks,setTracks]=useState<MusicLibraryTrack[]>([]);
  const [loading,setLoading]=useState(true);
  const [permissionDenied,setPermissionDenied]=useState(false);
  const [lastError,setLastError]=useState('');
  const loadTracks=async()=>{
    setLoading(true);setLastError('');
    try{
      if(Platform.OS==='android'){
        const permission=Number(Platform.Version)>=33?'android.permission.READ_MEDIA_AUDIO':PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const result=await PermissionsAndroid.request(permission as any,{title:'دسترسی موسیقی آوای نوا',message:'برای نمایش خودکار آهنگ‌های موجود در گوشی، اجازه خواندن فایل‌های صوتی لازم است.',buttonPositive:'اجازه می‌دهم',buttonNegative:'فعلاً نه'});
        if(result!==PermissionsAndroid.RESULTS.GRANTED){setPermissionDenied(true);setTracks([]);return;}
      }
      const list=await DjAudio.listTracks();
      setTracks(Array.isArray(list)?list:[]);setPermissionDenied(false);if(Array.isArray(list)&&list.length)await DjAudio.setMusicQueue(list);
      const status=await DjAudio.getMusicStatus();
      if(status?.uri){setS({musicTrackUri:status.uri,musicTrackTitle:status.title||'',musicTrackArtist:status.artist||'',playing:!!status.playing});}
      else setS({playing:false});
    }catch{setLastError('فهرست موسیقی گوشی خوانده نشد. دوباره تلاش کن.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void loadTracks();},[]);
  useEffect(()=>{
    let active=true;
    const timer=setInterval(async()=>{
      try{
        const status=await DjAudio.getMusicStatus();
        if(!active)return;
        const uri=String(status?.uri||'');
        if(status?.loading)return;
        if(uri&&uri!==String(s.musicTrackUri||''))setS({musicTrackUri:uri,musicTrackTitle:status.title||'',musicTrackArtist:status.artist||'',playing:!!status.playing});
        else if(uri===String(s.musicTrackUri||'')&&!!status.playing!==!!s.playing)setS({playing:!!status.playing});
      }catch{}
    },1800);
    return()=>{active=false;clearInterval(timer)};
  },[s.playing,s.musicTrackUri]);
  const playTrack=async(track:MusicLibraryTrack)=>{
    try{
      if(Platform.OS==='android'&&Number(Platform.Version)>=33){try{const notify='android.permission.POST_NOTIFICATIONS';const granted=await PermissionsAndroid.check(notify as any);if(!granted)await PermissionsAndroid.request(notify as any,{title:'اعلان پخش آوای نوا',message:'برای نمایش کنترل‌های پخش هنگام خروج از برنامه، اجازه اعلان لازم است.',buttonPositive:'اجازه می‌دهم',buttonNegative:'بعداً'});}catch{}}
      await setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:true,interruptionMode:'doNotMix'} as any);
      await DjAudio.setMusicQueue(tracks);
      const localOk=await DjAudio.playMusicTrack(track.uri,track.title,track.artist||'');
      const wifiOk=s.wifiEsp32&&s.wifiBaseUrl?await WifiEsp32.uploadAndPlay(s.wifiBaseUrl,track.uri,track.title,track.artist||''):false;
      if(!localOk&&!wifiOk)throw new Error('no music transport available');
      setS({musicTrackUri:track.uri,musicTrackTitle:track.title,musicTrackArtist:track.artist||'',playing:true});
    }catch{Alert.alert('پخش آوای نوا','پخش آهنگ شروع نشد. این نسخه باید به‌صورت APK اندروید ساخته شود و دسترسی موسیقی فعال باشد.');setS({playing:false});}
  };
  const togglePlayback=async()=>{
    if(!s.musicTrackUri){if(tracks.length){await playTrack(tracks[0]);return;}Alert.alert('آوای نوا','ابتدا یک آهنگ از فهرست موسیقی گوشی انتخاب کن.');return;}
    try{
      await setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:true,interruptionMode:'doNotMix'} as any);
      const nextPlaying=!s.playing;
      const localOk=nextPlaying?await DjAudio.resumeMusic():await DjAudio.pauseMusic();
      const wifiOk=s.wifiEsp32&&s.wifiBaseUrl?await WifiEsp32.playback(s.wifiBaseUrl,nextPlaying?'resume':'pause'):false;
      if(!localOk&&!wifiOk)throw new Error('no music transport available');
      setS({playing:nextPlaying});
    }catch{Alert.alert('آوای نوا','کنترل پخش در دسترس نیست. آهنگ را دوباره از فهرست انتخاب کن.');setS({playing:false});}
  };
  const stepTrack=async(delta:number)=>{
    if(!tracks.length){Alert.alert('آوای نوا','فهرست آهنگ‌های گوشی خالی است.');return;}
    const currentIndex=tracks.findIndex(t=>t.uri===s.musicTrackUri);
    const startIndex=currentIndex<0?0:currentIndex;
    const nextIndex=(startIndex+delta+tracks.length)%tracks.length;
    await playTrack(tracks[nextIndex]);
  };
  const activeUri=String(s.musicTrackUri||'');
  return <ScrollView contentContainerStyle={styles.pad}>
    <MusicArtwork s={s} setS={setS} onSecret={onSecret}/>
    <Text style={styles.trackName}>{s.musicTrackTitle||'انتخاب آهنگ از گوشی'}</Text>
    <Text style={styles.muted}>{s.musicTrackArtist||'آوای نوا • کتابخانه موسیقی گوشی'}</Text>
    <View style={styles.actionRow}><IconButton name="prev" label="قبلی" showLabel={false} onPress={()=>void stepTrack(-1)}/><IconButton name={s.playing?'pause':'play'} label={s.playing?'مکث':'پخش'} showLabel={false} size={68} active={!!s.playing} onPress={()=>void togglePlayback()}/><IconButton name="next" label="بعدی" showLabel={false} onPress={()=>void stepTrack(1)}/></View>
    <View style={styles.optionList}>
      <Option icon="refresh" label={loading?'در حال خواندن آهنگ‌های گوشی…':'به‌روزرسانی فهرست موسیقی'} onPress={()=>void loadTracks()} active={loading} color="#63e8ff"/>
      {permissionDenied&&<Text style={styles.muted}>برای دیدن آهنگ‌های گوشی باید اجازهٔ دسترسی صوتی را تأیید کنی؛ سپس «به‌روزرسانی فهرست موسیقی» را بزن.</Text>}
      {!!lastError&&<Text style={styles.muted}>{lastError}</Text>}
      {!loading&&!permissionDenied&&tracks.length===0&&<Text style={styles.muted}>آهنگ قابل‌نمایشی در کتابخانه صوتی گوشی پیدا نشد. فایل‌ها باید در حافظه گوشی و در کتابخانه رسانه اندروید ثبت شده باشند.</Text>}
      {tracks.map(track=><Option key={track.id||track.uri} icon="music" label={track.title} active={activeUri===track.uri} onPress={()=>void playTrack(track)} color={activeUri===track.uri?'#72ffc5':'#ff79c8'}><Text style={styles.muted}>{track.artist}  •  {formatTrackDuration(track.durationMs)}</Text></Option>)}
    </View>
  </ScrollView>
}
function usbName(uri:string){try{const clean=String(uri||'').split('?')[0].replace(/\/+$/,'');const last=clean.substring(clean.lastIndexOf('/')+1);return decodeURIComponent(last.replace(/\+/g,' '))||'بدون نام';}catch{return 'بدون نام'}}
const USB_AUDIO_EXT=['mp3','wav','m4a','aac','flac','ogg','opus','wma','amr'];
const USB_IMAGE_EXT=['jpg','jpeg','png','webp','gif','bmp','heic'];
const USB_VIDEO_EXT=['mp4','mkv','webm','3gp','avi','mov'];
function usbExt(name:string){const m=String(name||'').toLowerCase().match(/\.([a-z0-9]{2,6})$/);return m?.[1]||'';}
function UsbWaveform({playing,bars,color='#ffd166'}:{playing:boolean;bars:number[];color?:string}){
  const phase=useRef(new Animated.Value(0)).current;
  useEffect(()=>{phase.stopAnimation();if(!playing){phase.setValue(.25);return;}phase.setValue(0);const l=Animated.loop(Animated.timing(phase,{toValue:1,duration:900,useNativeDriver:true}));l.start();return()=>l.stop();},[playing,phase]);
  const vals=Array.from({length:30},(_,i)=>Math.max(5,Math.min(100,Number(bars[i%Math.max(1,bars.length)]||8))));
  return <View style={styles.usbWaveStage}>{vals.map((v,i)=>{const pulse=phase.interpolate({inputRange:[0,.5,1],outputRange:[0.65+(i%4)*.07,1,0.65+(i%4)*.07]});return <Animated.View key={i} style={[styles.usbWaveBar,{height:`${Math.max(7,v)}%`,backgroundColor:i%5===0?'#fff':color,opacity:playing?pulse:.72,transform:[{scaleY:playing?pulse:1}]}]}/>})}<View pointerEvents="none" style={[styles.usbWaveGlow,{backgroundColor:color,shadowColor:color,opacity:playing?.22:.08}]}/></View>;
}
function UsbTransportButton({name,label,onPress,active=false,color='#ffd166'}:{name:string;label:string;onPress:()=>void;active?:boolean;color?:string}){
  return <MagicPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.usbTransportButton,{borderColor:color,shadowColor:color},active&&{backgroundColor:`${color}22`,shadowOpacity:.75}]}><View style={[styles.usbTransportIcon,{borderColor:color,backgroundColor:'rgba(7,9,25,.86)'}]}><Ionicons name={name as any} size={26} color={color}/></View><Text style={[styles.usbTransportLabel,{color}]}>{label}</Text></MagicPressable>;
}
function UsbSettingsPanel({s,setS}:{s:any;setS:(p:any)=>void}){
  const [busy,setBusy]=useState(false);
  const chooseRoot=async()=>{if(Platform.OS!=='android'){Alert.alert('USB','دسترسی USB این صفحه مخصوص Android است.');return;}setBusy(true);try{const r=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(s.usbDirectoryUri||undefined);if(r.granted){setS({usbDirectoryUri:r.directoryUri});Alert.alert('گنجینه نوا','حافظه انتخاب شد. حالا «خواندن دوباره» را بزن.');}}catch{Alert.alert('گنجینه نوا','انتخاب حافظه انجام نشد.')}finally{setBusy(false)}};
  return <View style={styles.usbSettingsBox}>
    <Text style={styles.usbSettingsTitle}>تنظیمات اختصاصی USB</Text>
    <Option icon="usb" label={busy?'در حال بازکردن انتخاب حافظه…':'انتخاب حافظه / USB'} onPress={()=>void chooseRoot()} active={!!s.usbDirectoryUri} color="#ffd166"/>
    <View style={styles.usbSettingsRow}><Option icon="folder" label="خواندن پوشه‌های داخلی" onPress={()=>setS({usbRecursive:!s.usbRecursive})} active={!!s.usbRecursive} color="#63e8ff"/><Option icon="play" label="پخش خودکار آهنگ انتخاب‌شده" onPress={()=>setS({usbAutoPlay:!s.usbAutoPlay})} active={!!s.usbAutoPlay} color="#72ffc5"/></View>
    <View style={styles.usbSettingsRow}><Option icon="options" label={`مرتب‌سازی: ${s.usbSort==='name'?'نام':'نوع'}`} onPress={()=>setS({usbSort:s.usbSort==='name'?'type':'name'})} color="#b28cff"/><Option icon="wave" label={`حساسیت موج: ${s.usbWaveformSensitivity===1?'متوسط':s.usbWaveformSensitivity===2?'زیاد':'کم'}`} onPress={()=>setS({usbWaveformSensitivity:(Number(s.usbWaveformSensitivity)||1)>=2?0:(Number(s.usbWaveformSensitivity)||1)+1})} color="#ff79c8"/></View>
    <Text style={styles.muted}>USB با انتخاب پوشه از سیستم Android خوانده می‌شود؛ وقتی حافظه USB وصل باشد، در همان پنجره انتخاب حافظه قابل انتخاب است.</Text>
  </View>;
}
function UsbPage({s,setS}:{s:any;setS:(p:any)=>void}){
  type UsbItem={uri:string;name:string;isDirectory:boolean;ext:string};
  const [rootUri,setRootUri]=useState<string|null>(s.usbDirectoryUri||null);
  const [currentUri,setCurrentUri]=useState<string|null>(s.usbDirectoryUri||null);
  const [stack,setStack]=useState<string[]>([]);
  const [items,setItems]=useState<UsbItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState<'music'|'folders'|'images'|'all'>('music');
  const [selectedIndex,setSelectedIndex]=useState(-1);
  const [playing,setPlaying]=useState(false);
  const [bars,setBars]=useState<number[]>([]);
  const scanDirectory=async(uri:string|null)=>{if(!uri){setItems([]);return;}setLoading(true);try{const walk=async(dir:string,depth:number):Promise<UsbItem[]>=>{const uris=await FileSystem.StorageAccessFramework.readDirectoryAsync(dir);const current=await Promise.all(uris.map(async u=>{let info:any={exists:true,isDirectory:false};try{info=await FileSystem.getInfoAsync(u);}catch{}return {uri:u,name:usbName(u),isDirectory:!!info.isDirectory,ext:usbExt(usbName(u))};}));if(!s.usbRecursive||depth>=3)return current;const nested:UsbItem[]=[];for(const item of current){if(item.isDirectory){try{nested.push(...await walk(item.uri,depth+1))}catch{}}}return current.concat(nested);};const list=await walk(uri,0);const filtered=s.usbSort==='type'?list.sort((a,b)=>`${a.isDirectory?'0':'1'}${a.ext}${a.name}`.localeCompare(`${b.isDirectory?'0':'1'}${b.ext}${b.name}`,'fa')):list.sort((a,b)=>a.name.localeCompare(b.name,'fa',{numeric:true,sensitivity:'base'}));setItems(filtered);}catch{setItems([]);Alert.alert('گنجینه نوا','این پوشه دیگر در دسترس نیست؛ حافظه USB را دوباره انتخاب کن.');}finally{setLoading(false)}};
  useEffect(()=>{if(s.usbDirectoryUri!==rootUri){setRootUri(s.usbDirectoryUri||null);setCurrentUri(s.usbDirectoryUri||null);setStack([]);setSelectedIndex(-1);}},[s.usbDirectoryUri]);
  useEffect(()=>{void scanDirectory(currentUri)},[currentUri,s.usbSort,s.usbRecursive]);
  useEffect(()=>{const sub=DjAudio.subscribe(setBars);return()=>sub.remove?.()},[]);
  useEffect(()=>{let alive=true;const t=setInterval(async()=>{try{const st=await DjAudio.getMusicStatus();if(!alive)return;setPlaying(!!st?.playing);if(st?.uri&&selectedIndex>=0){const match=items.findIndex(x=>x.uri===st.uri);if(match>=0)setSelectedIndex(match);}}catch{}},500);return()=>{alive=false;clearInterval(t)}},[items,selectedIndex]);
  const chooseRoot=async()=>{if(Platform.OS!=='android'){Alert.alert('گنجینه نوا','USB این بخش مخصوص Android است.');return;}try{const r=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(s.usbDirectoryUri||undefined);if(r.granted){setS({usbDirectoryUri:r.directoryUri});setRootUri(r.directoryUri);setCurrentUri(r.directoryUri);setStack([]);}}catch{Alert.alert('گنجینه نوا','انتخاب حافظه انجام نشد.')}};
  const enterFolder=(u:string)=>{setStack(v=>[...v,u]);setCurrentUri(u);setTab('all');setSelectedIndex(-1)};
  const goBackFolder=()=>{if(stack.length>1){const next=stack.slice(0,-1);setStack(next);setCurrentUri(next[next.length-1]);}else if(stack.length===1){setStack([]);setCurrentUri(rootUri);}};
  const visible=items.filter(x=>tab==='folders'?x.isDirectory:tab==='images'?!x.isDirectory&&USB_IMAGE_EXT.includes(x.ext):tab==='music'?!x.isDirectory&&USB_AUDIO_EXT.includes(x.ext):true);
  const musicVisible=items.filter(x=>!x.isDirectory&&USB_AUDIO_EXT.includes(x.ext));
  const playAt=async(index:number)=>{const track=musicVisible[index];if(!track)return;setSelectedIndex(items.findIndex(x=>x.uri===track.uri));const ok=await DjAudio.playMusicTrack(track.uri,track.name.replace(/\.[^.]+$/,''),'USB');if(!ok){Alert.alert('پخش USB','این فایل برای پخش آماده نشد.');return;}setPlaying(true);setS({musicTrackUri:track.uri,musicTrackTitle:track.name,musicTrackArtist:'USB',playing:true});};
  const toggle=async()=>{if(selectedIndex<0){if(musicVisible.length)await playAt(0);return;}if(playing){await DjAudio.pauseMusic();setPlaying(false);setS({playing:false});}else{await DjAudio.resumeMusic();setPlaying(true);setS({playing:true});}};
  const step=async(delta:number)=>{if(!musicVisible.length)return;const currentUri=selectedIndex>=0?items[selectedIndex]?.uri:s.musicTrackUri;const i=Math.max(0,musicVisible.findIndex(x=>x.uri===currentUri));await playAt((i+delta+musicVisible.length)%musicVisible.length)};
  const selected=selectedIndex>=0?items[selectedIndex]:null;
  return <ScrollView contentContainerStyle={styles.pad}>
    <View style={styles.usbHero}><View style={styles.usbHeroIcon}><Ionicons name="flash" size={42} color="#ffd166"/></View><View style={{flex:1}}><Text style={styles.usbHeroTitle}>{rootUri?'USB / حافظه متصل':'USB آماده اتصال'}</Text><Text style={styles.muted}>{rootUri?`پوشه فعلی: ${usbName(currentUri||rootUri)}`:'برای خواندن آهنگ‌ها، حافظه USB را از دکمه زیر انتخاب کن.'}</Text></View><View style={[styles.usbLed,{backgroundColor:rootUri?'#42ff7a':'#ff79c8',shadowColor:rootUri?'#42ff7a':'#ff79c8'}]}/></View>
    <View style={styles.usbTopActions}><Option icon="usb" label="انتخاب / تغییر USB" onPress={()=>void chooseRoot()} color="#ffd166" active={!!rootUri}/>{rootUri&&<Option icon="refresh" label={loading?'در حال خواندن…':'خواندن دوباره'} onPress={()=>void scanDirectory(currentUri)} color="#63e8ff" active={loading}/>}</View>
    <View style={styles.usbTabs}>{[['music','آهنگ‌ها','musical-notes'],['folders','پوشه‌ها','folder-open'],['images','تصاویر','images'],['all','همه فایل‌ها','grid']].map(([id,label,ic])=><MagicPressable key={id} onPress={()=>setTab(id as any)} style={[styles.usbTab,tab===id&&styles.usbTabActive]}><Ionicons name={ic as any} size={20} color={tab===id?'#06111a':'#ffd166'}/><Text style={[styles.usbTabText,tab===id&&{color:'#06111a'}]}>{label}</Text></MagicPressable>)}</View>
    {tab==='music'&&<View style={styles.usbNowCard}><Text style={styles.usbNowTitle}>{selected&&!selected.isDirectory?selected.name:'آهنگی انتخاب نشده'}</Text><UsbWaveform playing={playing} bars={bars}/><View style={styles.usbTransportRow}><UsbTransportButton name="play-skip-back" label="قبلی" onPress={()=>void step(-1)} color="#63e8ff"/><UsbTransportButton name={playing?'pause':'play'} label={playing?'مکث':'پخش'} onPress={()=>void toggle()} active={playing} color="#72ffc5"/><UsbTransportButton name="play-skip-forward" label="بعدی" onPress={()=>void step(1)} color="#ff79c8"/></View></View>}
    {stack.length>0&&<MagicPressable accessibilityLabel="بازگشت به پوشه قبل" onPress={goBackFolder} style={styles.usbBackFolder}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={{width:28,height:28}}/></MagicPressable>}
    {!rootUri?<View style={styles.usbEmpty}><Ionicons name="hardware-chip-outline" size={60} color="#ffd166"/><Text style={styles.usbEmptyTitle}>گنجینه USB هنوز انتخاب نشده</Text><Text style={styles.muted}>با انتخاب پوشه USB، آهنگ‌ها، پوشه‌ها و فایل‌های تصویر همین‌جا نمایش داده می‌شوند.</Text></View>:loading?<Text style={[styles.muted,{textAlign:'center',marginTop:20}]}>در حال خواندن حافظه…</Text>:visible.length===0?<View style={styles.usbEmpty}><Ionicons name={tab==='music'?'musical-notes-outline':'folder-open-outline'} size={52} color="#ffd166"/><Text style={styles.usbEmptyTitle}>موردی پیدا نشد</Text><Text style={styles.muted}>این پوشه برای بخش انتخاب‌شده فایل قابل نمایش ندارد.</Text></View>:<View style={styles.optionList}>{visible.map((item)=>{const idx=items.findIndex(x=>x.uri===item.uri);const isActive=selectedIndex===idx;return <MagicPressable key={item.uri} onPress={()=>{if(item.isDirectory){enterFolder(item.uri);return;}if(USB_AUDIO_EXT.includes(item.ext)){const mi=musicVisible.findIndex(x=>x.uri===item.uri);setSelectedIndex(items.findIndex(x=>x.uri===item.uri));if(s.usbAutoPlay)void playAt(mi);}}} style={[styles.usbFileRow,isActive&&styles.usbFileActive]}><View style={[styles.usbFileIcon,{borderColor:item.isDirectory?'#ffd166':USB_AUDIO_EXT.includes(item.ext)?'#72ffc5':USB_IMAGE_EXT.includes(item.ext)?'#ff79c8':'#63e8ff'}]}><Ionicons name={item.isDirectory?'folder-open':USB_AUDIO_EXT.includes(item.ext)?'musical-notes':USB_IMAGE_EXT.includes(item.ext)?'image':'document'} size={25} color={item.isDirectory?'#ffd166':USB_AUDIO_EXT.includes(item.ext)?'#72ffc5':USB_IMAGE_EXT.includes(item.ext)?'#ff79c8':'#63e8ff'}/></View><View style={{flex:1}}><Text style={styles.optionLabel} numberOfLines={1}>{item.name}</Text><Text style={styles.muted}>{item.isDirectory?'پوشه':item.ext.toUpperCase()||'فایل'}</Text></View>{USB_AUDIO_EXT.includes(item.ext)&&<Ionicons name={isActive&&playing?'volume-high':'play-circle-outline'} size={25} color={isActive?'#72ffc5':'#ffd166'}/>}</MagicPressable>})}</View>}
  </ScrollView>;
}

function Treasure(){return <ScrollView contentContainerStyle={styles.pad}><Text style={styles.sectionTitle}>گنجینه نوا</Text><View style={styles.grid}>{[['music','موسیقی گوشی'],['usb','USB'],['image','آلبوم تصاویر'],['gallery','گالری']].map(([ic,l])=><Option key={l} icon={ic} label={l}/>)}</View><Text style={styles.muted}>آلبوم فقط تصاویر را نشان می‌دهد؛ فایل‌های صوتی و افکت‌ها در آن نمایش داده نمی‌شوند.</Text></ScrollView>}


function hexFromHsl(h:number,s:number,l:number){
  const hh=((h%360)+360)%360/360, ss=Math.max(0,Math.min(100,s))/100, ll=Math.max(0,Math.min(100,l))/100;
  if(ss===0){const v=Math.round(ll*255);return `#${v.toString(16).padStart(2,'0').repeat(3)}`;}
  const hue2rgb=(p:number,q:number,t:number)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  const q=ll<.5?ll*(1+ss):ll+ss-ll*ss, p=2*ll-q;
  const r=Math.round(hue2rgb(p,q,hh+1/3)*255),g=Math.round(hue2rgb(p,q,hh)*255),b=Math.round(hue2rgb(p,q,hh-1/3)*255);
  return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}
function ColorWheelAppearancePreview({variant,size=112,active=false}:{variant:number;size?:number;active?:boolean}){
  const center=size/2;
  const outer=size*.39;
  const count=variant===3?54:variant===4?28:variant===1?48:variant===2?42:36;
  const nodes=Array.from({length:count},(_,i)=>{
    const t=i/count;
    const angle=t*Math.PI*2-Math.PI/2;
    const turns=variant===3?1.85:1;
    const radius=variant===3?size*(.16+.24*((i%18)/17)):outer;
    const x=center+Math.cos(angle*turns)*radius;
    const y=center+Math.sin(angle*turns)*radius;
    const hue=((i/count)*360+variant*37)%360;
    return {i,x,y,c:hexFromHsl(hue,100,52),angle:angle*180/Math.PI+90};
  });
  return <View pointerEvents="none" style={{width:size,height:size,borderRadius:size/2,alignItems:'center',justifyContent:'center',borderWidth:variant===1?2:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.18)',backgroundColor:'rgba(4,7,24,.92)',shadowColor:active?'#72ffc5':'#63e8ff',shadowOpacity:active?.65:.18,shadowRadius:active?14:7}}>
    {variant===1&&<View style={{position:'absolute',width:size*.64,height:size*.64,borderRadius:size, borderWidth:2,borderColor:'rgba(255,121,200,.48)'}}/>}
    {nodes.map(n=><View key={n.i} style={{position:'absolute',left:n.x-(variant===4?4:3.5),top:n.y-(variant===4?9:3.5),width:variant===4?8:7,height:variant===4?18:7,borderRadius:variant===4?5:4,backgroundColor:n.c,borderWidth:1,borderColor:'rgba(255,255,255,.72)',shadowColor:n.c,shadowOpacity:.85,shadowRadius:5,transform:[{rotate:`${n.angle}deg`}]}}/>)}
    <View style={{width:size*.38,height:size*.38,borderRadius:size,backgroundColor:'rgba(8,10,29,.96)',borderWidth:1.5,borderColor:active?'#72ffc5':'rgba(255,255,255,.25)',alignItems:'center',justifyContent:'center'}}>
      <View style={{width:size*.16,height:size*.16,borderRadius:size,backgroundColor:'#63e8ff',shadowColor:'#63e8ff',shadowOpacity:.9,shadowRadius:9}}/>
    </View>
  </View>;
}
function ColorWheelAppearanceSelector({value,onChange,accent='#63e8ff'}:{value:number;onChange:(v:number)=>void;accent?:string}){
  return <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:9}}>{COLOR_WHEEL_APPEARANCES.map(item=>{const active=value===item.id;return <MagicPressable key={item.id} accessibilityRole="button" accessibilityLabel={`ظاهر چرخ رنگ ${item.name}`} onPress={()=>onChange(item.id)} style={({pressed})=>[{width:108,minHeight:138,padding:8,borderRadius:17,borderWidth:1.2,borderColor:active?'#72ffc5':`${accent}88`,backgroundColor:active?'rgba(114,255,197,.10)':'rgba(8,9,27,.78)',alignItems:'center',justifyContent:'center',gap:7,shadowColor:active?'#72ffc5':accent,shadowOpacity:active?.45:.12,shadowRadius:10},pressed&&styles.pressed]}><ColorWheelAppearancePreview variant={item.id} size={82} active={active}/><Text style={styles.modalCardText}>{item.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>;
}
function TouchColorWheel({color,onChange,accent,variant=0}:{color:string;onChange:(c:string)=>void;accent:string;variant?:number}){
  const size=250, center=size/2, outer=112;
  const count=variant===3?84:variant===4?36:variant===1?64:variant===2?56:72;
  const dots=Array.from({length:count},(_,i)=>{
    const t=i/count;
    const a=t*Math.PI*2-Math.PI/2;
    const radius=variant===3?78+Math.sin(t*Math.PI*2*3)*26:variant===2?outer+(i%2?7:-2):variant===1?outer-(i%2?12:0):outer;
    const x=center+Math.cos(variant===3?a*1.15:a)*radius;
    const y=center+Math.sin(variant===3?a*1.15:a)*radius;
    return {i,x,y,c:hexFromHsl((t*360+variant*37)%360,100,variant===4?55:50),a};
  });
  const applyPoint=(x:number,y:number)=>{
    const dx=x-center,dy=y-center,r=Math.sqrt(dx*dx+dy*dy);
    if(r>outer+32||r<28)return;
    const angle=(Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2);
    const hue=angle/(Math.PI*2)*360;
    const saturation=Math.max(70,Math.min(100,(r/outer)*100));
    onChange(hexFromHsl(hue,saturation,50));
  };
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:e=>applyPoint(e.nativeEvent.locationX,e.nativeEvent.locationY),
    onPanResponderMove:e=>applyPoint(e.nativeEvent.locationX,e.nativeEvent.locationY),
    onPanResponderTerminationRequest:()=>false,
  }),[onChange,variant]);
  return <View style={{width:size,height:size,alignSelf:'center',marginTop:10,alignItems:'center',justifyContent:'center'}} {...responder.panHandlers} accessibilityRole="adjustable" accessibilityLabel="چرخ رنگ لمسی">
    <View pointerEvents="none" style={{position:'absolute',width:size-8,height:size-8,borderRadius:size/2,borderWidth:3,borderColor:'rgba(255,255,255,.28)',shadowColor:accent,shadowOpacity:.8,shadowRadius:26}}/>
    {variant===1&&<View pointerEvents="none" style={{position:'absolute',width:size-72,height:size-72,borderRadius:size/2,borderWidth:2,borderColor:'rgba(255,121,200,.55)',shadowColor:'#ff79c8',shadowOpacity:.55,shadowRadius:12}}/>}
    {variant===3&&<View pointerEvents="none" style={{position:'absolute',width:size*.68,height:size*.68,borderRadius:size/2,borderWidth:2,borderColor:'rgba(178,140,255,.55)',borderStyle:'dashed',transform:[{rotate:'24deg'}]}}/>}
    {dots.map(d=><View key={d.i} pointerEvents="none" style={{position:'absolute',left:d.x-(variant===4?7:10),top:d.y-(variant===4?15:10),width:variant===4?14:20,height:variant===4?30:20,borderRadius:variant===4?7:10,backgroundColor:d.c,borderWidth:1,borderColor:'rgba(255,255,255,.72)',shadowColor:d.c,shadowOpacity:.85,shadowRadius:6,transform:[{rotate:`${d.a*180/Math.PI+90}deg`}]}}/>)}
    <View pointerEvents="none" style={{width:118,height:118,borderRadius:59,backgroundColor:'rgba(6,8,26,.92)',borderWidth:2,borderColor:accent,alignItems:'center',justifyContent:'center',shadowColor:accent,shadowOpacity:.55,shadowRadius:20}}>
      <View style={{width:58,height:58,borderRadius:29,backgroundColor:color,borderWidth:2,borderColor:'#fff',shadowColor:color,shadowOpacity:1,shadowRadius:18}}/>
      <Text style={{color:'rgba(255,255,255,.75)',fontSize:8,fontWeight:'900',marginTop:6}}>لمس و انتخاب رنگ</Text>
    </View>
  </View>;
}
function MusicReactivePreview({mode,size=56,active=false}:{mode:number;size?:number;active?:boolean}){
  const c=active?'#72ffc5':mode===1?'#63e8ff':mode===2?'#ff79c8':'#ffd166';
  if(mode===1)return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:3}}>{[.35,.65,1,.52,.8].map((v,i)=><View key={i} style={{width:5,height:size*(.22+v*.45),borderRadius:3,backgroundColor:c,shadowColor:c,shadowOpacity:.7,shadowRadius:6}}/>)}</View>;
  if(mode===2)return <View style={{width:size,height:size,borderRadius:size/2,borderWidth:3,borderColor:c,alignItems:'center',justifyContent:'center',shadowColor:c,shadowOpacity:.65,shadowRadius:8}}><View style={{width:size*.52,height:size*.52,borderRadius:size/2,borderWidth:2,borderColor:'#63e8ff'}}/><View style={{position:'absolute',width:7,height:7,borderRadius:4,backgroundColor:'#fff',shadowColor:'#fff',shadowOpacity:1,shadowRadius:7}}/></View>;
  return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>{[0,1,2,3,4,5,6,7].map(i=><View key={i} style={{position:'absolute',width:3,height:size*.34,backgroundColor:i%2?'#fff':c,borderRadius:2,transform:[{rotate:`${i*22.5}deg`}]}}/>)}<View style={{width:12,height:12,borderRadius:6,backgroundColor:c,shadowColor:c,shadowOpacity:1,shadowRadius:10}}/></View>;
}
function MusicReactiveControls({value,onChange,accent,title='رقص نور هماهنگ با آهنگ'}:{value:number;onChange:(v:number)=>void;accent:string;title?:string}){
  return <View style={{marginTop:16,padding:12,borderRadius:19,borderWidth:1,borderColor:`${accent}66`,backgroundColor:'rgba(7,9,25,.68)'}}><Text style={styles.musicSettingTitle}>{title}</Text><Text style={[styles.muted,{textAlign:'center',marginBottom:9}]}>سه الگوی واکنش مستقیم به شدت و طیف صدای آهنگ</Text><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8}}>{MUSIC_REACTIVE_MODES.map(item=>{const active=value===item.id;return <MagicPressable key={item.id} onPress={()=>onChange(active?0:item.id)} style={({pressed})=>[{width:96,minHeight:102,padding:8,borderRadius:16,borderWidth:1.4,borderColor:active?'#72ffc5':`${accent}70`,backgroundColor:active?'rgba(114,255,197,.11)':'rgba(8,9,27,.82)',alignItems:'center',justifyContent:'center',gap:5,shadowColor:active?'#72ffc5':accent,shadowOpacity:active?.55:.14,shadowRadius:10},pressed&&styles.pressed]}><MusicReactivePreview mode={item.id} size={48} active={active}/><Ionicons name={item.icon as any} size={15} color={active?'#72ffc5':accent}/><Text style={styles.modalCardText}>{item.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>})}</View><Text style={[styles.muted,{textAlign:'center',marginTop:8}]}>{value?'فعال · با پخش آهنگ واکنش می‌دهد':'خاموش'}</Text></View>;
}
function useMusicReactiveLight({s,target,mode,color}:{s:any;target:'rgb'|'neon'|'galaxy';mode:number;color:string}){
  const barsRef=useRef<number[]>([]);
  const frameAtRef=useRef(0);
  const busyRef=useRef(false);
  useEffect(()=>{if(!mode){barsRef.current=[];frameAtRef.current=0;return;}const sub=DjAudio.subscribe(values=>{barsRef.current=Array.isArray(values)?values.map(v=>Math.max(0,Math.min(100,Number(v)||0))):[];frameAtRef.current=Date.now()});return()=>sub.remove?.()},[mode]);
  const connected=!!s.connected,wifi=!!s.wifiEsp32,wifiBaseUrl=String(s.wifiBaseUrl||'');
  useEffect(()=>{
    if(!mode||(!connected&&!wifi))return;
    let alive=true;
    const tick=async()=>{
      if(!alive||busyRef.current)return;
      const vals=barsRef.current;if(!vals.length||Date.now()-frameAtRef.current>280)return;
      const now=Date.now();
      const low=vals.slice(0,8).reduce((a,b)=>a+b,0)/Math.max(1,Math.min(8,vals.length));
      const mid=vals.slice(8,16).reduce((a,b)=>a+b,0)/Math.max(1,vals.slice(8,16).length);
      const high=vals.slice(16).reduce((a,b)=>a+b,0)/Math.max(1,vals.slice(16).length);
      const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
      const peak=Math.max(...vals);
      let r=0,g=0,b=0;
      if(mode===1){const base=color.match(/\w\w/g)?.map((x:string)=>parseInt(x,16))||[99,232,255];const gain=.22+.78*(avg/100);r=Math.round(base[0]*gain);g=Math.round(base[1]*gain);b=Math.round(base[2]*gain);}
      if(mode===2){r=Math.round(Math.min(255,low*2.45));g=Math.round(Math.min(255,mid*2.35));b=Math.round(Math.min(255,high*2.55));}
      if(mode===3){const hue=(now/11+peak*2.2)%360;const c=hexFromHsl(hue,100,Math.min(62,26+peak*.34));const base=c.match(/\w\w/g)?.map((x:string)=>parseInt(x,16))||[255,79,216];const gate=peak>24?1:.42;r=Math.round(base[0]*gate);g=Math.round(base[1]*gate);b=Math.round(base[2]*gate);}
      const command=target==='rgb'?'light.rgbColor':target==='neon'?'light.neonColor':'light.color';
      busyRef.current=true;
      try{await sendDualLightCommand({connected,wifiEsp32:wifi,wifiBaseUrl},command,{r,g,b,target:target==='neon'?'lotus':target},()=>LotusBle.color(r,g,b));}catch{}
      finally{busyRef.current=false;}
    };
    const timer=setInterval(()=>{void tick()},125);
    return()=>{alive=false;clearInterval(timer)};
  },[mode,color,connected,wifi,wifiBaseUrl,target]);
}

function RgbEffectButton({index,active,onPress,enabled=true}:{index:number;active:boolean;onPress:()=>void;enabled?:boolean}){
  const src=require(`./assets/ui_controls/rgb_effects/effect_${index+1}.png`);
  return <MagicPressable accessibilityRole="button" accessibilityLabel={`اجرای افکت RGB ${index+1}`} onPress={onPress} disabled={!enabled} style={({pressed})=>[{width:92,height:92,borderRadius:46,borderWidth:1.5,borderColor:active?'#72ffc5':enabled?'#63e8ff':'rgba(255,255,255,.18)',backgroundColor:'rgba(6,9,25,.72)',alignItems:'center',justifyContent:'center',shadowColor:active?'#72ffc5':'#63e8ff',shadowOpacity:active?.9:enabled?.35:.08,shadowRadius:active?20:10,elevation:active?10:4,opacity:enabled?1:.48},pressed&&styles.pressed]}><Image source={src} resizeMode="contain" style={{width:82,height:82}}/>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>;
}
function RgbPowerButton({asset,on,onPress,label,color}:{asset:any;on:boolean;onPress:()=>void;label:string;color:string}){
  return <MagicPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{width:118,height:118,borderRadius:59,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:on?color:'rgba(255,255,255,.22)',backgroundColor:'rgba(5,8,25,.72)',shadowColor:color,shadowOpacity:on?.85:.18,shadowRadius:on?24:9,elevation:on?12:5}}>
    <Image source={asset} resizeMode="contain" style={{width:104,height:104,opacity:on?1:.52}}/>
  </MagicPressable>;
}
function Rgb({s,setS}:{s:any;setS:(p:any)=>void}){
  const [tab,setTab]=useState(Math.max(0,Math.min(2,Number(s.rgbDefaultTab??0))));
  const [colorTarget,setColorTarget]=useState<'rgb'|'neon'>(s.rgbColorTarget==='neon'?'neon':'rgb');
  const accent=tab===0?'#63e8ff':tab===1?(colorTarget==='rgb'?'#63e8ff':'#ff79c8'):'#ff79c8';
  useMusicReactiveLight({s,target:'rgb',mode:Number(s.rgbMusicReactiveMode||0),color:String(s.rgbColor||'#7f8cff')});
  useMusicReactiveLight({s,target:'neon',mode:Number(s.neonMusicReactiveMode||0),color:String(s.neonColor||'#ff4fd8')});
  const setColor=async(c:string,target: 'rgb'|'neon'=colorTarget)=>{
    const key=target==='rgb'?'rgbColor':'neonColor';
    setS({[key]:c});
    const n=c.match(/\w\w/g)?.map((x:string)=>parseInt(x,16))||[127,140,255];
    if(target==='rgb'){
      await sendDualLightCommand(s,'light.rgbColor',{r:n[0],g:n[1],b:n[2]},()=>LotusBle.color(n[0],n[1],n[2]));
    }else{
      await sendDualLightCommand(s,'light.neonColor',{r:n[0],g:n[1],b:n[2],target:'lotus'},()=>LotusBle.color(n[0],n[1],n[2]));
    }
  };
  const toggleRgbPower=async()=>{
    const next=!s.rgbPower;
    const result=await sendDualLightCommand(s,'light.rgbPower',{on:next},()=>LotusBle.power(next));
    if(result.ble||result.wifi)setS({rgbPower:next});
    else Alert.alert('RGB چهار سیم','هیچ مسیر ارتباطی فعال فرمان را دریافت نکرد.');
  };
  const toggleNeonPower=async()=>{
    const next=!s.neonPower;
    const result=await sendDualLightCommand(s,'light.neonPower',{on:next,target:'lotus'},()=>LotusBle.power(next));
    if(result.ble||result.wifi)setS({neonPower:next});
    else Alert.alert('نئون','فرمان روشن/خاموش ارسال نشد؛ اتصال نئون را بررسی کن.');
  };
  const setFourWireEffect=async(i:number)=>{
    setS({rgbEffect:i});
    const result=await sendDualLightCommand(s,'light.mode',{id:i},async()=>{const powered=await LotusBle.power(true);const ok=await LotusBle.mode(i);return powered&&ok});
    if(result.ble||result.wifi)setS({rgbPower:true});else Alert.alert('RGB چهار سیم','افکت ارسال نشد؛ اتصال Bluetooth یا Wi‑Fi را بررسی کن.');
  };
  const setNeonEffect=async(e:any)=>{
    const index=EFFECT_FILES.findIndex(x=>x.id===e.id);
    if(index<0)return;
    setS({neonEffect:index});
    if(index<LOTUS_MODE_IDS.length){
      await setLotusMode(index);
    }
  };
  const setLotusMode=async(mode:number)=>{
    const safe=Math.max(0,Math.min(212,Math.round(mode)));
    setS({neonMode:safe,neonPower:true});
    const result=await sendDualLightCommand(s,'light.mode',{id:safe,target:'lotus'},()=>LotusBle.mode(safe));
    if(result.ble||result.wifi)setS({neonPower:true});
    else Alert.alert('نئون','حالت ارسال نشد؛ اتصال Bluetooth نئون را بررسی کن.');
  };
  const currentNeon=EFFECT_FILES[Math.max(0,Math.min(EFFECT_FILES.length-1,Number(s.neonEffect)||0))];
  return <View style={{flex:1}}>
    <View style={styles.tabs}>
      {[
        ['rgb','چهارسیمه','bulb-outline'],
        ['color','رنگ دلخواه','color-palette-outline'],
        ['neon','نئون','rainbow-outline']
      ].map(([id,label,ic],i)=><MagicPressable key={id} onPress={()=>{setTab(i);setS({rgbDefaultTab:i})}} style={[styles.tab,tab===i&&styles.tabActive,{borderColor:tab===i?accent:'rgba(255,255,255,.2)'}]}>
        <Ionicons name={ic as any} size={20} color={tab===i?accent:'#fff'}/><Text style={[styles.tabText,{color:tab===i?accent:'#fff'}]}>{label}</Text>
      </MagicPressable>)}
    </View>
    {tab===0&&<ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.rgbPowerStage}>
        <RgbPowerButton asset={require('./assets/ui_controls/rgb_power.png')} on={!!s.rgbPower} onPress={()=>void toggleRgbPower()} label="روشن و خاموش کردن RGB چهار سیم" color="#63e8ff"/>
        <View style={{alignItems:'center',marginTop:8}}><Text style={styles.optionLabel}>RGB چهار سیم</Text><Text style={styles.muted}>{s.rgbPower?'روشن و فعال':'خاموش'}</Text></View>
      </View>
      <View style={styles.effectGrid}>{Array.from({length:6},(_,i)=><RgbEffectButton key={i} index={i} active={Number(s.rgbEffect||0)===i} enabled={!!s.rgbPower} onPress={()=>void setFourWireEffect(i)}/>)}</View>
      <MusicReactiveControls value={Number(s.rgbMusicReactiveMode||0)} onChange={v=>setS({rgbMusicReactiveMode:v})} accent="#63e8ff" title="سه مدل رقص نور RGB با آهنگ"/>
      <Slider label="روشنایی" value={s.brightness} onChange={async(v)=>{setS({brightness:v});await sendDualLightCommand(s,'light.brightness',{value:Math.round(v*2.55)},()=>LotusBle.brightness(Math.round(v)))}}/>
      <Slider label="سرعت افکت" value={s.speed} onChange={async(v)=>{setS({speed:v});await sendDualLightCommand(s,'light.speed',{value:Math.round(v*2.55)},()=>LotusBle.speed(Math.round(v)))}}/>
    </ScrollView>}
    {tab===1&&<ScrollView contentContainerStyle={styles.pad}>
      <View style={{flexDirection:'row',justifyContent:'center',gap:18,marginBottom:4}}>
        <RgbPowerButton asset={require('./assets/ui_controls/rgb_power.png')} on={colorTarget==='rgb'} onPress={()=>{setColorTarget('rgb');setS({rgbColorTarget:'rgb'})}} label="انتخاب کنترل رنگ RGB چهار سیم" color="#63e8ff"/>
        <RgbPowerButton asset={require('./assets/ui_controls/neon_power.png')} on={colorTarget==='neon'} onPress={()=>{setColorTarget('neon');setS({rgbColorTarget:'neon'})}} label="انتخاب کنترل رنگ نئون" color="#ff79c8"/>
      </View>
      <Text style={{color:accent,fontSize:11,fontWeight:'900',textAlign:'center',marginTop:3}}>{colorTarget==='rgb'?'رنگ دلخواه RGB چهار سیم':'رنگ دلخواه نئون'}</Text>
      <TouchColorWheel color={String(colorTarget==='rgb'?s.rgbColor:s.neonColor||'#ff4fd8')} onChange={(c)=>void setColor(c,colorTarget)} accent={accent} variant={Number(s.rgbWheelStyle||0)}/>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8,marginTop:8}}>
        {[['قرمز','#ff304f'],['نارنجی','#ff9d35'],['زرد','#ffe05c'],['سبز','#42ff8a'],['فیروزه‌ای','#35d8ff'],['آبی','#3978ff'],['بنفش','#9c4dff'],['صورتی','#ff4fd8'],['سفید','#ffffff'],['آبی مه‌آلود','#7f8cff']].map(([name,c])=><MagicPressable key={c} onPress={()=>void setColor(c,colorTarget)} style={[styles.presetIconCard,{width:92,borderColor:String(colorTarget==='rgb'?s.rgbColor:s.neonColor||'#ff4fd8').toLowerCase()===String(c).toLowerCase()?'#72ffc5':c}]}><View style={{width:32,height:32,borderRadius:16,backgroundColor:c,borderWidth:1,borderColor:'#fff'}}/><Text style={styles.modalCardText}>{name}</Text>{String(colorTarget==='rgb'?s.rgbColor:s.neonColor||'#ff4fd8').toLowerCase()===String(c).toLowerCase()&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>)}
      </View>
    </ScrollView>}
    {tab===2&&<ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.rgbPowerStage}>
        <RgbPowerButton asset={require('./assets/ui_controls/neon_power.png')} on={!!s.neonPower} onPress={()=>void toggleNeonPower()} label="روشن و خاموش کردن نئون" color="#ff79c8"/>
        <View style={{alignItems:'center',marginTop:8}}><Text style={styles.optionLabel}>نئون</Text><Text style={styles.muted}>{s.neonPower?'روشن و فعال':'خاموش'}</Text></View>
      </View>
      <View style={{padding:12,borderRadius:18,borderWidth:1,borderColor:'rgba(255,121,200,.35)',backgroundColor:'rgba(8,9,27,.72)',marginBottom:12}}>
        <Text style={styles.musicSettingTitle}>حالت‌های واقعی نئون</Text>
        <Text style={[styles.muted,{textAlign:'center',marginBottom:10}]}>۲۱۳ حالت کنترل مستقیم؛ انتخاب هر حالت همان فرمان حالت واقعی را ارسال می‌کند.</Text>
        <View style={styles.effectGridWide}>{LOTUS_MODE_IDS.map(mode=><MagicPressable key={mode} onPress={()=>void setLotusMode(mode)} style={[styles.gifCard,{minHeight:54,borderColor:Number(s.neonMode||0)===mode?'#72ffc5':'rgba(255,121,200,.35)',backgroundColor:Number(s.neonMode||0)===mode?'rgba(114,255,197,.12)':'rgba(7,9,25,.8)'}]}><View style={{alignItems:'center',justifyContent:'center',gap:3}}><Ionicons name="color-wand-outline" size={18} color={Number(s.neonMode||0)===mode?'#72ffc5':'#ff79c8'}/><Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>حالت {mode+1}</Text></View>{Number(s.neonMode||0)===mode&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={11} color="#06111a"/></View>}</MagicPressable>)}</View>
      </View>
      <View style={{padding:12,borderRadius:18,borderWidth:1,borderColor:'rgba(178,140,255,.32)',backgroundColor:'rgba(8,9,27,.72)',marginBottom:12}}>
        <Text style={styles.musicSettingTitle}>گالری کامل افکت‌های نئون</Text>
        <Text style={[styles.muted,{textAlign:'center',marginBottom:10}]}>تمام ۲۸۹ تصویر افکت داخل برنامه قرار گرفته‌اند؛ ۲۱۳ مورد اول به حالت‌های قابل‌کنترل متناظر متصل‌اند و بقیه در گالری تصویری باقی می‌مانند.</Text>
        <View style={styles.neonHero}>{currentNeon?<ExpoImage source={currentNeon.source} contentFit="cover" autoplay isAnimated style={styles.neonHeroImg}/>:<Ionicons name="rainbow-outline" size={80} color="#fff"/>}</View>
        <View style={styles.effectGridWide}>{EFFECT_FILES.map((e,i)=><MagicPressable key={e.id} onPress={()=>void setNeonEffect(e)} style={[styles.gifCard,Number(s.neonEffect)===i&&styles.gifSelected]} accessibilityLabel={`پیش‌نمایش افکت نئون ${e.id}`}><ExpoImage source={e.source} contentFit="cover" autoplay isAnimated style={styles.gifImg}/></MagicPressable>)}</View>
      </View>
      <Slider label="روشنایی نئون" value={s.neonBrightness??s.brightness} onChange={async(v)=>{setS({neonBrightness:v});await sendDualLightCommand(s,'light.brightness',{value:Math.round(v*2.55),target:'lotus'},()=>LotusBle.brightness(Math.round(v)))}}/>
      <MusicReactiveControls value={Number(s.neonMusicReactiveMode||0)} onChange={v=>setS({neonMusicReactiveMode:v})} accent="#ff79c8" title="سه مدل رقص نور نئون با آهنگ"/>
      <Slider label="سرعت نئون" value={s.neonSpeed??s.speed} onChange={async(v)=>{setS({neonSpeed:v});await sendDualLightCommand(s,'light.speed',{value:Math.round(v*2.55),target:'lotus'},()=>LotusBle.speed(Math.round(v)))}}/>
    </ScrollView>}
  </View>;
}
function Slider({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){return <View style={styles.slider}><View style={styles.sliderHead}><Text style={styles.optionLabel}>{label}</Text><Text style={styles.muted}>{Math.round(value)}%</Text></View><View style={styles.sliderTrack}>{Array.from({length:21},(_,i)=><MagicPressable key={i} onPress={()=>onChange(i*5)} style={[styles.sliderDot,i*5<=value&&styles.sliderDotOn]}/>)}</View></View>}


const GALAXY_SPEAKER_PRESETS=[
  {name:'کوروش نوا · کهکشان',model:'korosh-nova-custom',description:'اسپیکر اختصاصی کوروش نوا'}
];
const GALAXY_COLOR_PRESETS=[
  {name:'آبی یخی',value:'#35d8ff'}, {name:'بنفش نوا',value:'#9c4dff'},
  {name:'صورتی کهکشانی',value:'#ff4fd8'}, {name:'سبز شفق',value:'#42ff8a'},
  {name:'طلایی ستاره‌ای',value:'#ffe05c'}, {name:'سفید مهتاب',value:'#ffffff'},
  {name:'آبی عمیق',value:'#3978ff'}, {name:'نارنجی شعله',value:'#ff9d35'},
  {name:'قرمز انرژی',value:'#ff304f'}, {name:'فیروزه‌ای',value:'#72ffc5'}
];
const GALAXY_EFFECT_COLORS=['#63e8ff','#8b5cf6','#ff4fd8','#ffd166','#72ffc5','#3d9cff'];
const GALAXY_EFFECT_ICONS=[require('./assets/galaxy/effects/galaxy_effect_01.png'),require('./assets/galaxy/effects/galaxy_effect_02.png'),require('./assets/galaxy/effects/galaxy_effect_03.png'),require('./assets/galaxy/effects/galaxy_effect_04.png'),require('./assets/galaxy/effects/galaxy_effect_05.png'),require('./assets/galaxy/effects/galaxy_effect_06.png'),require('./assets/galaxy/effects/galaxy_effect_07.png'),require('./assets/galaxy/effects/galaxy_effect_08.png'),require('./assets/galaxy/effects/galaxy_effect_09.png'),require('./assets/galaxy/effects/galaxy_effect_10.png'),require('./assets/galaxy/effects/galaxy_effect_11.png'),require('./assets/galaxy/effects/galaxy_effect_12.png'),require('./assets/galaxy/effects/galaxy_effect_13.png'),require('./assets/galaxy/effects/galaxy_effect_14.png'),require('./assets/galaxy/effects/galaxy_effect_15.png'),require('./assets/galaxy/effects/galaxy_effect_16.png'),require('./assets/galaxy/effects/galaxy_effect_17.png'),require('./assets/galaxy/effects/galaxy_effect_18.png'),require('./assets/galaxy/effects/galaxy_effect_19.png'),require('./assets/galaxy/effects/galaxy_effect_20.png'),require('./assets/galaxy/effects/galaxy_effect_21.png'),require('./assets/galaxy/effects/galaxy_effect_22.png'),require('./assets/galaxy/effects/galaxy_effect_23.png'),require('./assets/galaxy/effects/galaxy_effect_24.png'),require('./assets/galaxy/effects/galaxy_effect_25.png'),require('./assets/galaxy/effects/galaxy_effect_26.png'),require('./assets/galaxy/effects/galaxy_effect_27.png'),require('./assets/galaxy/effects/galaxy_effect_28.png'),require('./assets/galaxy/effects/galaxy_effect_29.png'),require('./assets/galaxy/effects/galaxy_effect_30.png')];
const GALAXY_FEATURED_EFFECTS=[0,1,2];
function GalaxyLightField({index,color,width,height,animate=true}:{index:number;color:string;width:number;height:number;animate?:boolean}){
  const phase=useRef(new Animated.Value(0)).current;
  useEffect(()=>{phase.stopAnimation();if(!animate){phase.setValue(.2);return;}phase.setValue(0);const loop=Animated.loop(Animated.timing(phase,{toValue:1,duration:Math.max(1500,6200-(index%7)*520),useNativeDriver:true}));loop.start();return()=>loop.stop();},[phase,index,animate]);
  const pulse=phase.interpolate({inputRange:[0,.5,1],outputRange:[.58,1,.58]});const spin=phase.interpolate({inputRange:[0,1],outputRange:['0deg',index%2?'-360deg':'360deg']});const sweep=phase.interpolate({inputRange:[0,1],outputRange:[-width*.4,width*.4]});const mode=Math.abs(index)%6;const min=Math.min(width,height);
  const dots=Array.from({length:26},(_,i)=>{const x=((i*37+index*13)%97)/100*width;const y=((i*23+index*19)%93)/100*height;return <Animated.View key={i} style={{position:'absolute',left:x,top:y,width:Math.max(2,min*.026),height:Math.max(2,min*.026),borderRadius:min,backgroundColor:i%4===0?'#fff':GALAXY_EFFECT_COLORS[(i+index)%GALAXY_EFFECT_COLORS.length],shadowColor:color,shadowOpacity:.85,shadowRadius:5,opacity:animate?pulse:.88}}/>});
  const rings=Array.from({length:4},(_,i)=><Animated.View key={i} style={{position:'absolute',width:min*(.22+i*.2),height:min*(.22+i*.2),borderRadius:min,borderWidth:Math.max(1,min*.012),borderColor:i%2?color:'#ffffff',opacity:animate?pulse:.7,transform:[{rotate:spin}]}}/>);
  const bars=Array.from({length:Math.max(11,Math.min(23,Math.floor(width/5)))},(_,i)=><Animated.View key={i} style={{width:Math.max(2,width*.012),height:height*(.12+(((i*5+index*7)%13)/16)),borderRadius:3,backgroundColor:i%4===0?'#fff':color,shadowColor:color,shadowOpacity:.85,shadowRadius:4,opacity:animate?pulse:.85,transform:[{scaleY:animate?pulse:1}]}}/>);
  const orbits=Array.from({length:3},(_,i)=><Animated.View key={i} style={{position:'absolute',width:width*(.58+i*.1),height:height*(.25+i*.08),borderWidth:1.5,borderColor:i%2?color:'#fff',borderRadius:min,opacity:animate?pulse:.76,transform:[{rotate:(i*55)+'deg'},{rotate:spin}]}}/>);
  return <View pointerEvents="none" style={{width,height,position:'relative',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{mode===0?<>{rings}<View style={{width:min*.09,height:min*.09,borderRadius:min,backgroundColor:color,shadowColor:color,shadowOpacity:1,shadowRadius:12}}/></>:mode===1?<>{dots}<Animated.View style={{position:'absolute',width:width*.9,height:height*.05,backgroundColor:color,opacity:.3,transform:[{rotate:'-28deg'},{translateX:sweep}]}}/></>:mode===2?<View style={{width:'95%',height:'92%',flexDirection:'row',alignItems:'center',justifyContent:'space-around'}}>{bars}</View>:mode===3?<>{orbits}<View style={{width:min*.08,height:min*.08,borderRadius:min,borderWidth:2,borderColor:'#fff',backgroundColor:color}}/></>:mode===4?<>{dots.slice(0,13)}<View style={{position:'absolute',width:width*.95,height:height*.18,borderTopWidth:2,borderBottomWidth:1,borderColor:color,transform:[{rotate:'14deg'}]}}/><View style={{position:'absolute',width:width*.9,height:height*.15,borderTopWidth:1,borderBottomWidth:2,borderColor:'#fff',transform:[{rotate:'-14deg'}]}}/></>:<>{rings.slice(0,3)}{bars.slice(0,Math.min(15,bars.length))}</>}</View>
}
const GALAXY_FIBER_POINTS=Array.from({length:260},(_,index)=>{
  const t=index/259;
  const seed1=Math.sin((index+11)*12.9898)*43758.5453;
  const seed2=Math.sin((index+31)*78.233)*19341.174;
  const rand1=seed1-Math.floor(seed1);
  const rand2=seed2-Math.floor(seed2);
  const x=.75-.50*t+Math.sin(t*Math.PI*2.7)*.065+(rand1-.5)*.20;
  const y=.075+.85*t+Math.cos(t*Math.PI*5.2)*.026+(rand2-.5)*.07;
  const size=index%17===0?3.1:index%5===0?2.25:1.35;
  return {index,x:Math.max(.245,Math.min(.755,x)),y:Math.max(.045,Math.min(.95,y)),size};
});
function GalaxyFiberPreview({effect,color,preset,small=false,animate=true,imageUri=null,imageKind='image',brightness=82,speed=55,enabled=true,motion=true,glow=true,height}:{effect:number;color:string;preset:number;small?:boolean;animate?:boolean;imageUri?:string|null;imageKind?:string;brightness?:number;speed?:number;enabled?:boolean;motion?:boolean;glow?:boolean;height?:number}){
  const phase=useRef(new Animated.Value(0)).current;
  const h=height||(small?110:215);
  const w=h*.447;
  const actualEffect=Math.max(0,Number(effect)||0);
  const mode=actualEffect%6;
  const intensity=Math.max(.08,Math.min(1,Number(brightness||82)/100));
  useEffect(()=>{
    phase.stopAnimation();
    if(!animate||!motion){phase.setValue(.38);return;}
    phase.setValue(0);
    const duration=Math.max(1700,Math.min(7600,7600-(Number(speed)||55)*58));
    const loop=Animated.loop(Animated.timing(phase,{toValue:1,duration,useNativeDriver:true,isInteraction:false}));
    loop.start();
    return()=>{loop.stop();phase.stopAnimation()};
  },[phase,animate,motion,speed]);
  const shimmer=phase.interpolate({inputRange:[0,.5,1],outputRange:[.26*intensity,.98*intensity,.26*intensity]});
  const sweep=phase.interpolate({inputRange:[0,1],outputRange:[-w*.75,w*.75]});
  const dots=GALAXY_FIBER_POINTS.slice(0,small?82:GALAXY_FIBER_POINTS.length).map((point)=>{
    const colorMode=mode===2||mode===3||mode===5;
    const dotColor=point.index%13===0?'#ffffff':colorMode?GALAXY_EFFECT_COLORS[(point.index+actualEffect)%GALAXY_EFFECT_COLORS.length]:(point.index%7===0?GALAXY_EFFECT_COLORS[(actualEffect+2)%GALAXY_EFFECT_COLORS.length]:color);
    const staticOpacity=enabled?Math.min(1,intensity*(.48+(point.index%5)*.12)):.10;
    return <Animated.View key={point.index} pointerEvents="none" style={{
      position:'absolute',left:`${point.x*100}%`,top:`${point.y*100}%`,
      width:point.size*(small?.72:1),height:point.size*(small?.72:1),borderRadius:5,
      backgroundColor:dotColor,shadowColor:dotColor,shadowOpacity:glow ? 0.95 : 0.3,shadowRadius:glow?point.size*3:1,
      opacity:animate&&motion&&enabled?shimmer:staticOpacity,
      transform:mode===4&&point.index%4===0?[{scale:animate&&motion?shimmer:1}]:undefined
    }}/>;
  });
  return <View style={{width:w,height:h,alignSelf:'center',position:'relative',overflow:'visible',shadowColor:color,shadowOpacity:glow ? 0.36 : 0.1,shadowRadius:glow?18:5,elevation:glow?6:1}}>
    <ExpoImage
      source={imageUri?{uri:imageUri}:GALAXY_SPEAKER_IMAGE}
      contentFit="fill"
      autoplay={imageKind==='gif'}
      isAnimated={imageKind==='gif'}
      transition={120}
      style={{width:'100%',height:'100%',borderRadius:small?8:15}}
    />
    <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,overflow:'hidden',borderRadius:small?8:15}}>
      {dots}
      {animate&&motion&&enabled&&(mode===1||mode===2||mode===4)&&<Animated.View pointerEvents="none" style={{
        position:'absolute',left:'23%',top:'49%',width:'57%',height:small?1.3:2.2,borderRadius:4,
        backgroundColor:mode===2?GALAXY_EFFECT_COLORS[(actualEffect+1)%GALAXY_EFFECT_COLORS.length]:color,
        shadowColor:color,shadowOpacity:glow?.9:.2,shadowRadius:glow?12:3,opacity:shimmer,
        transform:[{rotate:'-48deg'},{translateX:sweep}]
      }}/>}
      {!enabled&&<View style={[StyleSheet.absoluteFillObject,{backgroundColor:'rgba(1,2,11,.40)'}]}/>}
    </View>
    {glow&&<View pointerEvents="none" style={{position:'absolute',left:'24%',right:'24%',top:'4%',height:2,borderRadius:2,backgroundColor:color,opacity:enabled ? 0.65 : 0.12,shadowColor:color,shadowOpacity:.9,shadowRadius:8}}/>}
  </View>;
}
function GalaxyEffectTile({index,name,color,active,onPress}:{index:number;name:string;color:string;active:boolean;onPress:()=>void}){
  const icon=GALAXY_EFFECT_ICONS[index];
  return <MagicPressable key={index} accessibilityRole="button" accessibilityLabel={`اجرای افکت ${name}`} onPress={onPress} style={({pressed})=>[{width:108,minHeight:126,padding:7,borderRadius:15,borderWidth:1,borderColor:active?'#72ffc5':`${color}88`,backgroundColor:'rgba(8,9,27,.82)',alignItems:'center',justifyContent:'center',gap:5},active&&{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.7,shadowRadius:12},pressed&&styles.pressed]}>
    <View style={{width:88,height:65,borderRadius:11,borderWidth:1,borderColor:`${color}88`,overflow:'hidden',backgroundColor:'rgba(3,5,18,.9)'}}><Image source={icon} resizeMode="contain" style={{width:86,height:63}}/></View>
    <Text style={{color:'#fff',fontSize:9,fontWeight:'900',textAlign:'center'}}>{name}</Text>
    <Text style={{color:color,fontSize:7,fontWeight:'800'}}>افکت {index+1}</Text>
    {active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}
  </MagicPressable>;
}
function GalaxyPowerButton({enabled,onPress}:{enabled:boolean;onPress:()=>void}){
  return <MagicPressable accessibilityRole="button" accessibilityLabel={enabled?'خاموش کردن نور کهکشانی':'روشن کردن نور کهکشانی'} onPress={onPress} style={({pressed})=>[{width:80,height:80,borderRadius:40,borderWidth:1.5,borderColor:enabled?'#72ffc5':'rgba(178,140,255,.42)',backgroundColor:'rgba(5,7,23,.88)',alignItems:'center',justifyContent:'center',shadowColor:enabled?'#72ffc5':'#8b5cf6',shadowOpacity:enabled?.8:.25,shadowRadius:enabled?18:8,elevation:enabled?9:3},pressed&&styles.pressed]}>
    <Image source={GALAXY_POWER_IMAGE} resizeMode="contain" style={{width:74,height:74,opacity:enabled?1:.62}}/>
  </MagicPressable>;
}
function Galaxy({s,setS}:{s:any;setS:(p:any)=>void}){
  const [tab,setTab]=useState(()=>Math.max(0,Math.min(2,Number(s.galaxyDefaultTab)||0)));
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [draftColor,setDraftColor]=useState(String(s.galaxySpeakerColor||'#63e8ff'));
  const {height:windowHeight}=useWindowDimensions();
  const effect=Math.max(0,Math.min(29,Number(s.galaxyEffect)||0));
  const color=String(s.galaxySpeakerColor||'#63e8ff');
  useMusicReactiveLight({s,target:'galaxy',mode:Number(s.galaxyMusicReactiveMode||0),color});
  const preset=0;
  const galaxyPower=!!s.galaxyPower;
  const heroHeight=Math.max(260,Math.min(330,Math.round(windowHeight*.36)));
  const speakerHeight=Math.max(190,Math.min(226,heroHeight-66));
  useEffect(()=>setDraftColor(color),[color]);
  const sendCurrentColor=async(c:string)=>{
    const n=c.match(/\w\w/g)?.map((x:string)=>parseInt(x,16))||[99,232,255];
    const result=await sendDualLightCommand(s,'light.color',{r:n[0],g:n[1],b:n[2],target:'galaxy'},()=>LotusBle.color(n[0],n[1],n[2]));
    if(!result.ble&&!result.wifi)Alert.alert('رنگ کهکشانی','رنگ ذخیره شد؛ برای اعمال واقعی، اتصال اسپیکر را فعال کن.');
  };
  const setGalaxyColor=async(c:string)=>{
    setS({galaxySpeakerColor:c});
    setDraftColor(c);
    if(galaxyPower)await sendCurrentColor(c);
  };
  const applyEffect=async(i:number)=>{
    setS({galaxyEffect:i});
    if(!galaxyPower)return;
    const result=await sendDualLightCommand(s,'light.mode',{id:i,target:'galaxy'},()=>LotusBle.mode(i));
    if(!result.ble&&!result.wifi)Alert.alert('افکت کهکشانی','افکت ذخیره شد؛ برای اعمال واقعی، اتصال اسپیکر را فعال کن.');
  };
  const toggleGalaxyPower=async()=>{
    const next=!galaxyPower;
    const result=await sendDualLightCommand(s,'light.power',{on:next,target:'galaxy'},()=>LotusBle.power(next));
    if(!result.ble&&!result.wifi){
      Alert.alert('نور کهکشانی','برای روشن یا خاموش کردن واقعی، ابتدا Bluetooth یا Wi‑Fi اسپیکر را وصل کن.');
      return;
    }
    setS({galaxyPower:next});
    if(next){
      await sendCurrentColor(color);
      await sendDualLightCommand(s,'light.brightness',{value:Math.round(Number(s.galaxyBrightness??75)*2.55),target:'galaxy'},()=>LotusBle.brightness(Math.round(Number(s.galaxyBrightness??75))));
      await sendDualLightCommand(s,'light.speed',{value:Math.round(Number(s.galaxySpeed??55)*2.55),target:'galaxy'},()=>LotusBle.speed(Math.round(Number(s.galaxySpeed??55))));
      await sendDualLightCommand(s,'light.mode',{id:effect,target:'galaxy'},()=>LotusBle.mode(effect));
    }
  };
  const changeGalaxyBrightness=async(v:number)=>{
    setS({galaxyBrightness:v});
    if(galaxyPower){
      const result=await sendDualLightCommand(s,'light.brightness',{value:Math.round(v*2.55),target:'galaxy'},()=>LotusBle.brightness(Math.round(v)));
      if(!result.ble&&!result.wifi)Alert.alert('روشنایی کهکشانی','تنظیم ذخیره شد؛ اتصال اسپیکر فعال نیست.');
    }
  };
  const changeGalaxySpeed=async(v:number)=>{
    setS({galaxySpeed:v});
    if(galaxyPower){
      const result=await sendDualLightCommand(s,'light.speed',{value:Math.round(v*2.55),target:'galaxy'},()=>LotusBle.speed(Math.round(v)));
      if(!result.ble&&!result.wifi)Alert.alert('سرعت کهکشانی','تنظیم ذخیره شد؛ اتصال اسپیکر فعال نیست.');
    }
  };
  const toggleWheel=async(which:'galaxyWheelTop'|'galaxyWheelBottom')=>{
    const next=!s[which];setS({[which]:next});
    const ok=await sendDualSpeakerCommand(s,'light.scene',{id:next?(which==='galaxyWheelTop'?1:2):0},()=>LotusBle.scene(next?(which==='galaxyWheelTop'?1:2):0));
    if(!ok)Alert.alert('گردون کهکشانی','هیچ مسیر ارتباطی فعال فرمان را دریافت نکرد.');
  };
  const pickGalleryAsset=async(target:'speaker'|'background',kind:'image'|'gif')=>{
    try{
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
      if(result.canceled||!result.assets?.[0])return;
      const asset=result.assets[0];
      if(kind==='gif'&&!isGifAsset(asset)){Alert.alert('فایل GIF لازم است','یک تصویر متحرک GIF انتخاب کن.');return;}
      const saved=await persistGalleryUri(asset.uri,target==='speaker'?'galaxy_speaker':'galaxy_background',asset.fileName||undefined,asset.mimeType||undefined);
      const actualKind=isGifAsset(asset)?'gif':'image';
      if(target==='speaker')setS({galaxySpeakerImageUri:saved,galaxySpeakerImageKind:actualKind});
      else setS({galaxyPageBackgroundUri:saved,galaxyPageBackgroundKind:actualKind});
    }catch{Alert.alert('گالری','خواندن تصویر انجام نشد.');}
  };
  const resetGalaxyImage=(target:'speaker'|'background')=>{
    if(target==='speaker')setS({galaxySpeakerImageUri:null,galaxySpeakerImageKind:'image'});
    else setS({galaxyPageBackgroundUri:null,galaxyPageBackgroundKind:'image'});
  };
  const currentEffect=galaxyEffects[effect]||galaxyEffects[0];
  return <View style={{flex:1,backgroundColor:'#050817'}}>
    {!!s.galaxyPageBackgroundUri&&<ExpoImage source={{uri:String(s.galaxyPageBackgroundUri)}} contentFit="cover" autoplay={s.galaxyPageBackgroundKind==='gif'} isAnimated={s.galaxyPageBackgroundKind==='gif'} style={StyleSheet.absoluteFillObject}/>}
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject,{backgroundColor:s.galaxyPageBackgroundUri?'rgba(3,4,17,.78)':'rgba(3,4,17,.22)'}]}/>
    <ScrollView contentContainerStyle={styles.galaxyTopPreviewPad} style={{backgroundColor:'transparent'}}>
      <View style={[styles.galaxyTopThird,{minHeight:heroHeight,height:heroHeight}]}>
        <GalaxyFiberPreview effect={effect} color={color} preset={preset} height={speakerHeight} imageUri={s.galaxySpeakerImageUri} imageKind={s.galaxySpeakerImageKind} brightness={Number(s.galaxyBrightness??75)} speed={Number(s.galaxySpeed??55)} enabled={true} motion={s.galaxyFiberMotion!==false} glow={s.galaxyFiberGlow!==false}/>
        <MagicPressable accessibilityRole="button" accessibilityLabel="تنظیمات شخصی‌سازی کهکشانی" onPress={()=>setSettingsOpen(true)} style={({pressed})=>[{position:'absolute',right:7,top:4,width:40,height:40,borderRadius:20,borderWidth:1.2,borderColor:'rgba(178,140,255,.7)',backgroundColor:'rgba(5,7,23,.82)',alignItems:'center',justifyContent:'center',shadowColor:'#b28cff',shadowOpacity:.7,shadowRadius:10},pressed&&styles.pressed]}>
          <Ionicons name="settings-outline" size={22} color="#d9c6ff"/>
        </MagicPressable>
        <Text style={{color:'#fff',fontSize:11,fontWeight:'900',marginTop:3}}>{s.galaxySpeakerImageUri?'تصویر انتخاب‌شده از گالری':'کوروش نوا · کهکشان فیبرنوری'}</Text>
        <View style={styles.galaxyLiveBadge}>
          <View style={[styles.galaxyLiveDot,{backgroundColor:GALAXY_EFFECT_COLORS[effect%GALAXY_EFFECT_COLORS.length],opacity:galaxyPower?1:.45}]}/>
          <Text style={styles.muted}>{`افکت ${effect+1}: ${currentEffect} · ${galaxyPower?'روشن':'خاموش'}`}</Text>
        </View>
      </View>
      <View style={styles.tabs}>{[['color','انتخاب رنگ'],['effects','انتخاب افکت'],['wheels','گردون‌ها']].map(([id,l],i)=><MagicPressable key={id} onPress={()=>{setTab(i);setS({galaxyDefaultTab:i})}} style={[styles.tab,tab===i&&styles.tabActive]}><Ionicons name={(id==='color'?'color-palette-outline':id==='effects'?'color-wand-outline':'sync-outline') as any} size={20} color="#fff"/><Text style={styles.tabText}>{l}</Text></MagicPressable>)}</View>
      {tab===0&&<View style={styles.pad}>
        <Text style={styles.musicSettingTitle}>رنگ دلخواه پنل کهکشانی</Text>
        <TouchColorWheel color={draftColor} onChange={setDraftColor} accent="#b28cff" variant={Number(s.galaxyWheelStyle||0)}/>
        <Text style={[styles.muted,{textAlign:'center',marginTop:5}]}>رنگ انتخاب‌شده: {draftColor.toUpperCase()}</Text>
        <MagicPressable onPress={()=>void setGalaxyColor(draftColor)} style={({pressed})=>[{marginTop:9,minHeight:48,borderRadius:17,borderWidth:1.5,borderColor:'#b28cff',backgroundColor:'rgba(93,50,180,.25)',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,shadowColor:'#b28cff',shadowOpacity:.55,shadowRadius:12},pressed&&styles.pressed]}>
          <Ionicons name="checkmark-circle" size={21} color="#fff"/><Text style={styles.optionLabel}>اعمال رنگ دلخواه</Text>
        </MagicPressable>
        <Text style={[styles.musicSettingTitle,{marginTop:18}]}>رنگ‌های آماده</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:9,marginTop:12}}>{GALAXY_COLOR_PRESETS.map(item=>{
          const active=draftColor.toLowerCase()===item.value.toLowerCase();
          return <MagicPressable key={item.value} accessibilityRole="button" accessibilityLabel={`انتخاب رنگ ${item.name}`} onPress={()=>setDraftColor(item.value)} style={({pressed})=>[{width:104,minHeight:75,padding:8,borderRadius:14,borderWidth:1,borderColor:active?'#72ffc5':'rgba(255,255,255,.2)',backgroundColor:'rgba(8,9,27,.78)',alignItems:'center',justifyContent:'center',gap:5},active&&{borderWidth:2,shadowColor:item.value,shadowOpacity:.4,shadowRadius:8},pressed&&styles.pressed]}>
            <View style={{width:30,height:30,borderRadius:15,backgroundColor:item.value,borderWidth:1,borderColor:'#fff',shadowColor:item.value,shadowOpacity:.8,shadowRadius:8}}/>
            <Text style={{color:'#fff',fontSize:9,fontWeight:'800',textAlign:'center'}}>{item.name}</Text>
            {active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}
          </MagicPressable>;
        })}</View>
      </View>}
      {tab===1&&<View style={styles.pad}>
        <View style={{alignItems:'center',marginBottom:13,padding:11,borderRadius:19,borderWidth:1,borderColor:galaxyPower?'#72ffc5':'rgba(178,140,255,.4)',backgroundColor:'rgba(7,9,25,.76)',gap:7}}>
          <GalaxyPowerButton enabled={galaxyPower} onPress={()=>void toggleGalaxyPower()}/>
          <Text style={{color:galaxyPower?'#72ffc5':'#d9c6ff',fontSize:11,fontWeight:'900'}}>{galaxyPower?'نور کهکشانی روشن است':'نور کهکشانی خاموش است'}</Text>
        </View>
        <Text style={styles.musicSettingTitle}>همهٔ ۳۰ افکت کهکشانی</Text>
        <View style={styles.effectGrid}>{galaxyEffects.map((name,i)=><GalaxyEffectTile key={name} index={i} name={name} color={GALAXY_EFFECT_COLORS[i%GALAXY_EFFECT_COLORS.length]} active={effect===i} onPress={()=>void applyEffect(i)}/>)}</View>
        <Slider label="روشنایی کهکشانی" value={Number(s.galaxyBrightness??75)} onChange={v=>void changeGalaxyBrightness(v)}/>
        <MusicReactiveControls value={Number(s.galaxyMusicReactiveMode||0)} onChange={v=>setS({galaxyMusicReactiveMode:v})} accent="#b28cff" title="سه مدل رقص نور کهکشانی با آهنگ"/>
        <Slider label="سرعت افکت کهکشانی" value={Number(s.galaxySpeed??55)} onChange={v=>void changeGalaxySpeed(v)}/>
      </View>}
      {tab===2&&<View style={styles.pad}>
        <Text style={styles.musicSettingTitle}>کنترل گردون‌های نور</Text>
        {[['galaxyWheelTop','گردون بالایی','بالای اسپیکر'],['galaxyWheelBottom','گردون پایینی','زیر اسپیکر']].map(([key,name,desc])=>{
          const active=!!s[key];
          return <MagicPressable key={key} onPress={()=>void toggleWheel(key as any)} style={({pressed})=>[{marginTop:10,padding:12,borderRadius:16,borderWidth:1,borderColor:active?'#72ffc5':'rgba(178,140,255,.5)',backgroundColor:'rgba(8,9,27,.76)',flexDirection:'row',alignItems:'center',gap:12},pressed&&styles.pressed]}>
            <GalaxyLightField index={active?3:5} color={active?'#72ffc5':'#b28cff'} width={70} height={58} animate={active}/>
            <View style={{flex:1}}><Text style={{color:'#fff',fontSize:11,fontWeight:'900'}}>{name}</Text><Text style={styles.muted}>{desc} · {active?'روشن':'خاموش'}</Text></View>
            {active&&<Ionicons name="checkmark-circle" size={22} color="#72ffc5"/>}
          </MagicPressable>;
        })}
        <Slider label="سرعت گردون" value={Number(s.speed??55)} onChange={v=>setS({speed:v})}/>
      </View>}
    </ScrollView>
    <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={()=>setSettingsOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard,{maxHeight:'92%',width:'94%'}]}>
          <View style={styles.modalHead}><Text style={styles.modalTitle}>تنظیمات کهکشانی</Text><MagicPressable onPress={()=>setSettingsOpen(false)} style={styles.modalClose}><Image source={CONTROL_ART.closeCustom} resizeMode="contain" style={{width:25,height:25}}/></MagicPressable></View>
          <ScrollView contentContainerStyle={{paddingBottom:12,gap:10}}>
            <View style={{alignItems:'center',padding:10,borderRadius:18,borderWidth:1,borderColor:'rgba(178,140,255,.36)',backgroundColor:'rgba(5,8,25,.6)'}}>
              <GalaxyFiberPreview effect={effect} color={color} preset={preset} height={168} small imageUri={s.galaxySpeakerImageUri} imageKind={s.galaxySpeakerImageKind} brightness={Number(s.galaxyBrightness??75)} speed={Number(s.galaxySpeed??55)} enabled motion={s.galaxyFiberMotion!==false} glow={s.galaxyFiberGlow!==false}/>
              <Text style={styles.modalCardText}>{s.galaxySpeakerImageUri?'تصویر شخصی':'تصویر اختصاصی کوروش نوا'}</Text>
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              <MagicPressable style={[styles.galleryMiniButton,{flex:1}]} onPress={()=>void pickGalleryAsset('speaker','image')}><Ionicons name="images" size={24} color="#fff"/><Text style={styles.galleryMiniText}>تصویر اسپیکر از گالری</Text></MagicPressable>
              <MagicPressable style={[styles.galleryMiniButton,{flex:1}]} onPress={()=>resetGalaxyImage('speaker')}><Ionicons name="refresh" size={24} color="#fff"/><Text style={styles.galleryMiniText}>بازگشت به طرح اختصاصی</Text></MagicPressable>
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              <MagicPressable style={[styles.galleryMiniButton,{flex:1}]} onPress={()=>void pickGalleryAsset('background','image')}><Ionicons name="image" size={24} color="#fff"/><Text style={styles.galleryMiniText}>پس‌زمینه از گالری</Text></MagicPressable>
              <MagicPressable style={[styles.galleryMiniButton,{flex:1}]} onPress={()=>void pickGalleryAsset('background','gif')}><Ionicons name="color-wand" size={24} color="#fff"/><Text style={styles.galleryMiniText}>پس‌زمینه GIF</Text></MagicPressable>
            </View>
            <MagicPressable style={[styles.galleryMiniButton,{minHeight:48}]} onPress={()=>resetGalaxyImage('background')}><Ionicons name="refresh" size={20} color="#fff"/><Text style={styles.galleryMiniText}>حذف پس‌زمینهٔ شخصی</Text></MagicPressable>
            <View style={{flexDirection:'row',gap:8}}>
              <MagicPressable onPress={()=>setS({galaxyFiberMotion:s.galaxyFiberMotion===false})} style={[styles.galleryMiniButton,{flex:1,minHeight:54,borderColor:'#b28cff'}]}>
                <Ionicons name={s.galaxyFiberMotion===false?'play-circle-outline':'pause-circle-outline'} size={22} color="#fff"/>
                <Text style={styles.galleryMiniText}>حرکت فیبرها: {s.galaxyFiberMotion===false?'خاموش':'روشن'}</Text>
              </MagicPressable>
              <MagicPressable onPress={()=>setS({galaxyFiberGlow:s.galaxyFiberGlow===false})} style={[styles.galleryMiniButton,{flex:1,minHeight:54,borderColor:'#63e8ff'}]}>
                <Ionicons name={s.galaxyFiberGlow===false?'moon-outline':'sunny-outline'} size={22} color="#fff"/>
                <Text style={styles.galleryMiniText}>هاله: {s.galaxyFiberGlow===false?'خاموش':'روشن'}</Text>
              </MagicPressable>
            </View>
            <Text style={styles.musicSettingTitle}>ظاهر چرخ رنگ کهکشانی</Text>
            <Text style={styles.muted}>پنج طرح کاملاً متفاوت برای ظاهر چرخ انتخاب رنگ؛ این انتخاب روی چرخ اصلی همین صفحه اعمال می‌شود.</Text>
            <ColorWheelAppearanceSelector value={Number(s.galaxyWheelStyle||0)} onChange={v=>setS({galaxyWheelStyle:v})} accent="#b28cff"/>
            <Text style={styles.muted}>رنگ، افکت، روشنایی و سرعت از صفحه‌های اصلی کهکشانی قابل تنظیم‌اند؛ انتخاب‌ها به‌صورت خودکار ذخیره می‌شوند.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

function NoraMicArtwork({designIndex=0,animationIndex=0,paletteIndex=0,size=76,phase,listening=false,level=0,animationSpeed=1}:{designIndex?:number;animationIndex?:number;paletteIndex?:number;size?:number;phase?:any;listening?:boolean;level?:number;animationSpeed?:number}){
  const design=NORA_MIC_DESIGNS[Math.max(0,Math.min(NORA_MIC_DESIGNS.length-1,designIndex))];
  const palette=NORA_MIC_PALETTES[Math.max(0,Math.min(NORA_MIC_PALETTES.length-1,paletteIndex))];
  const primary=palette.primary||design.primary;
  const secondary=palette.secondary||design.secondary;
  const localPhase=useRef(new Animated.Value(0)).current;
  const speed=NORA_MIC_ANIMATION_SPEEDS[Math.max(0,Math.min(NORA_MIC_ANIMATION_SPEEDS.length-1,Number(animationSpeed)||0))]||NORA_MIC_ANIMATION_SPEEDS[1];
  useEffect(()=>{
    localPhase.stopAnimation();localPhase.setValue(0);
    const loop=Animated.loop(Animated.timing(localPhase,{toValue:1,duration:speed.rotation,easing:Easing.linear,useNativeDriver:true}));
    loop.start();return()=>loop.stop();
  },[localPhase,speed.rotation]);
  const motionPhase=phase||localPhase;
  const phaseScale=motionPhase.interpolate({inputRange:[0,.5,1],outputRange:[.88,1.08,.88]});
  const phasePulse=motionPhase.interpolate({inputRange:[0,.5,1],outputRange:[.3,.95,.3]});
  const phaseRotate=localPhase.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const waveScale=motionPhase.interpolate({inputRange:[0,.5,1],outputRange:[.78,1.15,.78]});
  const renderRing=(border:string,scale:any,opacity:any,width=1.5)=> <Animated.View style={{position:'absolute',width:size*.82,height:size*.82,borderRadius:size, borderWidth:width,borderColor:border,opacity,transform:[{scale}]}}/>;
  return <View pointerEvents="none" style={{width:size,height:size,alignItems:'center',justifyContent:'center',position:'relative',overflow:'visible'}}>
    {design.shape==='diamond'&&<View style={{position:'absolute',width:size*.72,height:size*.72,borderWidth:2,borderColor:primary,borderRadius:size*.11,transform:[{rotate:'45deg'}],shadowColor:primary,shadowOpacity:.6,shadowRadius:8}}/>}
    {design.shape==='orbit'&&<><View style={{position:'absolute',width:size*.88,height:size*.43,borderWidth:1.5,borderColor:secondary,borderRadius:size*.5,transform:[{rotate:'-28deg'}]}}/><View style={{position:'absolute',width:size*.88,height:size*.43,borderWidth:1.5,borderColor:primary,borderRadius:size*.5,transform:[{rotate:'28deg'}]}}/><View style={{position:'absolute',right:size*.09,top:size*.21,width:size*.09,height:size*.09,borderRadius:size*.06,backgroundColor:secondary,shadowColor:secondary,shadowOpacity:1,shadowRadius:5}}/></>}
    {design.shape==='hex'&&<><View style={{position:'absolute',width:size*.76,height:size*.76,borderWidth:2,borderColor:primary,borderRadius:size*.17,transform:[{rotate:'45deg'}]}}/><View style={{position:'absolute',left:size*.06,right:size*.06,top:size*.19,height:size*.62,borderLeftWidth:1,borderRightWidth:1,borderColor:secondary}}/></>}
    {design.shape==='flower'&&[0,1,2,3,4,5].map(i=><View key={i} style={{position:'absolute',width:size*.17,height:size*.26,borderRadius:size*.12,backgroundColor:`${secondary}25`,borderWidth:1,borderColor:secondary,top:size*.13,left:size*.415,transform:[{rotate:`${i*60}deg`},{translateY:-size*.025}],opacity:.95}}/>)}
    {design.shape==='capsule'&&<View style={{position:'absolute',width:size*.59,height:size*.88,borderWidth:2,borderColor:primary,borderRadius:size*.28,shadowColor:primary,shadowOpacity:.6,shadowRadius:8}}/>}
    {design.shape==='ring'&&<><View style={{position:'absolute',width:size*.88,height:size*.88,borderWidth:1.5,borderColor:secondary,borderRadius:size,opacity:.9}}/><View style={{position:'absolute',width:size*.70,height:size*.70,borderWidth:1,borderColor:primary,borderRadius:size}}/></>}
    {animationIndex===0&&renderRing(primary,phaseScale,phasePulse,2)}
    {animationIndex===1&&<Animated.View style={{position:'absolute',width:size*.92,height:size*.92,borderWidth:1.3,borderStyle:'dashed',borderColor:secondary,borderRadius:size,transform:[{rotate:phaseRotate}]}}><View style={{position:'absolute',top:-size*.045,left:size*.42,width:size*.09,height:size*.09,borderRadius:size*.05,backgroundColor:secondary,shadowColor:secondary,shadowOpacity:1,shadowRadius:5}}/></Animated.View>}
    {animationIndex===2&&<>{renderRing(secondary,waveScale,phasePulse,1.4)}<Animated.View style={{position:'absolute',width:size*.98,height:size*.98,borderRadius:size,borderWidth:1,borderColor:primary,opacity:phasePulse,transform:[{scale:phase?phase.interpolate({inputRange:[0,.5,1],outputRange:[.64,1.2,.64]}):1}]}}/></>}
    {animationIndex===3&&<View style={{position:'absolute',left:size*.04,right:size*.04,bottom:size*.12,height:size*.3,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>{[.35,.72,1,.48,.8,.42].map((v,i)=>{const liveBoost=listening?Math.max(0,Math.min(.45,Number(level)||0))*.55:0;const scale=motionPhase.interpolate({inputRange:[0,.25,.5,.75,1],outputRange:[.3+v*.3+liveBoost,.55+v*.45+liveBoost,.25+v*.7+liveBoost,.6+v*.35+liveBoost,.3+v*.3+liveBoost]});return <Animated.View key={i} style={{width:Math.max(2,size*.045),height:size*.24,borderRadius:size*.04,backgroundColor:i%2?secondary:primary,transform:[{scaleY:scale}],opacity:.9}}/>})}</View>}
    {animationIndex===4&&<Animated.View style={{position:'absolute',width:size*.95,height:size*.95,transform:[{rotate:phaseRotate}]}}>{[[.14,.2],[.73,.12],[.82,.63],[.17,.74]].map(([x,y],i)=><View key={i} style={{position:'absolute',left:size*x,top:size*y,width:size*.1,height:size*.1,alignItems:'center',justifyContent:'center'}}><Ionicons name={i%2?'sparkles':'star'} size={size*.14} color={i%2?secondary:primary}/></View>)}</Animated.View>}
    <View style={{width:size*.49,height:size*.59,borderRadius:design.shape==='hex'?size*.15:design.shape==='capsule'?size*.20:size*.28,borderWidth:1.7,borderColor:primary,backgroundColor:'rgba(7,10,28,.9)',alignItems:'center',justifyContent:'center',shadowColor:primary,shadowOpacity:listening?1:.55,shadowRadius:listening?12:6,elevation:3}}>
      <Ionicons name="mic" size={size*.35} color={listening?'#72ffc5':primary}/>
      <View style={{position:'absolute',left:size*.10,right:size*.10,bottom:size*.055,height:1.5,backgroundColor:secondary,opacity:.9}}/>
    </View>
    {design.shape==='capsule'&&<><View style={{position:'absolute',right:size*.08,top:size*.3,width:size*.07,height:size*.07,borderRadius:size*.04,backgroundColor:secondary}}/><View style={{position:'absolute',left:size*.08,bottom:size*.29,width:size*.07,height:size*.07,borderRadius:size*.04,backgroundColor:secondary}}/></>}
  </View>;
}

function Nora({s,setS,requestSecureAction}:{s:any;setS:(p:any)=>void;requestSecureAction:(target:string,title:string,action:()=>void)=>void}){
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [listening,setListening]=useState(!!s.noraListening);
  const [level,setLevel]=useState(0);
  const [modal,setModal]=useState<string|null>(null);
  const micPulse=useRef(new Animated.Value(0)).current;
  const subRef=useRef<any>(null);
  const busyRef=useRef(false);
  const listeningRef=useRef(!!s.noraListening);
  const startingRef=useRef(false);
  const stopAfterStartRef=useRef(false);
  const sendMessageRef=useRef<(raw?:string)=>Promise<void>>(async()=>{});
  const latestStateRef=useRef(s);
  latestStateRef.current=s;
  const {width:windowWidth}=useWindowDimensions();
  const messages=Array.isArray(s.noraMessages)?s.noraMessages:[];
  const moods=[['sparkles-outline','آرام','#63e8ff'],['flame-outline','انرژی','#ff79c8'],['moon-outline','شبانه','#b28cff'],['heart-outline','صمیمی','#72ffc5']];
  const noraIconPreset=Math.max(0,Number(s.pageIconPreset?.ai)||0)%NORA_ICON_PRESETS.length;
  const noraIconGallery=String(s.pageIconGallery?.ai||'').trim();
  const noraIconGalleryIsGif=s.pageIconGalleryKind?.ai==='gif';
  const noraIconEffect=Math.max(0,Math.min(4,Number(s.pageIconEffect?.ai)||0));
  const [keyboardVisible,setKeyboardVisible]=useState(false);
  const composerInputRef=useRef<any>(null);
  const messagesScrollRef=useRef<any>(null);
  const localRiskLevel=(q:string):'green'|'yellow'|'red'=>{
    const v=q.toLowerCase();
    if(/خودکشی|خودکشی|کشتن|قتل|بمب|انفجار|اسلحه|سلاح|آسیب جدی|خودزنی|سم|مواد منفجره/.test(v)) return 'red';
    if(/خطر|تهدید|آسیب|دزدی|هک|نفوذ|مشکوک|ناامن/.test(v)) return 'yellow';
    return 'green';
  };
  const ensureTelephonyPermissions=async()=>{
    if(Platform.OS!=='android') return false;
    try{
      const phoneState=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
      const callPhone=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
      return phoneState===PermissionsAndroid.RESULTS.GRANTED&&callPhone===PermissionsAndroid.RESULTS.GRANTED;
    }catch{return false;}
  };
  const ensureMic=async()=>{
    try{
      if(Platform.OS==='android'){
        const g=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if(g!==PermissionsAndroid.RESULTS.GRANTED){Alert.alert('دسترسی میکروفون','برای فرمان صوتی، اجازهٔ میکروفون را از تنظیمات اندروید فعال کن.');return false;}
      }
      return true;
    }catch{return false;}
  };
  const ensureAudioLibraryPermission=async()=>{
    if(Platform.OS!=='android'||Number(Platform.Version)<23)return true;
    try{
      const permissions=PermissionsAndroid.PERMISSIONS as any;
      const permission=Number(Platform.Version)>=33?(permissions.READ_MEDIA_AUDIO||'android.permission.READ_MEDIA_AUDIO'):permissions.READ_EXTERNAL_STORAGE;
      const result=await PermissionsAndroid.request(permission);
      return result===PermissionsAndroid.RESULTS.GRANTED;
    }catch{return false;}
  };
  const onlineChat=async(q:string)=>{
    const base=String(latestStateRef.current.noraApiBaseUrl||'').trim().replace(/\/+$/,'');
    if(!base)throw new Error('ONLINE_AI_ENDPOINT_NOT_CONFIGURED');
    const r=await fetch(`${base}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,language:'fa'})});
    if(!r.ok)throw new Error('AI_OFFLINE');
    const d=await r.json();
    const answer=String(d?.answer||d?.message||'').trim();
    if(!answer)throw new Error('EMPTY_AI_RESPONSE');
    const rawRisk=String(d?.riskLevel||d?.risk||'').toLowerCase();
    const risk: 'green'|'yellow'|'red'|'unknown' = rawRisk==='green'||rawRisk==='safe' ? 'green' : rawRisk==='yellow'||rawRisk==='medium' ? 'yellow' : rawRisk==='red'||rawRisk==='high'||rawRisk==='danger' ? 'red' : 'unknown';
    return {answer,risk};
  };
  const speakReply=async(answer:string)=>{if(latestStateRef.current.noraVoiceEnabled!==false){try{await NoraVoice.speak(answer);}catch{}}};
  const webSearch=async(query:string)=>{
    const url=`https://www.google.com/search?q=${encodeURIComponent(query)}`;
    try{await Linking.openURL(url);return true;}catch{return false;}
  };
  const recordAnswer=(nextUser:any[],answer:string,extra:any={},risk:'unknown'|'green'|'yellow'|'red'='unknown')=>{
    const emergency=risk==='red'&&latestStateRef.current.emergencyCameraEnabled!==false&&!latestStateRef.current.emergencyCameraTrigger;
    setS({...extra,noraRiskLevel:risk,noraMessages:[...nextUser,{from:'nora',text:answer}],...(emergency?{emergencyCameraTrigger:{id:Date.now(),reason:answer}}:{})});
    void speakReply(answer);
  };
  const playLibraryTrack=async(direction:number)=>{
    const allowed=await ensureAudioLibraryPermission();
    if(!allowed)throw new Error('AUDIO_PERMISSION_DENIED');
    const tracks=await DjAudio.listTracks();
    if(!Array.isArray(tracks)||tracks.length===0)throw new Error('NO_LOCAL_TRACKS');
    const status=await DjAudio.getMusicStatus();
    const currentUri=String(status?.uri||latestStateRef.current.musicTrackUri||'');
    const currentIndex=tracks.findIndex((t:any)=>String(t?.uri||t?.id||'')===currentUri);
    let nextIndex:number;
    if(currentIndex<0)nextIndex=direction>0?0:tracks.length-1;
    else nextIndex=(currentIndex+direction+tracks.length)%tracks.length;
    const track=tracks[nextIndex];
    const ok=await DjAudio.playMusicTrack(String(track.uri),String(track.title||'آهنگ محلی'),String(track.artist||''));
    if(!ok)throw new Error('LOCAL_PLAY_FAILED');
    setS({musicTrackUri:track.uri,musicTrackTitle:track.title||'آهنگ محلی',musicTrackArtist:track.artist||'',playing:true});
    return track;
  };
  const runOffline=async(v:string,c:string,nextUser:any[])=>{
    const state=latestStateRef.current;
    const complete=(answer:string,extra:any={},risk:'green'|'yellow'|'red'='green')=>recordAnswer(nextUser,answer,extra,risk);
    if(c==='speakerOn'||c==='speakerOff'){
      const on=c==='speakerOn';
      const ok=state.wifiEsp32===true&&state.wifiBaseUrl?await WifiEsp32.command(state.wifiBaseUrl,'speaker.power',{on}).catch(()=>false):false;
      if(ok)complete(on?'فرمان روشن‌کردن اسپیکر تأیید شد.':'فرمان خاموش‌کردن اسپیکر تأیید شد.',{power:on});
      else complete('اتصال فعلی فرمان روشن/خاموش‌کردن اسپیکر را تأیید نکرد؛ وضعیت تغییر داده نشد.');
      return true;
    }
    if(c==='lightsOn'||c==='lightsOff'){
      const on=c==='lightsOn';
      const [rgb,neon,galaxy]=await Promise.all([
        sendDualLightCommand(state,'light.rgbPower',{on,target:'rgb'},async()=>false),
        sendDualLightCommand(state,'light.neonPower',{on,target:'neon'},()=>LotusBle.power(on)),
        sendDualLightCommand(state,'light.galaxyPower',{on,target:'galaxy'},async()=>false),
      ]);
      const r=rgb.wifi,n=neon.ble||neon.wifi,g=galaxy.wifi;
      const extra:any={};if(r)extra.rgbPower=on;if(n)extra.neonPower=on;if(g)extra.galaxyPower=on;
      if(r||n||g){const labels=[r?'RGB چهار سیمه':null,n?'نئون':null,g?'کهکشانی':null].filter(Boolean).join('، ');const onlyNeon=n&&!r&&!g&&!!neon.ble&&!neon.wifi;complete(onlyNeon?`فرمان نورپردازی برای ${labels} ارسال شد؛ وضعیت چراغ هنوز از راه برگشت تأیید نشده است.`:`فرمان نورپردازی برای ${labels} به مسیر پاسخ‌گو ارسال شد.`,extra);}
      else complete('هیچ‌یک از مسیرهای فعال، فرمان نورپردازی را تأیید نکرد؛ وضعیت چراغ‌ها تغییر داده نشد.');
      return true;
    }
    if(c==='rgbOn'||c==='rgbOff'){
      const on=c==='rgbOn';const result=await sendDualLightCommand(state,'light.rgbPower',{on,target:'rgb'},async()=>false);
      if(result.wifi)complete(on?'RGB چهار سیمه روشن شد.':'RGB چهار سیمه خاموش شد.',{rgbPower:on});else complete('کنترلر RGB چهار سیمه از اتصال فعلی پاسخ نداد؛ تغییری تأیید نشد.');
      return true;
    }
    if(c==='neonOn'||c==='neonOff'){
      const on=c==='neonOn';const result=await sendDualLightCommand(state,'light.neonPower',{on,target:'neon'},()=>LotusBle.power(on));
      if(result.wifi)complete(on?'فرمان روشن‌کردن نئون تأیید شد.':'فرمان خاموش‌کردن نئون تأیید شد.',{neonPower:on});else if(result.ble)complete(on?'فرمان روشن‌کردن نئون ارسال شد؛ وضعیت فیزیکی تأیید نشده است.':'فرمان خاموش‌کردن نئون ارسال شد؛ وضعیت فیزیکی تأیید نشده است.',{neonPower:on});else complete('نئون از اتصال فعلی پاسخ نداد؛ تغییری تأیید نشد.');
      return true;
    }
    if(c==='galaxyOn'||c==='galaxyOff'){
      const on=c==='galaxyOn';const result=await sendDualLightCommand(state,'light.galaxyPower',{on,target:'galaxy'},async()=>false);
      if(result.wifi)complete(on?'نور کهکشانی روشن شد.':'نور کهکشانی خاموش شد.',{galaxyPower:on});else complete('مسیر کنترل کهکشانی از اتصال فعلی پاسخ نداد؛ تغییری تأیید نشد.');
      return true;
    }
    if(c==='play'||c==='nextTrack'||c==='previousTrack'){
      try{
        let track:any;
        if(c==='nextTrack'||c==='previousTrack')track=await playLibraryTrack(c==='nextTrack'?1:-1);
        else if(state.musicTrackUri){const ok=await DjAudio.playMusicTrack(String(state.musicTrackUri),String(state.musicTrackTitle||'آهنگ انتخاب‌شده'),String(state.musicTrackArtist||''));if(!ok)throw new Error('LOCAL_PLAY_FAILED');track={title:state.musicTrackTitle||'آهنگ انتخاب‌شده'};setS({playing:true});}
        else if(state.djTrackUri){const loaded=await DjAudio.load(String(state.djTrackUri));const ok=loaded&&await DjAudio.play();if(!ok)throw new Error('LOCAL_PLAY_FAILED');track={title:state.djTrackName||'آهنگ انتخاب‌شده'};setS({djLoaded:true,djPlaying:true});}
        else track=await playLibraryTrack(1);
        const title=String(track?.title||track?.name||'آهنگ محلی');
        complete(c==='nextTrack'?`آهنگ بعدی در حال پخش است: «${title}».`:c==='previousTrack'?`آهنگ قبلی در حال پخش است: «${title}».`:`پخش محلی شروع شد: «${title}».`);
      }catch(e:any){
        const msg=e?.message==='AUDIO_PERMISSION_DENIED'?'برای دسترسی به آهنگ‌های محلی، اجازهٔ موسیقی را فعال کن.':e?.message==='NO_LOCAL_TRACKS'?'در کتابخانهٔ محلی آهنگی پیدا نشد؛ ابتدا فایل موسیقی را در آوای نوا انتخاب کن.':'پخش محلی انجام نشد؛ آهنگ یا مجوز لازم در دسترس نیست.';
        complete(msg);
      }
      return true;
    }
    if(c==='pause'||c==='resume'){
      let ok=false;
      if(c==='pause')ok=await DjAudio.pauseMusic().catch(()=>false)||await DjAudio.pause().catch(()=>false);
      else ok=await DjAudio.resumeMusic().catch(()=>false)||await DjAudio.play().catch(()=>false);
      if(state.wifiEsp32===true&&state.wifiBaseUrl)ok=(await WifiEsp32.playback(state.wifiBaseUrl,c).catch(()=>false))||ok;
      if(ok){complete(c==='pause'?'پخش موسیقی متوقف شد.':'پخش موسیقی ادامه پیدا کرد.',{playing:c==='resume',djPlaying:c==='resume'});}else complete('پخش‌کننده‌ای در حال پاسخ نیست؛ فرمان اجرا نشد.');
      return true;
    }
    if(c==='volUp'||c==='volDown'){
      const next=Math.max(0,Math.min(100,(Number(state.djVolume)||80)+(c==='volUp'?10:-10)));
      const localOk=await DjAudio.setVolume(next/100).catch(()=>false);
      const wifiOk=state.wifiEsp32===true&&state.wifiBaseUrl?await WifiEsp32.command(state.wifiBaseUrl,'music.volume',{value:next}).catch(()=>false):false;
      if(localOk||wifiOk)complete(c==='volUp'?'صدای پخش بیشتر شد.':'صدای پخش کمتر شد.',{djVolume:next});else complete('تغییر بلندی صدا انجام نشد؛ پخش‌کننده پاسخی نداد.');
      return true;
    }
    if(c==='neonEffectNext'||c==='rgbEffectNext'||c==='galaxyEffectNext'||c==='effectNext'){
      const target=c==='effectNext'?(state.rgbColorTarget==='neon'?'neon':'rgb'):c==='neonEffectNext'?'neon':c==='galaxyEffectNext'?'galaxy':'rgb';
      if(target==='neon'){
        const next=(Math.max(0,Number(state.neonMode??state.neonEffect)||0)+1)%LOTUS_MODE_IDS.length;
        const result=await sendDualLightCommand(state,'light.mode',{id:next,target:'neon'},()=>LotusBle.mode(next));
        if(result.wifi)complete(`فرمان تغییر افکت نئون تأیید شد؛ حالت ${next+1}.`,{neonMode:next,neonEffect:next});else if(result.ble)complete(`فرمان افکت نئون ارسال شد؛ حالت درخواستی ${next+1} است، اما وضعیت از چراغ برگشت داده نشده.`,{neonMode:next,neonEffect:next});else complete('نئون فرمان تغییر افکت را تأیید نکرد.');
      }else if(target==='galaxy'){
        const next=(Math.max(0,Number(state.galaxyEffect)||0)+1)%30;
        const result=await sendDualLightCommand(state,'light.galaxyMode',{id:next,target:'galaxy'},async()=>false);
        if(result.wifi)complete(`افکت کهکشانی تغییر کرد؛ طرح ${next+1}.`,{galaxyEffect:next});else complete('مسیر کنترل کهکشانی برای تغییر افکت پاسخ نداد.');
      }else{
        const next=(Math.max(0,Number(state.rgbEffect)||0)+1)%6;
        const result=await sendDualLightCommand(state,'light.rgbEffect',{id:next,target:'rgb'},async()=>false);
        if(result.wifi)complete(`افکت RGB تغییر کرد؛ طرح ${next+1}.`,{rgbEffect:next});else complete('مسیر کنترل RGB برای تغییر افکت پاسخ نداد.');
      }
      return true;
    }
    return false;
  };
  const offlineCommand=(v:string)=>{
    const q=v.replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200f]/g,' ').replace(/[.!؟،؛,:]+$/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    if(/(آهنگ|موسیقی|ترانه).*(بعدی|بعدش)|(بعدی|بعدش).*(آهنگ|موسیقی|ترانه)|^(?:آهنگ )?بعدی$/.test(q))return 'nextTrack';
    if(/(آهنگ|موسیقی|ترانه).*(قبلی|قبل)|(قبلی|قبل).*(آهنگ|موسیقی|ترانه)|^(?:آهنگ )?قبلی$/.test(q))return 'previousTrack';
    if(/افکت.*(کهکشان|کهکشانی)|(کهکشان|کهکشانی).*افکت/.test(q))return 'galaxyEffectNext';
    if(/افکت.*نئون|نئون.*افکت/.test(q))return 'neonEffectNext';
    if(/افکت.*(rgb|چهارسیمه)|(?:rgb|چهارسیمه).*افکت/.test(q))return 'rgbEffectNext';
    if(/افکت.*(عوض|بعدی|تغییر)|تغییر.*افکت/.test(q))return 'effectNext';
    if(/اسپیکر.*(روشن|فعال)|روشن.*اسپیکر/.test(q))return 'speakerOn';
    if(/اسپیکر.*(خاموش|غیرفعال)|خاموش.*اسپیکر/.test(q))return 'speakerOff';
    if(/نئون.*روشن|روشن.*نئون/.test(q))return 'neonOn';
    if(/نئون.*خاموش|خاموش.*نئون/.test(q))return 'neonOff';
    if(/کهکشان.*روشن|روشن.*کهکشان/.test(q))return 'galaxyOn';
    if(/کهکشان.*خاموش|خاموش.*کهکشان/.test(q))return 'galaxyOff';
    if(/rgb.*روشن|چهارسیمه.*روشن/.test(q))return 'rgbOn';
    if(/rgb.*خاموش|چهارسیمه.*خاموش/.test(q))return 'rgbOff';
    if(/چراغ.*روشن|نور.*روشن|همه.*چراغ.*روشن/.test(q))return 'lightsOn';
    if(/چراغ.*خاموش|نور.*خاموش|همه.*چراغ.*خاموش/.test(q))return 'lightsOff';
    if(/^(?:لطفا\s*)?(?:همه\s*)?(?:روشن کن|روشنش کن|روشن)$/.test(q))return 'lightsOn';
    if(/^(?:لطفا\s*)?(?:همه\s*)?(?:خاموش کن|خاموشش کن|خاموش)$/.test(q))return 'lightsOff';
    if(/(مکث|توقف).*(آهنگ|موسیقی|پخش)|پخش.*متوقف/.test(q))return 'pause';
    if(/ادامه.*(آهنگ|موسیقی|پخش)|ادامه بده/.test(q))return 'resume';
    if(/صد[اای].*(بیشتر|زیاد)|بلندتر/.test(q))return 'volUp';
    if(/صد[اای].*(کمتر|کم)|آهسته‌تر/.test(q))return 'volDown';
    if(/^(?:لطفا\s*)?(?:(?:آهنگ|موسیقی)(?:\s+(?:محلی|انتخاب‌شده))?|پخش)(?:\s*(?:را|رو))?\s*(?:پخش|اجرا|شروع)?\s*(?:کن)?[.!؟،]*$/.test(q))return 'play';
    return null;
  };
  const onlineMusic=async(q:string)=>{
    const base=String(latestStateRef.current.noraApiBaseUrl||'').trim().replace(/\/+$/,'');
    if(!base)throw new Error('ONLINE_MUSIC_ENDPOINT_NOT_CONFIGURED');
    const r=await fetch(`${base}/music/search?q=${encodeURIComponent(q)}`);
    if(!r.ok)throw new Error('MUSIC_SEARCH_FAILED');
    const d=await r.json();
    const title=String(d?.title||d?.name||'آهنگ درخواستی').trim();
    const artist=String(d?.artist||'').trim();
    const uri=String(d?.streamUrl||d?.audioUrl||d?.playbackUrl||d?.url||'').trim();
    if(!/^https?:\/\//i.test(uri))throw new Error('PLAYABLE_STREAM_NOT_RETURNED');
    const ok=await DjAudio.playMusicTrack(uri,title,artist);
    if(!ok)throw new Error('STREAM_PLAY_FAILED');
    setS({musicTrackUri:uri,musicTrackTitle:title,musicTrackArtist:artist,playing:true});
    return title;
  };
  const sendMessage=async(raw?:string)=>{
    const value=(raw??text).trim();
    if(!value||busyRef.current)return;
    busyRef.current=true;setBusy(true);setText('');
    const nextUser=[...messages,{from:'user',text:value}];
    setS({noraMessages:nextUser});
    try{
      const cmd=offlineCommand(value);
      // Local device commands remain available even when online mode is selected.
      if(cmd){
        const lightingCommands=['lightsOn','lightsOff','rgbOn','rgbOff','neonOn','neonOff','galaxyOn','galaxyOff','galaxyEffectNext','neonEffectNext','rgbEffectNext','effectNext'];
        const musicCommands=['play','nextTrack','previousTrack','pause','resume','volUp','volDown'];
        if(cmd==='speakerOn'){requestSecureAction('speakerPower','تأیید برای روشن‌کردن اسپیکر',()=>{void runOffline(value,cmd,nextUser).catch(()=>recordAnswer(nextUser,'فرمان روشن‌کردن اسپیکر کامل نشد.'));});return;}
        if(lightingCommands.includes(cmd)){requestSecureAction('lighting','تأیید برای کنترل نورپردازی',()=>{void runOffline(value,cmd,nextUser).catch(()=>recordAnswer(nextUser,'فرمان نورپردازی کامل نشد.'));});return;}
        if(musicCommands.includes(cmd)){requestSecureAction('musicLibrary','تأیید برای کنترل موسیقی',()=>{void runOffline(value,cmd,nextUser).catch(()=>recordAnswer(nextUser,'فرمان موسیقی کامل نشد.'));});return;}
        const handled=await runOffline(value,cmd,nextUser);if(handled)return;
      }
      const mode=latestStateRef.current.noraMode||'online';
      if(/(?:گوگل|google).*(?:باز|وصل|برو)|(?:باز|وصل|برو).*(?:گوگل|google)/i.test(value)){
        if(mode==='offline'){recordAnswer(nextUser,'بازکردن گوگل به اینترنت نیاز دارد؛ فرمان‌های محلی در حالت آفلاین همچنان در دسترس‌اند.');return;}
        const online=await NoraVoice.online().catch(()=>false);
        if(!online){recordAnswer(nextUser,'اتصال اینترنت تأیید نشد؛ گوگل باز نشد.');return;}
        const opened=await Linking.openURL('https://www.google.com').then(()=>true).catch(()=>false);
        recordAnswer(nextUser,opened?'گوگل در مرورگر باز شد.':'بازکردن گوگل انجام نشد.');return;
      }
      if(mode==='offline'){
        recordAnswer(nextUser,'در حالت آفلاین، این عبارت فرمان محلی شناخته‌شده‌ای نبود. برای روشنایی، افکت، بلندی صدا یا کنترل آهنگ از فرمان مشخص استفاده کن.',{},localRiskLevel(value));
        return;
      }
      const online=await NoraVoice.online().catch(()=>false);
      if(!online){recordAnswer(nextUser,'اتصال اینترنت تأیید نشد. فرمان‌های محلی همچنان در دسترس‌اند؛ برای پرسش آنلاین اتصال اینترنت را بررسی کن.');return;}
      if(/دانلود/.test(value)){
        const opened=await webSearch(value);
        recordAnswer(nextUser,opened?'نتایج دریافت آهنگ در مرورگر باز شد؛ فایل از داخل نورا دانلود نشده است. برای دانلود مستقیم داخل برنامه، سرویس امنِ دارای نشانی فایل و مجوز ذخیره‌سازی لازم است.':'جست‌وجوی دریافت آهنگ باز نشد.');
        return;
      }
      if(/آهنگ|موسیقی|ترانه|خواننده|پخش/.test(value)){
        try{
          const title=await onlineMusic(value);
          recordAnswer(nextUser,`پخش آنلاین شروع شد: «${title}».`);
          return;
        }catch{
          const opened=await webSearch(value);
          recordAnswer(nextUser,opened?'نتایج جست‌وجو در مرورگر باز شد. از این مسیر چیزی داخل برنامه پخش نشده است؛ برای پخش مستقیم، سرویس موسیقی سازگار باید در تنظیمات ثبت شود.':'جست‌وجوی آنلاین باز نشد. یک سرویس موسیقی سازگار را در تنظیمات نورا ثبت کن یا اتصال اینترنت را بررسی کن.');
          return;
        }
      }
      const base=String(latestStateRef.current.noraApiBaseUrl||'').trim();
      if(!base){
        const opened=await webSearch(value);
        recordAnswer(nextUser,opened?'برای این پرسش، جست‌وجوی وب در مرورگر باز شد. برای دریافت پاسخ داخل خود نورا، نشانی سرویس هوش مصنوعی را در تنظیمات وارد کن.':'سرویس هوش مصنوعی تنظیم نشده و مرورگر هم باز نشد؛ نشانی سرویس را در تنظیمات نورا وارد کن.',{},localRiskLevel(value));
        return;
      }
      try{
        const result=await onlineChat(value);
        recordAnswer(nextUser,result.answer,{},result.risk);
      }catch{
        const opened=await webSearch(value);
        recordAnswer(nextUser,opened?'سرویس پاسخ‌گویی داخل برنامه در دسترس نبود؛ جست‌وجوی وب در مرورگر باز شد.':'سرویس پاسخ‌گویی داخل برنامه در دسترس نیست و مرورگر هم باز نشد.');
      }
    }catch{
      recordAnswer(nextUser,'فرمان تکمیل نشد؛ اتصال یا پاسخ سرویس را بررسی کن.');
    }finally{busyRef.current=false;setBusy(false);}
  };
  sendMessageRef.current=sendMessage;
  useEffect(()=>{
    const Native=NativeModules.NoraVoiceModule;
    if(!Native)return;
    const emitter=new NativeEventEmitter(Native);
    const ev=emitter.addListener('onNoraSpeech',(e:any)=>{
      if(e?.type==='level')setLevel(Math.max(0,Math.min(1,(Number(e.value)+2)/12)));
      if(e?.type==='partial')setText(e.text||'');
      if(e?.type==='result'&&String(e.text||'').trim()){setText(e.text);void sendMessageRef.current(e.text);}
      if(e?.type==='end'||e?.type==='error'){
        listeningRef.current=false;setListening(false);setLevel(0);setS({noraListening:false});
        if(e?.type==='error'&&latestStateRef.current.noraMode==='offline'){
          setS({noraMessages:[...(Array.isArray(latestStateRef.current.noraMessages)?latestStateRef.current.noraMessages:[]),{from:'nora',text:'تشخیص گفتار آفلاین روی این دستگاه تأیید نشد. برای کار آفلاین، بستهٔ تشخیص گفتار فارسی را در تنظیمات اندروید نصب کن یا متن فرمان را بنویس.'}]});
        }
      }
    });
    subRef.current=ev;
    return()=>{ev.remove();subRef.current=null;void NoraVoice.stop().catch(()=>false);};
  },[]);
  useEffect(()=>{
    const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboardVisible(true));
    const hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboardVisible(false));
    return()=>{show.remove();hide.remove();};
  },[]);
  useEffect(()=>{
    micPulse.stopAnimation();
    const loop=Animated.loop(Animated.sequence([Animated.timing(micPulse,{toValue:1,duration:NORA_MIC_ANIMATION_SPEEDS[Math.max(0,Math.min(NORA_MIC_ANIMATION_SPEEDS.length-1,Number(latestStateRef.current.noraMicAnimationSpeed??1)||0))].duration,useNativeDriver:true}),Animated.timing(micPulse,{toValue:0,duration:NORA_MIC_ANIMATION_SPEEDS[Math.max(0,Math.min(NORA_MIC_ANIMATION_SPEEDS.length-1,Number(latestStateRef.current.noraMicAnimationSpeed??1)||0))].duration,useNativeDriver:true})]));
    loop.start();return()=>loop.stop();
  },[micPulse,s.noraMicAnimationSpeed]);
  const startMic=async()=>{
    if(listeningRef.current||startingRef.current)return;
    if(Number(latestStateRef.current.micMode)===2){Alert.alert('میکروفون خاموش است','از تنظیمات نورا حالت میکروفون را فعال کن.');return;}
    startingRef.current=true;stopAfterStartRef.current=false;
    const ok=await ensureMic();
    if(!ok){startingRef.current=false;return;}
    const started=await NoraVoice.start(latestStateRef.current.noraMode==='offline').catch(()=>false);
    startingRef.current=false;
    if(started){listeningRef.current=true;setListening(true);setS({noraListening:true});if(stopAfterStartRef.current)await stopMic();}
    else{listeningRef.current=false;setListening(false);setS({noraListening:false});Alert.alert('نورا',latestStateRef.current.noraMode==='offline'?'تشخیص گفتار فارسیِ کاملاً آفلاین روی این گوشی در دسترس نیست. بستهٔ گفتار آفلاین را از تنظیمات اندروید نصب کن یا فرمان را تایپ کن.':'تشخیص گفتار فعال نشد؛ دسترسی میکروفون و سرویس تشخیص گفتار اندروید را بررسی کن.');}
  };
  const stopMic=async()=>{
    if(startingRef.current){stopAfterStartRef.current=true;return;}
    if(!listeningRef.current)return;
    listeningRef.current=false;setListening(false);setLevel(0);setS({noraListening:false});
    await NoraVoice.stop().catch(()=>false);
  };
  const choose=(key:string,value:any)=>{setS({[key]:value});setModal(null);if(key==='noraOutput')void NoraVoice.setSpeaker(value==='speaker');};
  const mood=moods[Math.max(0,Math.min(moods.length-1,Number(s.noraMood)||0))];
  const characterIndex=Math.max(0,Math.min(NORA_CHARACTER_PRESETS.length-1,Number(s.noraCharacter)||0));
  const characterCardWidth=Math.max(64,Math.min(84,(Math.min(windowWidth,390)-68)/3));
  const micDesignIndex=Math.max(0,Math.min(NORA_MIC_DESIGNS.length-1,Number(s.noraMicDesign)||0));
  const micAnimationIndex=Math.max(0,Math.min(NORA_MIC_ANIMATIONS.length-1,Number(s.noraMicAnimation)||0));
  const micPaletteIndex=Math.max(0,Math.min(NORA_MIC_PALETTES.length-1,Number(s.noraMicPalette)||0));
  const micSpeedIndex=Math.max(0,Math.min(NORA_MIC_ANIMATION_SPEEDS.length-1,Number(s.noraMicAnimationSpeed??1)||0));
  const micSize=NORA_MIC_SIZES[Math.max(0,Math.min(NORA_MIC_SIZES.length-1,Number(s.noraMicSize??1)||0))];
  const micGlow=NORA_MIC_GLOWS[Math.max(0,Math.min(NORA_MIC_GLOWS.length-1,Number(s.noraMicGlow??2)||0))];
  const composerStyleIndex=Math.max(0,Math.min(NORA_COMPOSER_STYLES.length-1,Number(s.noraComposerStyle)||0));
  const composerPalette=NORA_COMPOSER_PALETTES[Math.max(0,Math.min(NORA_COMPOSER_PALETTES.length-1,Number(s.noraComposerPalette)||0))];
  const sendStyle=NORA_SEND_BUTTONS[Math.max(0,Math.min(NORA_SEND_BUTTONS.length-1,Number(s.noraSendStyle)||0))];
  const composerFontSize=[11,13,15][Math.max(0,Math.min(2,Number(s.noraComposerFontSize??1)))];
  const composerDims=NORA_COMPOSER_SIZES[Math.max(0,Math.min(2,Number(s.noraComposerHeight??1)))];
  const sendDims=NORA_SEND_SIZES[Math.max(0,Math.min(2,Number(s.noraSendSize??1)))];
  const composerPreset=NORA_COMPOSER_STYLES[composerStyleIndex];
  const frame=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const l=Animated.loop(Animated.timing(frame,{toValue:1,duration:8500,useNativeDriver:true}));l.start();return()=>l.stop();},[frame]);
  const frameOpacity=frame.interpolate({inputRange:[0,.5,1],outputRange:[.28,.6,.28]});
  const noraBadgeScale=frame.interpolate({inputRange:[0,.5,1],outputRange:noraIconEffect===4?[.86,1.14,.86]:[.96,1.04,.96]});
  const noraBadgeRotation=frame.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const micScale=micPulse.interpolate({inputRange:[0,1],outputRange:listening?[1,1.055]:[1,1.025]});
  const micGlowScale=micPulse.interpolate({inputRange:[0,1],outputRange:[.92,1.08]});
  const bars=[.3,.55,.8,.45,.7,.35,.62];
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={0}><View style={styles.noraRoot}>
    <View style={styles.noraTopCard}><Animated.View accessibilityLabel="وضعیت ایمنی نورا" style={[styles.noraSafetyLedTop,{backgroundColor:s.noraRiskLevel==='red'?'#ff3b5c':s.noraRiskLevel==='yellow'?'#ffd166':s.noraRiskLevel==='green'?'#72ffc5':'rgba(255,255,255,.22)',shadowColor:s.noraRiskLevel==='red'?'#ff3b5c':s.noraRiskLevel==='yellow'?'#ffd166':s.noraRiskLevel==='green'?'#72ffc5':'transparent',opacity:frame.interpolate({inputRange:[0,.5,1],outputRange:[.72,1,.72]})}]}/>
      <MagicPressable accessibilityRole="button" accessibilityLabel="انتخاب شخصیت نورا" onPress={()=>setModal('character')} style={styles.noraHeroIcon}>
        <Image source={NORA_CHARACTER_PRESETS[characterIndex]} style={styles.noraHeroImage}/>
        <Animated.View style={[styles.noraPageIconBadge,{opacity:noraIconEffect===3?frameOpacity:1,transform:[{scale:noraBadgeScale},{rotate:noraIconEffect===1?noraBadgeRotation:'0deg'}],shadowColor:noraIconEffect===2||noraIconEffect===3?'#72ffc5':'#63e8ff',shadowOpacity:(noraIconEffect===2||noraIconEffect===3)?0.95:0.6}]}>
          {noraIconGallery?<ExpoImage source={{uri:noraIconGallery,isAnimated:noraIconGalleryIsGif}} style={styles.noraPageIconBadgeImage} contentFit="contain" autoplay={noraIconGalleryIsGif}/>:<Image source={NORA_ICON_PRESETS[noraIconPreset]} style={styles.noraPageIconBadgeImage} resizeMode="contain"/>}
        </Animated.View>
      </MagicPressable>
      <View style={styles.noraIdentity}><Text style={styles.noraIdentityTitle}>نورا</Text><Text style={styles.noraIdentitySub}>دستیار هوشمند کوروش نوا</Text></View>
      <MagicPressable accessibilityRole="button" accessibilityLabel="تنظیمات نورا" onPress={()=>setModal('voice')} style={[styles.noraModePill,{borderColor:s.noraMode==='online'?'#72ffc5':'#b28cff'}]}><View style={[styles.noraStatusLed,{backgroundColor:s.noraMode==='online'?'#72ffc5':'#b28cff',shadowColor:s.noraMode==='online'?'#72ffc5':'#b28cff'}]}/><Text style={styles.noraModePillText}>{s.noraMode==='online'?'آنلاین':'آفلاین'}</Text></MagicPressable>
    </View>
    <View style={styles.noraStatusRow}><Text style={styles.noraStatus}>{busy?'در حال پردازش…':`${NORA_CHARACTER_NAMES[characterIndex]} • ${mood[1]} • ${s.noraOutput==='speaker'?'اسپیکر':'گوشی'}`}</Text></View>
    <ScrollView ref={messagesScrollRef} style={[styles.noraMessagesBox,{borderColor:composerPalette.frame}]} contentContainerStyle={styles.noraMessagesContent} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>messagesScrollRef.current?.scrollToEnd?.({animated:true})}>{messages.length===0?<Text style={styles.noraEmpty}>فرمان‌های محلی: «نئون را روشن کن»، «کهکشان افکت بعدی»، «آهنگ بعدی». برای پرسش اینترنتی به اتصال و سرویس معتبر نیاز است.</Text>:messages.slice(-18).map((m:any,i:number)=><View key={`${i}-${m.from}`} style={[styles.noraBubble,m.from==='user'?styles.noraUserBubble:styles.noraAiBubble]}><Text style={styles.noraBubbleText}>{m.text}</Text></View>)}</ScrollView>
    <View style={[styles.noraComposer,{minHeight:composerDims.height,borderRadius:composerPreset.radius,borderStyle:composerPreset.borderStyle,borderWidth:composerPreset.edge,borderColor:composerPalette.frame,backgroundColor:composerPreset.fill,shadowColor:composerPalette.frame}]}>
      <TextInput ref={composerInputRef} value={text} onChangeText={setText} multiline placeholder={String(s.noraComposerPlaceholder||'پیام برای نورا…')} placeholderTextColor="rgba(255,255,255,.48)" style={[styles.noraInput,{fontSize:composerFontSize,minHeight:composerDims.input}]} selectionColor={composerPalette.send} editable={!busy} accessibilityLabel="نوشتن پیام برای نورا" onFocus={()=>setKeyboardVisible(true)} showSoftInputOnFocus={true} onSubmitEditing={()=>{if(text.trim())void sendMessage();}} submitBehavior="submit" enterKeyHint="send" returnKeyType="send" underlineColorAndroid="transparent"/>
      <MagicPressable accessibilityRole="button" accessibilityLabel="ارسال پیام به نورا" disabled={busy||!text.trim()} onPress={()=>void sendMessage()} style={[styles.noraSend,{width:sendDims.size,height:sendDims.size,borderColor:composerPalette.send,shadowColor:composerPalette.send,backgroundColor:`${composerPalette.send}18`,borderRadius:sendStyle.shape==='orb'?25:sendStyle.shape==='pill'?19:sendStyle.shape==='diamond'?8:sendStyle.shape==='square'?10:17,transform:sendStyle.shape==='diamond'?[{rotate:'45deg'}]:undefined,opacity:busy||!text.trim()?.45:1}]}><Ionicons name={sendStyle.icon as any} size={sendDims.size*.48} color={composerPalette.send} style={sendStyle.shape==='diamond'?{transform:[{rotate:'-45deg'}]}:undefined}/></MagicPressable>
    </View>
    {!keyboardVisible&&<><Animated.View style={[styles.noraMicGlow,{width:micSize.diameter-4,height:micSize.diameter-4,borderRadius:micSize.diameter/2,bottom:91+(116-micSize.diameter)/2,opacity:listening?Math.min(1,micGlow.opacity+.18):micGlow.opacity,shadowRadius:micGlow.radius,transform:[{scale:micGlowScale}],shadowColor:micPaletteIndex?NORA_MIC_PALETTES[micPaletteIndex].primary:NORA_MIC_DESIGNS[micDesignIndex].primary,borderColor:micPaletteIndex?NORA_MIC_PALETTES[micPaletteIndex].primary:NORA_MIC_DESIGNS[micDesignIndex].primary}]} pointerEvents="none"/>
    <Animated.View style={{transform:[{scale:micScale}]}}>
      <MagicPressable accessibilityRole="button" accessibilityLabel={Number(s.micMode)===2?'میکروفون خاموش':'میکروفون نورا'} accessibilityHint="با توجه به تنظیم انتخابی لمس کن یا نگه دار؛ اگر گفتار گوشی پشتیبانی نشود، پیام را در کادر بالا تایپ کن." disabled={Number(s.micMode)===2} onPressIn={Number(s.micMode??1)===0?undefined:startMic} onPressOut={Number(s.micMode??1)===0?undefined:stopMic} onPress={Number(s.micMode??1)===0?()=>{if(listeningRef.current)void stopMic();else void startMic();}:undefined} style={[styles.noraMic,{width:micSize.diameter,height:micSize.diameter,borderRadius:micSize.diameter/2,borderColor:listening?'#72ffc5':(micPaletteIndex?NORA_MIC_PALETTES[micPaletteIndex].primary:NORA_MIC_DESIGNS[micDesignIndex].primary),shadowColor:listening?'#72ffc5':(micPaletteIndex?NORA_MIC_PALETTES[micPaletteIndex].primary:NORA_MIC_DESIGNS[micDesignIndex].primary),shadowRadius:micGlow.radius,shadowOpacity:micGlow.opacity,backgroundColor:listening?'rgba(114,255,197,.12)':'rgba(5,8,25,.74)',opacity:Number(s.micMode)===2 ? 0.45 : 1}]}>
        <NoraMicArtwork designIndex={micDesignIndex} animationIndex={micAnimationIndex} paletteIndex={micPaletteIndex} size={micSize.artwork} phase={micPulse} listening={listening} level={level} animationSpeed={micSpeedIndex}/>
        <Text style={styles.noraMicText}>{Number(s.micMode)===2?'میکروفون خاموش':listening?'در حال شنیدن…':Number(s.micMode??1)===0?'برای شروع لمس کن':'نگه دار و صحبت کن'}</Text>
      </MagicPressable>
    </Animated.View>
    <View style={styles.noraQuickRow}>{[['people-circle-outline','شخصیت','character','#ff79c8'],['color-wand-outline','حال‌وهوا','mood','#b28cff'],['volume-high-outline','پخش صدا','output','#63e8ff'],['cloud-outline','آنلاین/آفلاین','mode','#72ffc5']].map(([ic,l,m,c])=><MagicPressable key={m} onPress={()=>setModal(m as any)} style={[styles.noraQuick,{borderColor:c,shadowColor:c}]}><Ionicons name={ic as any} size={22} color={c}/><Text style={styles.noraQuickText}>{l}</Text></MagicPressable>)}</View></>}
    {modal==='character'&&<SelectionModal title="شخصیت نورا" compact onClose={()=>setModal(null)}><View style={styles.noraCharacterGrid}>{NORA_CHARACTER_PRESETS.map((src:any,i:number)=><MagicPressable key={i} accessibilityRole="button" accessibilityLabel={`انتخاب ${NORA_CHARACTER_NAMES[i]}`} onPress={()=>{setS({noraCharacter:i});setTimeout(()=>setModal(null),380)}} style={[styles.noraCharacterCard,styles.noraCharacterCompactCard,{width:characterCardWidth},characterIndex===i&&styles.noraCharacterCardActive]}><Image source={src} style={styles.noraCharacterChoiceImage}/>{characterIndex===i&&<View style={styles.noraCharacterSelectionTick}><Ionicons name="checkmark" size={17} color="#06111a"/></View>}</MagicPressable>)}</View></SelectionModal>}
    {modal==='mood'&&<SelectionModal title="حال‌وهوای نورا" onClose={()=>setModal(null)}><View style={styles.modalGrid}>{moods.map((m,i)=><MagicPressable key={m[1]} onPress={()=>choose('noraMood',i)} style={[styles.presetIconCard,Number(s.noraMood||0)===i&&styles.presetIconCardActive,{borderColor:m[2]}]}><Ionicons name={m[0] as any} size={32} color={m[2]}/><Text style={styles.modalCardText}>{m[1]}</Text>{Number(s.noraMood||0)===i&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>)}</View></SelectionModal>}
    {modal==='output'&&<SelectionModal title="پخش پاسخ نورا" onClose={()=>setModal(null)}><View style={styles.modalGrid}>{[['volume-high-outline','اسپیکر','speaker'],['phone-portrait-outline','گوشی','phone']].map(([ic,l,v])=><MagicPressable key={v} onPress={()=>choose('noraOutput',v)} style={[styles.presetIconCard,s.noraOutput===v&&styles.presetIconCardActive,{borderColor:'#63e8ff'}]}><Ionicons name={ic as any} size={32} color="#63e8ff"/><Text style={styles.modalCardText}>{l}</Text>{s.noraOutput===v&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>)}</View></SelectionModal>}
    {modal==='mode'&&<SelectionModal title="حالت نورا" onClose={()=>setModal(null)}><View style={styles.modalGrid}>{[['cloud-done-outline','آنلاین','online'],['cloud-offline-outline','آفلاین','offline']].map(([ic,l,v])=><MagicPressable key={v} onPress={()=>choose('noraMode',v)} style={[styles.presetIconCard,s.noraMode===v&&styles.presetIconCardActive,{borderColor:v==='online'?'#72ffc5':'#b28cff'}]}><Ionicons name={ic as any} size={32} color={v==='online'?'#72ffc5':'#b28cff'}/><Text style={styles.modalCardText}>{l}</Text>{s.noraMode===v&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>)}</View><Text style={styles.muted}>فرمان‌های محلی هم در حالت آنلاین اجرا می‌شوند. پرسش آنلاین به اتصال اینترنت و سرویس معتبر نیاز دارد.</Text><MagicPressable style={styles.saveButton} onPress={()=>setModal(null)}><Ionicons name="checkmark-circle" size={20} color="#fff"/><Text style={styles.saveButtonText}>تأیید</Text></MagicPressable></SelectionModal>}
  </View></KeyboardAvoidingView>;
}
function DjLed({on,color='#64f5ff'}:{on:boolean;color?:string;key?:React.Key}){return <View style={[styles.djLed,{backgroundColor:on?color:'#5b1520',shadowColor:on ? color : '#5b1520',shadowOpacity:on ? .9 : .15,shadowRadius:on ? 9 : 2}]}/>}
function DjKnob({label,value,onChange,onChanging,color='#64f5ff',displayValue}:{label:string;value:number;onChange:(v:number)=>void;onChanging?:(v:number)=>void;color?:string;displayValue?:string;key?:React.Key}){
  const [liveValue,setLiveValue]=useState(Math.max(0,Math.min(100,value)));
  const valueRef=useRef(liveValue);
  const startRef=useRef(liveValue);
  useEffect(()=>{const n=Math.max(0,Math.min(100,value));valueRef.current=n;setLiveValue(n);},[value]);
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dy)>1,
    onPanResponderGrant:()=>{startRef.current=valueRef.current;},
    onPanResponderMove:(_,g)=>{const n=Math.round(Math.max(0,Math.min(100,startRef.current-g.dy*.62)));valueRef.current=n;setLiveValue(n);onChanging?.(n);},
    onPanResponderRelease:()=>onChange(Math.round(valueRef.current)),
    onPanResponderTerminationRequest:()=>false,
  }),[onChange,onChanging]);
  const angle=-135+(liveValue/100)*270;
  return <View style={styles.djKnobWrap} {...responder.panHandlers} accessibilityRole="adjustable" accessibilityLabel={label}>
    <View style={[styles.djKnob,{borderColor:color,shadowColor:color}]}><View style={[styles.djKnobRotator,{transform:[{rotate:`${angle}deg`}]}]}><View style={[styles.djKnobMark,{backgroundColor:color}]}/></View><View style={styles.djKnobCenter}/></View>
    <Text style={styles.djControlLabel}>{label}</Text><Text style={[styles.djControlValue,{color}]}>{displayValue??Math.round(liveValue)}</Text><DjLed on={liveValue>0} color={color}/>
  </View>;
}
function DjWheel({side,onSeek,onRate,color}:{side:'L'|'R';onSeek?:(delta:number)=>void;onRate?:(delta:number)=>void;color:string;key?:React.Key}){
  const spin=useRef(new Animated.Value(0)).current; const lastX=useRef(0); const lastY=useRef(0);
  const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:(_,g)=>{lastX.current=g.x0;lastY.current=g.y0;},onPanResponderMove:(_,g)=>{const dx=g.moveX-lastX.current;const dy=g.moveY-lastY.current;lastX.current=g.moveX;lastY.current=g.moveY;spin.setValue((Number((spin as any).__value)||0)+dx*.9);if(side==='L')onSeek?.(dx*.12);else onRate?.(dx*.0025-dy*.001);},onPanResponderRelease:()=>{}}),[side,onSeek,onRate,spin]);
  return <View style={styles.djWheelWrap} {...responder.panHandlers}><View style={[styles.djWheel,{borderColor:color,shadowColor:color}]}><View style={styles.djWheelTicks}>{Array.from({length:24},(_,i)=><View key={i} style={[styles.djWheelTick,{transform:[{rotate:`${i*15}deg`},{translateY:-45}]}]}/>)}</View><View style={[styles.djWheelInner,{borderColor:color}]}><Text style={[styles.djWheelLetter,{color}]}>{side}</Text><Text style={styles.djWheelHint}>{side==='L'?'JOG / CUE':'TEMPO / NUDGE'}</Text></View><DjLed on={true} color={color}/></View></View>
}
function DjPad({icon,label,onPress,on,color}:{icon:string;label:string;onPress:()=>void;on:boolean;color:string;key?:React.Key}){return <MagicPressable onPress={onPress} style={[styles.djPad,{borderColor:color,shadowColor:color,backgroundColor:on?`${color}28`:'rgba(7,9,25,.86)'}]}><Ionicons name={icon as any} size={20} color={on?color:'#fff'}/><Text style={styles.djPadLabel}>{label}</Text><DjLed on={on} color={color}/></MagicPressable>}
function EqVisualizer({bars,mode,color,sensitivity=1}:{bars:number[];mode:number;color:string;sensitivity?:number}){
  const values=bars.slice(0,24).map(v=>Math.max(0,Math.min(100,Number(v)||0)));
  const avg=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
  const hasSignal=values.length>0&&avg>=1;
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{pulse.stopAnimation();if(!hasSignal){pulse.setValue(0);return;}pulse.setValue(0);const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:420,useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:420,useNativeDriver:true})]));loop.start();return()=>loop.stop();},[pulse,hasSignal]);
  const scale=pulse.interpolate({inputRange:[0,1],outputRange:[.94,1.04]});
  const heightFor=(v:number)=>Math.max(4,Math.min(210,v*1.55*sensitivity));
  return <View style={styles.djVisualizerStage}><View style={styles.djVisualizerGlow}/>{!hasSignal?<View style={{alignItems:'center',gap:10,padding:22}}><Ionicons name="musical-notes-outline" size={42} color={color}/><Text style={{color:'rgba(255,255,255,.82)',fontSize:11,textAlign:'center'}}>برای واکنش واقعیِ نور و موج، آهنگ را از آوای نوا یا دی‌جی پخش کن. اگر طیف‌نما فعال نشد، اجازهٔ سیستمی تحلیل صدا لازم است؛ صدای محیط ضبط نمی‌شود.</Text></View>:mode===2?<Animated.View style={{alignItems:'center',justifyContent:'center',transform:[{scale}]}}><View style={{width:Math.min(230,105+avg*1.2),height:Math.min(230,105+avg*1.2),borderRadius:140,borderWidth:2,borderColor:color,alignItems:'center',justifyContent:'center',shadowColor:color,shadowOpacity:.9,shadowRadius:30,backgroundColor:`${color}12`}}><View style={{width:Math.min(145,40+avg*.78),height:Math.min(145,40+avg*.78),borderRadius:100,borderWidth:2,borderColor:'#ff79c8',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(6,9,28,.86)'}}><Ionicons name="pulse" size={Math.min(48,24+avg*.24)} color={color}/></View></View><Text style={{color:'#fff',fontWeight:'900',fontSize:11,marginTop:15}}>نبض صوتی زنده • {Math.round(avg)}%</Text></Animated.View>:mode===3?<View style={{width:'90%',height:220,flexDirection:'row',alignItems:'center',justifyContent:'space-around'}}>{values.map((v,i)=><View key={i} style={{height:heightFor(v),width:Math.max(4,Math.min(11,100/values.length)),borderRadius:8,backgroundColor:i%3===0?'#64f5ff':i%3===1?'#ff79c8':'#b28cff',shadowColor:color,shadowOpacity:.8,shadowRadius:9,alignSelf:'center'}}/>)}</View>:<View style={{height:220,width:'90%',flexDirection:'row',alignItems:'flex-end',justifyContent:'center',gap:mode===1?8:4}}>{(mode===1?Array.from({length:12},(_,i)=>Math.max(...values.slice(Math.floor(i*values.length/12),Math.max(Math.floor((i+1)*values.length/12),Math.floor(i*values.length/12)+1)))):values).map((v,i)=><View key={i} style={{height:heightFor(v),width:mode===1?16:8,borderRadius:7,backgroundColor:i%3===0?'#64f5ff':i%3===1?'#ff79c8':'#b28cff',shadowColor:color,shadowOpacity:.65,shadowRadius:8}}/>)}</View>}<Text style={styles.djVisualizerCaption}>{mode===0?'طیف فرکانس':mode===1?'ستون‌های رقص نور':mode===2?'نبض صوتی زنده':'موج صوتی آینه‌ای'}</Text></View>
}
function DjTurntable({label,color,playing,powered,ledsOn=true,onJog}:{label:'A'|'B';color:string;playing:boolean;powered:boolean;ledsOn?:boolean;onJog:(deltaSeconds:number)=>void}){
  const spin=useRef(new Animated.Value(0)).current;
  const lastX=useRef(0);
  const onJogRef=useRef(onJog); onJogRef.current=onJog;
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>1||Math.abs(g.dy)>1,
    onPanResponderGrant:(_,g)=>{lastX.current=g.moveX;},
    onPanResponderMove:(_,g)=>{const dx=g.moveX-lastX.current;lastX.current=g.moveX;if(Math.abs(dx)>.25)onJogRef.current(dx*.035);},
    onPanResponderTerminationRequest:()=>false,
    onPanResponderRelease:()=>{},
  }),[]);
  useEffect(()=>{
    spin.stopAnimation();
    spin.setValue(0);
    if(!playing||!powered)return;
    const loop=Animated.loop(Animated.timing(spin,{toValue:1,duration:1850,useNativeDriver:true}));
    loop.start();
    return()=>loop.stop();
  },[spin,playing,powered]);
  const rotation=spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return <View style={styles.eqPlatterWrap} {...responder.panHandlers} accessibilityLabel={`دیسک لمسی Deck ${label}`}>
    <Animated.View style={[styles.eqPlatterOuter,{borderColor:color,shadowColor:color,shadowOpacity:powered?.82:.16,transform:[{rotate:rotation}]}]}>
      <View style={styles.eqPlatterRing}/>
      <View style={styles.eqPlatterTicks}>{Array.from({length:36},(_,i)=><View key={i} style={[styles.eqPlatterTick,{transform:[{rotate:`${i*10}deg`},{translateY:-73}]}]}/>)}</View>
      {Array.from({length:5},(_,i)=><View key={`groove-${i}`} style={[styles.eqPlatterGroove,{width:104+i*22,height:104+i*22,borderColor:`${color}${i%2?'32':'48'}`}]} />)}
      <View style={[styles.eqPlatterInner,{borderColor:color}]}>
        <View style={[styles.eqPlatterCore,{backgroundColor:`${color}26`,borderColor:color}]}><Ionicons name="disc" size={42} color={color}/></View>
        <Text style={[styles.eqPlatterLabel,{color}]}>{label}</Text>
        <Text style={styles.eqPlatterSub}>TOUCH / JOG</Text>
      </View>
    </Animated.View>
    <View style={[styles.eqPlatterPowerRing,{borderColor:powered&&ledsOn?color:'rgba(255,255,255,.18)',shadowColor:color,shadowOpacity:powered&&ledsOn?.85:0}]}/>
    <Text style={[styles.eqPlatterHint,{color:powered?color:'rgba(255,255,255,.45)'}]}>{playing?'در حال چرخش':powered?'آمادهٔ لمس':'DJ خاموش'}</Text>
  </View>;
}
function Equalizer({s,setS,onBack}:{s:any;setS:(p:any)=>void;onBack:()=>void}){
  const {width,height}=useWindowDimensions();
  const [tab,setTab]=useState(0);
  const [bars,setBars]=useState<number[]>([]);
  const [musicTracks,setMusicTracks]=useState<MusicLibraryTrack[]>([]);
  const [musicStatus,setMusicStatus]=useState<any>({playing:false,loading:false,uri:'',title:'',artist:''});
  const [libraryLoading,setLibraryLoading]=useState(true);
  const [libraryError,setLibraryError]=useState('');
  const [showSettings,setShowSettings]=useState(false);
  const [settingsBusy,setSettingsBusy]=useState(false);
  const [eqVolume,setEqVolume]=useState(Math.max(0,Math.min(100,Number(s.eqVolume??80))));
  const [eqRate,setEqRate]=useState(Math.max(50,Math.min(150,Number(s.eqRate??100))));
  const [eqBands,setEqBands]=useState<number[]>(Array.isArray(s.eqBandLevels)&&s.eqBandLevels.length===5?s.eqBandLevels:[0,0,0,0,0]);
  const [bassBoost,setBassBoost]=useState(!!s.eqBassBoost);
  const [eqPresetName,setEqPresetName]=useState(String(s.eqPresetName||'متعادل'));
  const [djOn,setDjOn]=useState(!!s.djPower);
  const [djTarget,setDjTarget]=useState<0|1>(0);
  const [cross,setCross]=useState(Math.max(0,Math.min(100,Number(s.djCrossfader??50))));
  const [master,setMaster]=useState(Math.max(0,Math.min(100,Number(s.djMasterVolume??90))));
  const [bpm,setBpm]=useState(Math.max(60,Math.min(200,Number(s.djBpm??120))));
  const [deckA,setDeckA]=useState<any>({loaded:false,loading:false,playing:false,volume:Number(s.djDeckAVolume??80),rate:Number(s.djDeckARate??100),eq:Array.isArray(s.djDeckAEq)?s.djDeckAEq:[0,0,0],bass:!!s.djDeckABass,title:String(s.djDeckATitle||'Deck A — آهنگی انتخاب نشده'),uri:String(s.djDeckAUri||'')});
  const [deckB,setDeckB]=useState<any>({loaded:false,loading:false,playing:false,volume:Number(s.djDeckBVolume??80),rate:Number(s.djDeckBRate??100),eq:Array.isArray(s.djDeckBEq)?s.djDeckBEq:[0,0,0],bass:!!s.djDeckBBass,title:String(s.djDeckBTitle||'Deck B — آهنگی انتخاب نشده'),uri:String(s.djDeckBUri||'')});
  const [position,setPosition]=useState({a:0,b:0,da:0,db:0});
  const [loopA,setLoopA]=useState<any>(null); const [loopB,setLoopB]=useState<any>(null);
  const loopRef=useRef<any>({a:null,b:null}); loopRef.current={a:loopA,b:loopB};
  const [visualMode,setVisualMode]=useState(Math.max(0,Math.min(3,Number(s.eqVisualMode??1))));
  const [sensitivity,setSensitivity]=useState(Math.max(.5,Math.min(2,Number(s.eqVisualSensitivity??1))));
  const pageKey=tab===0?'sound':tab===1?'dj':'lights';
  const pageNames=['تنظیم صدا','NOVA DJ','رقص نور'];
  const defaultColors=['#64f5ff','#ff79c8','#72ffc5'];
  const accent=String(s.eqPageColors?.[pageKey]||defaultColors[tab]);
  const pageBackground=String(s.eqPageBackgrounds?.[pageKey]||'');
  const pageBackgroundKind=String(s.eqPageBackgroundKinds?.[pageKey]||'image');
  const presets=[
    {name:'متعادل',values:[0,0,0,0,0]},
    {name:'باس عمیق',values:[72,52,8,-8,-14]},
    {name:'صدای خواننده',values:[-12,-4,42,38,12]},
    {name:'شفاف و روشن',values:[-10,-6,4,32,56]},
    {name:'شب کلاب',values:[62,26,-8,20,45]},
  ];
  const musicTitle=String(musicStatus.title||s.musicTrackTitle||'آهنگی در حال پخش نیست');
  const musicArtist=String(musicStatus.artist||s.musicTrackArtist||'از فهرست گوشی یک آهنگ انتخاب کن');
  const clock=(ms:number)=>{const sec=Math.max(0,Math.floor((Number(ms)||0)/1000));return `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`};
  const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(v)));

  const refreshTracks=async()=>{
    setLibraryLoading(true);setLibraryError('');
    try{
      if(Platform.OS==='android'){
        const permission=Number(Platform.Version)>=33?'android.permission.READ_MEDIA_AUDIO':PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        let granted=await PermissionsAndroid.check(permission as any);
        if(!granted){const result=await PermissionsAndroid.request(permission as any,{title:'دسترسی موسیقی برای اکولایزر',message:'برای نمایش و انتخاب آهنگ‌های واقعی گوشی در اکولایزر و مانیتور DJ، اجازهٔ خواندن فهرست موسیقی لازم است.',buttonPositive:'اجازه می‌دهم',buttonNegative:'فعلاً نه'});granted=result===PermissionsAndroid.RESULTS.GRANTED;}
        if(!granted){setMusicTracks([]);setLibraryError('اجازهٔ خواندن کتابخانهٔ موسیقی داده نشده است. آهنگ را از آوای نوا پخش کن یا اجازه را فعال کن.');return;}
      }
      const list=await DjAudio.listTracks();
      setMusicTracks(Array.isArray(list)?list:[]);
      if(Array.isArray(list)&&list.length)await DjAudio.setMusicQueue(list);
      if(!Array.isArray(list)||!list.length)setLibraryError('در کتابخانهٔ رسانه گوشی آهنگی پیدا نشد.');
    }catch{setLibraryError('خواندن فهرست موسیقی ناموفق بود؛ دوباره تلاش کن.');}
    finally{setLibraryLoading(false);}
  };

  useEffect(()=>{
    let alive=true;
    let lastFrame=0;
    const sub=DjAudio.subscribe((values)=>{const now=Date.now();if(now-lastFrame<66)return;lastFrame=now;if(alive)setBars(Array.isArray(values)?values.map((v)=>Math.max(0,Math.min(100,Number(v)||0))):[]);});
    return()=>{alive=false;sub.remove?.()};
  },[]);
  useEffect(()=>{
    // A paused player has no current output spectrum; don't leave a frozen light show on screen.
    if(!musicStatus.playing&&!deckA.playing&&!deckB.playing){
      setBars((previous)=>previous.some((value)=>value!==0)?[]:previous);
    }
  },[musicStatus.playing,deckA.playing,deckB.playing]);
  useEffect(()=>{void refreshTracks();},[]);
  useEffect(()=>{
    if(tab!==2||Platform.OS!=='android')return;
    let alive=true;
    const requestSpectrumPermission=async()=>{
      try{
        const permission=PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
        let granted=await PermissionsAndroid.check(permission);
        if(!granted){const result=await PermissionsAndroid.request(permission,{title:'تحلیل طیف آهنگ برای رقص نور',message:'اندروید برای خواندن طیف صدای آهنگِ پخش‌شده اجازهٔ RECORD_AUDIO می‌خواهد. این بخش صدای محیط را ضبط یا ذخیره نمی‌کند.',buttonPositive:'اجازه می‌دهم',buttonNegative:'فعلاً نه'});granted=result===PermissionsAndroid.RESULTS.GRANTED;}
        if(alive&&!granted)Alert.alert('رقص نور','بدون مجوز سیستمی، Android ممکن است دادهٔ طیف واقعی را ندهد. می‌توانی بعداً از تنظیمات برنامه اجازه را فعال کنی.');
      }catch{}
    };
    void requestSpectrumPermission();
    return()=>{alive=false};
  },[tab]);
  useEffect(()=>{
    let alive=true;
    const tick=async()=>{try{const status=await DjAudio.getMusicStatus();if(!alive)return;setMusicStatus((prev:any)=>{
      const next={playing:!!status?.playing,loading:!!status?.loading,uri:String(status?.uri||''),title:String(status?.title||''),artist:String(status?.artist||'')};
      return prev.playing===next.playing&&prev.loading===next.loading&&prev.uri===next.uri&&prev.title===next.title&&prev.artist===next.artist?prev:next;
    });}catch{}};
    void tick();const timer=setInterval(()=>void tick(),1000);
    return()=>{alive=false;clearInterval(timer)};
  },[]);
  useEffect(()=>{
    let alive=true;let running=false;
    const tick=async()=>{
      if(running)return;running=true;
      try{
        const [a,b]=await Promise.all([DjAudio.getDeckStatus(0),DjAudio.getDeckStatus(1)]);
        if(!alive)return;
        setDeckA((prev:any)=>{const next={...prev,loaded:!!a?.loaded,loading:!!a?.loading,playing:!!a?.playing,uri:String(a?.uri||prev.uri||'')};return prev.loaded===next.loaded&&prev.loading===next.loading&&prev.playing===next.playing&&prev.uri===next.uri?prev:next;});
        setDeckB((prev:any)=>{const next={...prev,loaded:!!b?.loaded,loading:!!b?.loading,playing:!!b?.playing,uri:String(b?.uri||prev.uri||'')};return prev.loaded===next.loaded&&prev.loading===next.loading&&prev.playing===next.playing&&prev.uri===next.uri?prev:next;});
        setPosition((prev)=>{
          const next={a:Number(a?.positionMs||0),b:Number(b?.positionMs||0),da:Number(a?.durationMs||0),db:Number(b?.durationMs||0)};
          return Math.abs(prev.a-next.a)<250&&Math.abs(prev.b-next.b)<250&&prev.da===next.da&&prev.db===next.db?prev:next;
        });
        const loops=loopRef.current;
        if(a?.playing&&loops.a&&Number(a?.positionMs||0)>=Number(loops.a.endMs||0))await DjAudio.seekDeck(0,(Number(loops.a.startMs||0)-Number(a?.positionMs||0))/1000);
        if(b?.playing&&loops.b&&Number(b?.positionMs||0)>=Number(loops.b.endMs||0))await DjAudio.seekDeck(1,(Number(loops.b.startMs||0)-Number(b?.positionMs||0))/1000);
      }catch{}finally{running=false;}
    };
    void tick();const timer=setInterval(()=>void tick(),600);
    return()=>{alive=false;clearInterval(timer)};
  },[]);
  // Reload saved Deck media once. Loaded state is taken from the native Prepared callback, never from a URI alone.
  useEffect(()=>{
    let alive=true;
    const restore=async(deck:0|1,uri:string,title:string)=>{
      if(!uri)return;
      if(deck===0)setDeckA((x:any)=>({...x,loading:true,loaded:false,playing:false,uri,title:title||x.title}));
      else setDeckB((x:any)=>({...x,loading:true,loaded:false,playing:false,uri,title:title||x.title}));
      const ok=await DjAudio.loadDeck(deck,uri);
      if(!alive)return;
      if(!ok){if(deck===0)setDeckA((x:any)=>({...x,loading:false,loaded:false,playing:false}));else setDeckB((x:any)=>({...x,loading:false,loaded:false,playing:false}));}
    };
    void restore(0,String(s.djDeckAUri||''),String(s.djDeckATitle||''));
    void restore(1,String(s.djDeckBUri||''),String(s.djDeckBTitle||''));
    return()=>{alive=false};
  // Restore just once on mount; later edits are explicit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{
    if(!musicStatus.uri)return;
    let alive=true;
    const apply=async()=>{
      try{
        await Promise.all(eqBands.map((v,i)=>DjAudio.setEqBand(i,v)));
        await DjAudio.setBassBoost(bassBoost);
        await DjAudio.setVolume(eqVolume/100);
        await DjAudio.setRate(eqRate/100);
      }catch{}
    };
    const timer=setTimeout(()=>{if(alive)void apply()},320);
    return()=>{alive=false;clearTimeout(timer)};
  // Settings should re-apply when a new song becomes active; each control applies immediately below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[musicStatus.uri]);
  useEffect(()=>{setS({eqVolume,eqRate,eqBandLevels:eqBands,eqBassBoost:bassBoost,eqPresetName});},[eqVolume,eqRate,eqBands,bassBoost,eqPresetName]);
  useEffect(()=>{setS({djPower:djOn,djCrossfader:cross,djMasterVolume:master,djBpm:bpm,djDeckAVolume:deckA.volume,djDeckBVolume:deckB.volume,djDeckARate:deckA.rate,djDeckBRate:deckB.rate,djDeckAEq:deckA.eq,djDeckBEq:deckB.eq,djDeckABass:deckA.bass,djDeckBBass:deckB.bass,djDeckAUri:deckA.uri,djDeckBUri:deckB.uri,djDeckATitle:deckA.title,djDeckBTitle:deckB.title});},[djOn,cross,master,bpm,deckA.volume,deckB.volume,deckA.rate,deckB.rate,deckA.eq,deckB.eq,deckA.bass,deckB.bass,deckA.uri,deckB.uri,deckA.title,deckB.title]);

  const applyMix=async(nextCross=cross,nextMaster=master,nextAVol=deckA.volume,nextBVol=deckB.volume,nextPower=djOn)=>{
    const a=nextPower?((100-nextCross)/100)*(nextMaster/100)*(nextAVol/100):0;
    const b=nextPower?(nextCross/100)*(nextMaster/100)*(nextBVol/100):0;
    await Promise.all([DjAudio.setDeckVolume(0,a),DjAudio.setDeckVolume(1,b)]);
  };
  useEffect(()=>{void applyMix();},[djOn,cross,master,deckA.volume,deckB.volume,deckA.loaded,deckB.loaded]);
  useEffect(()=>{
    if(!deckA.loaded)return;
    void Promise.all(deckA.eq.map((v:number,i:number)=>DjAudio.setDeckEqBand(0,i,v)));
    void DjAudio.setDeckRate(0,deckA.rate/100);void DjAudio.setDeckBassBoost(0,deckA.bass);
  },[deckA.loaded]);
  useEffect(()=>{
    if(!deckB.loaded)return;
    void Promise.all(deckB.eq.map((v:number,i:number)=>DjAudio.setDeckEqBand(1,i,v)));
    void DjAudio.setDeckRate(1,deckB.rate/100);void DjAudio.setDeckBassBoost(1,deckB.bass);
  },[deckB.loaded]);

  const setBandValue=async(index:number,value:number)=>{
    const next=[...eqBands];next[index]=clamp(value,-100,100);setEqBands(next);setS({eqBandLevels:next});
    const ok=await DjAudio.setEqBand(index,next[index]);
    if(!ok&&!musicStatus.uri){} // Settings remain saved and are re-applied when a track is started.
  };
  const applySoundPreset=async(preset:any)=>{
    setEqPresetName(preset.name);setEqBands([...preset.values]);setS({eqPresetName:preset.name,eqBandLevels:[...preset.values]});
    await Promise.all(preset.values.map((v:number,i:number)=>DjAudio.setEqBand(i,v)));
  };
  const setEqVol=async(v:number)=>{const val=clamp(v,0,100);setEqVolume(val);setS({eqVolume:val});await DjAudio.setVolume(val/100);};
  const setEqPlaybackRate=async(v:number)=>{const val=Math.max(50,Math.min(150,Math.round(v)));setEqRate(val);setS({eqRate:val});await DjAudio.setRate(val/100);};
  const setBass=async(v:boolean)=>{setBassBoost(v);setS({eqBassBoost:v});await DjAudio.setBassBoost(v);};
  const playLibraryTrack=async(track:MusicLibraryTrack)=>{
    try{
      await DjAudio.setMusicQueue(musicTracks);
      const ok=await DjAudio.playMusicTrack(track.uri,track.title,track.artist||'');
      if(!ok)throw new Error('native audio service unavailable');
      setS({musicTrackUri:track.uri,musicTrackTitle:track.title,musicTrackArtist:track.artist||'',playing:true});
      setMusicStatus({playing:true,loading:true,uri:track.uri,title:track.title,artist:track.artist||''});
      setTimeout(()=>{void Promise.all(eqBands.map((v,i)=>DjAudio.setEqBand(i,v)));void DjAudio.setBassBoost(bassBoost);void DjAudio.setVolume(eqVolume/100);void DjAudio.setRate(eqRate/100)},450);
    }catch{Alert.alert('اکولایزر نوا','پخش آهنگ شروع نشد. اول آن را از آوای نوا انتخاب کن یا دوباره فهرست گوشی را بخوان.');}
  };
  const changeMaster=async(v:number)=>{const n=clamp(v,0,100);setMaster(n);setS({djMasterVolume:n});await applyMix(cross,n);};
  const changeCross=async(v:number)=>{const n=clamp(v,0,100);setCross(n);setS({djCrossfader:n});await applyMix(n,master);};
  const updateDeck=(deck:0|1,fn:(old:any)=>any)=>{(deck===0?setDeckA:setDeckB)((old:any)=>fn(old));};
  const setDeckRate=async(deck:0|1,value:number)=>{
    const n=Math.max(50,Math.min(150,Math.round(value)));
    updateDeck(deck,(x:any)=>({...x,rate:n}));setS(deck===0?{djDeckARate:n}:{djDeckBRate:n});
    const ok=await DjAudio.setDeckRate(deck,n/100);
    if(!ok&&(deck===0?deckA.loaded:deckB.loaded))Alert.alert('دی‌جی نوا','تغییر سرعت این آهنگ در موتور صوتی این دستگاه پشتیبانی نشد.');
  };
  const setDeckGain=async(deck:0|1,value:number)=>{
    const n=clamp(value,0,100);updateDeck(deck,(x:any)=>({...x,volume:n}));setS(deck===0?{djDeckAVolume:n}:{djDeckBVolume:n});
    await applyMix(cross,master,deck===0?n:deckA.volume,deck===1?n:deckB.volume);
  };
  const knobLastApply=useRef<Record<string,number>>({});
  const previewDeckKnob=(deck:0|1,kind:'tempo'|'gain',value:number)=>{
    const key=`${deck}-${kind}`;const now=Date.now();if(now-(knobLastApply.current[key]||0)<45)return;knobLastApply.current[key]=now;
    const ready=deck===0?deckA.loaded:deckB.loaded;if(!ready)return;
    if(kind==='tempo'){void DjAudio.setDeckRate(deck,(50+value)/100);return;}
    const deckGain=deck===0?((100-cross)/100):cross/100;const overall=djOn?deckGain*(master/100)*(value/100):0;void DjAudio.setDeckVolume(deck,overall);
  };
  const setDeckEq=async(deck:0|1,band:number,value:number)=>{
    const d=deck===0?deckA:deckB;const next=[...d.eq];next[band]=clamp(value,-100,100);
    updateDeck(deck,(x:any)=>({...x,eq:next}));setS(deck===0?{djDeckAEq:next}:{djDeckBEq:next});
    const ok=await DjAudio.setDeckEqBand(deck,band,next[band]);
    if(!ok&&(deck===0?deckA.loaded:deckB.loaded))Alert.alert('دی‌جی نوا','این باند اکولایزر روی Deck آماده نیست؛ بعد از آماده‌شدن آهنگ دوباره امتحان کن.');
  };
  const setDeckBass=async(deck:0|1,value:boolean)=>{updateDeck(deck,(x:any)=>({...x,bass:value}));setS(deck===0?{djDeckABass:value}:{djDeckBBass:value});await DjAudio.setDeckBassBoost(deck,value);};
  const cueDeck=async(deck:0|1)=>{if(!(deck===0?deckA.loaded:deckB.loaded)){Alert.alert('CUE','ابتدا یک آهنگ را روی این Deck بارگذاری کن.');return;}await DjAudio.cueDeck(deck);};
  const toggleDeck=async(deck:0|1)=>{
    const d=deck===0?deckA:deckB;
    if(!d.loaded){if(d.loading){Alert.alert('دی‌جی نوا','هنوز آماده‌سازی آهنگ تمام نشده؛ کمی صبر کن و دوباره بزن.');return;}if(d.uri){Alert.alert('دی‌جی نوا','این فایل در دسترس نیست. دوباره از مانیتور یا دکمهٔ LOAD انتخابش کن.');return;}await pickDeck(deck);return;}
    if(!djOn){Alert.alert('دی‌جی نوا','اول کلید روشن‌کردن دی‌جی را فعال کن.');return;}
    const ok=d.playing?await DjAudio.pauseDeck(deck):await DjAudio.playDeck(deck);
    if(!ok){Alert.alert('دی‌جی نوا','موتور صدا هنوز آماده نیست. صبر کن وضعیت Deck سبز شود.');return;}
    updateDeck(deck,(x:any)=>({...x,playing:!d.playing}));
  };
  const pickDeck=async(deck:0|1)=>{
    try{
      const r=await DocumentPicker.getDocumentAsync({type:'audio/*',copyToCacheDirectory:true,multiple:false});
      if(r.canceled||!r.assets?.[0])return;
      const a=r.assets[0];const title=String(a.name||`Deck ${deck===0?'A':'B'}`);
      let uri=String(a.uri);
      try{
        const dir=FileSystem.documentDirectory+'korosh-nova-dj/';await FileSystem.makeDirectoryAsync(dir,{intermediates:true});
        const safe=title.replace(/[^a-z0-9._-]/gi,'_').slice(-80)||'track';
        const ext=(safe.match(/\.([a-z0-9]{2,5})$/i)?.[1]||'audio').toLowerCase();
        const target=dir+`deck_${deck}_${Date.now()}_${safe.endsWith('.'+ext)?safe:`${safe}.${ext}`}`;
        await FileSystem.copyAsync({from:a.uri,to:target});
        const info=await FileSystem.getInfoAsync(target);if(info.exists)uri=target;
      }catch{}
      updateDeck(deck,(x:any)=>({...x,loading:true,loaded:false,playing:false,title,uri}));
      setS(deck===0?{djDeckAUri:uri,djDeckATitle:title,djDeckAEq:deckA.eq,djDeckARate:deckA.rate,djDeckAVolume:deckA.volume}:{djDeckBUri:uri,djDeckBTitle:title,djDeckBEq:deckB.eq,djDeckBRate:deckB.rate,djDeckBVolume:deckB.volume});
      const ok=await DjAudio.loadDeck(deck,uri);
      if(!ok){updateDeck(deck,(x:any)=>({...x,loading:false,loaded:false,playing:false}));Alert.alert('دی‌جی نوا','فایل روی Deck آماده نشد. اگر فایل از حافظه موقت بود، آهنگ را دوباره از گالری فایل انتخاب کن.');}
    }catch{Alert.alert('دی‌جی نوا','بازکردن فایل آهنگ ناموفق بود.');}
  };
  const loadTrackToDeck=async(track:MusicLibraryTrack,deck:0|1)=>{
    const uri=String(track.uri);const title=String(track.title||'آهنگ');
    updateDeck(deck,(x:any)=>({...x,loading:true,loaded:false,playing:false,title,uri}));
    setS(deck===0?{djDeckAUri:uri,djDeckATitle:title}:{djDeckBUri:uri,djDeckBTitle:title});
    const ok=await DjAudio.loadDeck(deck,uri);
    if(!ok){updateDeck(deck,(x:any)=>({...x,loading:false,loaded:false,playing:false}));Alert.alert('دی‌جی نوا','این آهنگ روی Deck آماده نشد؛ از دکمهٔ LOAD فایل را انتخاب کن.');}
  };
  const togglePower=async()=>{
    if(!djOn){
      await DjAudio.pauseMusic();setS({playing:false,djPower:true});setDjOn(true);
      Alert.alert('NOVA DJ','موتور دو Deck روشن شد. برای جلوگیری از تداخل صدا، پخش اصلی آوای نوا مکث شد.');
    }else{
      await Promise.all([DjAudio.pauseDeck(0),DjAudio.pauseDeck(1)]);setDeckA((x:any)=>({...x,playing:false}));setDeckB((x:any)=>({...x,playing:false}));setDjOn(false);setS({djPower:false});
    }
  };
  const toggleLoop=async(deck:0|1)=>{
    const current=deck===0?loopA:loopB;
    if(current){if(deck===0)setLoopA(null);else setLoopB(null);return;}
    const pos=deck===0?position.a:position.b;
    const duration=4*60/Math.max(60,bpm);
    const loop={startMs:Math.max(0,pos),endMs:Math.max(0,pos)+duration*1000};
    if(deck===0)setLoopA(loop);else setLoopB(loop);
  };
  const saveMix=async(slot:number)=>{
    const old=s.djMixSlots&&typeof s.djMixSlots==='object'?s.djMixSlots:{};
    const saved={name:`میکس ${slot+1}`,cross,master,bpm,djOn,deckA:{uri:deckA.uri,title:deckA.title,volume:deckA.volume,rate:deckA.rate,eq:[...deckA.eq],bass:deckA.bass},deckB:{uri:deckB.uri,title:deckB.title,volume:deckB.volume,rate:deckB.rate,eq:[...deckB.eq],bass:deckB.bass},savedAt:new Date().toISOString()};
    setS({djMixSlots:{...old,[String(slot)]:saved}});Alert.alert('ذخیره شد',`تنظیمات و دو آهنگِ میکس ${slot+1} در حافظهٔ برنامه ذخیره شد.`);
  };
  const loadMix=async(slot:number)=>{
    const saved=s.djMixSlots?.[String(slot)];if(!saved){Alert.alert('میکس خالی است','ابتدا تنظیمات را در این خانه ذخیره کن.');return;}
    setCross(clamp(saved.cross??50,0,100));setMaster(clamp(saved.master??90,0,100));setBpm(clamp(saved.bpm??120,60,200));setDjOn(!!saved.djOn);
    const setSavedDeck=(deck:0|1,v:any)=>{
      updateDeck(deck,(x:any)=>({...x,loaded:false,loading:!!v?.uri,playing:false,uri:String(v?.uri||''),title:String(v?.title||`Deck ${deck===0?'A':'B'}`),volume:Number(v?.volume??80),rate:Number(v?.rate??100),eq:Array.isArray(v?.eq)?v.eq:[0,0,0],bass:!!v?.bass}));
    };
    setSavedDeck(0,saved.deckA);setSavedDeck(1,saved.deckB);
    setS({djPower:!!saved.djOn,djCrossfader:clamp(saved.cross??50,0,100),djMasterVolume:clamp(saved.master??90,0,100),djBpm:clamp(saved.bpm??120,60,200),djDeckAUri:saved.deckA?.uri||'',djDeckATitle:saved.deckA?.title||'',djDeckAVolume:saved.deckA?.volume??80,djDeckARate:saved.deckA?.rate??100,djDeckAEq:saved.deckA?.eq||[0,0,0],djDeckABass:!!saved.deckA?.bass,djDeckBUri:saved.deckB?.uri||'',djDeckBTitle:saved.deckB?.title||'',djDeckBVolume:saved.deckB?.volume??80,djDeckBRate:saved.deckB?.rate??100,djDeckBEq:saved.deckB?.eq||[0,0,0],djDeckBBass:!!saved.deckB?.bass});
    if(saved.djOn){await DjAudio.pauseMusic();}
    const uriA=String(saved.deckA?.uri||''),uriB=String(saved.deckB?.uri||'');
    if(uriA){const ok=await DjAudio.loadDeck(0,uriA);if(!ok)Alert.alert('میکس','فایل Deck A ذخیره شده اما دیگر در دسترس نیست؛ دوباره LOAD کن.');}
    if(uriB){const ok=await DjAudio.loadDeck(1,uriB);if(!ok)Alert.alert('میکس','فایل Deck B ذخیره شده اما دیگر در دسترس نیست؛ دوباره LOAD کن.');}
  };
  const updateEqBg=async(kind:'image'|'gif')=>{
    setSettingsBusy(true);
    try{
      // Expo documents animated GIF retention on Android only when quality=1 and cropping/editing is disabled.
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
      if(result.canceled||!result.assets?.[0])return;
      const asset=result.assets[0];const gif=isGifAsset(asset);
      if(kind==='gif'&&!gif){Alert.alert('GIF لازم است','برای پس‌زمینه متحرک، فایل واقعی با فرمت GIF انتخاب کن.');return;}
      if(kind==='image'&&gif){Alert.alert('تصویر ثابت لازم است','برای این گزینه یک عکس ثابت انتخاب کن؛ فایل GIF را از گزینهٔ متحرک ثبت کن.');return;}
      const saved=await persistGalleryUri(asset.uri,`eq_${pageKey}_${kind}`,asset.fileName||undefined,asset.mimeType||undefined);
      setS({eqPageBackgrounds:{...(s.eqPageBackgrounds||{}),[pageKey]:saved},eqPageBackgroundKinds:{...(s.eqPageBackgroundKinds||{}),[pageKey]:kind}});
    }catch{Alert.alert('پس‌زمینه','انتخاب یا ذخیرهٔ تصویر انجام نشد.');}
    finally{setSettingsBusy(false);}
  };
  const resetEqBg=()=>{setS({eqPageBackgrounds:{...(s.eqPageBackgrounds||{}),[pageKey]:''},eqPageBackgroundKinds:{...(s.eqPageBackgroundKinds||{}),[pageKey]:'image'}});};
  const colors=['#64f5ff','#b28cff','#ff79c8','#72ffc5','#ffd166','#ff654f','#f3f5ff'];
  const currentMixes=s.djMixSlots&&typeof s.djMixSlots==='object'?s.djMixSlots:{};

  const renderDeck=(deck:0|1,color:string)=>{
    const d=deck===0?deckA:deckB;const pos=deck===0?position.a:position.b;const dur=deck===0?position.da:position.db;const loop=deck===0?loopA:loopB;
    return <View key={deck} style={[styles.eqDeckPanel,{borderColor:djOn?`${color}b8`:'rgba(255,255,255,.16)',shadowColor:color,shadowOpacity:djOn?.42:0}]}>
      <View style={styles.eqDeckTop}><View style={{flex:1}}><Text style={[styles.eqDeckName,{color}]}>DECK {deck===0?'A':'B'}</Text><Text numberOfLines={1} style={styles.eqDeckSong}>{d.title}</Text></View><View style={[styles.eqDeckState,{backgroundColor:d.loading?'#ffd166':d.playing?'#72ffc5':d.loaded?'#64f5ff':'#6d263e',shadowColor:d.loading?'#ffd166':d.playing?'#72ffc5':color}]}/></View>
      <DjTurntable label={deck===0?'A':'B'} color={color} playing={d.playing} powered={djOn} ledsOn={!!s.eqDjLeds} onJog={(delta)=>{if(d.loaded&&djOn)void DjAudio.seekDeck(deck,delta)}}/>
      <View style={styles.eqDeckTime}><Text style={styles.eqDeckTimeText}>{clock(pos)}</Text><Text style={styles.eqDeckTimeText}>{d.loading?'در حال آماده‌سازی':d.loaded?'آماده':'فایلی بارگذاری نشده'}</Text><Text style={styles.eqDeckTimeText}>{clock(dur)}</Text></View>
      <View style={styles.eqDeckWave}>{Array.from({length:24},(_,i)=>{const v=Math.max(5,Math.min(100,Number(bars[i%Math.max(1,bars.length)]||5)*(i%3===0?1.15:.78)));return <View key={i} style={[styles.eqDeckWaveBar,{height:`${v}%`,backgroundColor:djOn?color:'rgba(255,255,255,.2)'}]}/>})}</View>
      <View style={styles.eqDeckTransport}>
        <MagicPressable onPress={()=>void pickDeck(deck)} style={[styles.eqDeckButton,{borderColor:color}]}><Ionicons name="folder-open-outline" size={17} color={color}/><Text style={styles.eqDeckButtonText}>LOAD</Text></MagicPressable>
        <MagicPressable disabled={!d.loaded||d.loading} onPress={()=>void toggleDeck(deck)} style={[styles.eqDeckButton,{borderColor:d.playing?'#72ffc5':color,backgroundColor:d.playing?'rgba(114,255,197,.12)':'rgba(255,255,255,.04)',opacity:(!d.loaded||d.loading)?0.48:1}]}><Ionicons name={d.playing?'pause':'play'} size={17} color={d.playing?'#72ffc5':color}/><Text style={styles.eqDeckButtonText}>{d.playing?'PAUSE':'PLAY'}</Text></MagicPressable>
        <MagicPressable disabled={!d.loaded} onPress={()=>{void DjAudio.stopDeck(deck);updateDeck(deck,(x:any)=>({...x,playing:false}));}} style={[styles.eqDeckButton,{borderColor:'#ff79c8',opacity:d.loaded?1:.42}]}><Ionicons name="stop" size={17} color="#ff79c8"/><Text style={styles.eqDeckButtonText}>STOP</Text></MagicPressable>
      </View>
      <View style={styles.eqDeckRotaryRow}>
        <DjKnob label="TEMPO" value={clamp(d.rate-50,0,100)} displayValue={`${d.rate}%`} color={color} onChanging={(v)=>previewDeckKnob(deck,'tempo',v)} onChange={(v)=>void setDeckRate(deck,50+v)}/>
        <DjKnob label="GAIN" value={d.volume} displayValue={`${d.volume}%`} color={color} onChanging={(v)=>previewDeckKnob(deck,'gain',v)} onChange={(v)=>void setDeckGain(deck,v)}/>
        <View style={styles.eqDeckRotaryReadout}><Text style={styles.eqDeckControlTitle}>LEVEL</Text><View style={styles.eqRotaryLevelMeter}>{Array.from({length:12},(_,i)=><View key={i} style={[styles.eqGainSegment,{backgroundColor:i<Math.round(d.volume/100*12)?(i>9?'#ffd166':color):'rgba(255,255,255,.12)'}]}/>)}</View><Text style={[styles.eqDeckControlValue,{color}]}>{d.volume}%</Text></View>
      </View>
      <View style={styles.eqDeckEqPanel}><Text style={styles.eqDeckControlTitle}>3-BAND EQ</Text>{['LOW','MID','HIGH'].map((label,i)=><View key={label} style={styles.eqDeckEqCol}><Text style={styles.eqDeckEqLabel}>{label}</Text><View style={styles.eqDeckEqButtons}>{[-100,-50,0,50,100].map(v=><MagicPressable key={v} accessibilityRole="button" accessibilityLabel={`Deck ${deck===0?'A':'B'} ${label} ${v}`} onPress={()=>void setDeckEq(deck,i,v)} style={[styles.eqDeckEqDot,Number(d.eq[i])===v&&{backgroundColor:color,borderColor:color,shadowColor:color,shadowOpacity:.65}]} />)}</View></View>)}</View>
      <View style={styles.eqDeckTransport}>
        <MagicPressable disabled={!d.loaded} onPress={()=>void cueDeck(deck)} style={[styles.eqDeckButton,{borderColor:'#ffd166',opacity:d.loaded?1:.42}]}><Ionicons name="return-down-back" size={16} color="#ffd166"/><Text style={styles.eqDeckButtonText}>CUE</Text></MagicPressable>
        <MagicPressable disabled={!d.loaded} onPress={()=>void toggleLoop(deck)} style={[styles.eqDeckButton,{borderColor:loop?'#72ffc5':'#b28cff',backgroundColor:loop?'rgba(114,255,197,.12)':'rgba(255,255,255,.04)',opacity:d.loaded?1:.42}]}><Ionicons name="repeat" size={16} color={loop?'#72ffc5':'#b28cff'}/><Text style={styles.eqDeckButtonText}>{loop?'LOOP ON':'4 BEAT LOOP'}</Text></MagicPressable>
        <MagicPressable disabled={!d.loaded} onPress={()=>void setDeckBass(deck,!d.bass)} style={[styles.eqDeckButton,{borderColor:d.bass?'#ffd166':'#9ba6c9',opacity:d.loaded?1:.42}]}><Ionicons name="flash" size={16} color={d.bass?'#ffd166':'#9ba6c9'}/><Text style={styles.eqDeckButtonText}>BASS FX</Text></MagicPressable>
      </View>
    </View>;
  };

  const isLandscape=width>=height;
  if(!isLandscape)return <View style={styles.eqOrientationWait}><MagicPressable accessibilityRole="button" accessibilityLabel="بازگشت" onPress={onBack} style={[styles.eqBackButton,{borderColor:accent}]}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={{width:28,height:28}}/></MagicPressable><Ionicons name="phone-landscape-outline" size={44} color={accent}/><Text style={styles.eqMainTitle}>در حال چرخش به حالت افقی</Text><Text style={styles.eqLightsSub}>صفحهٔ اکولایزر و دی‌جی فقط در حالت افقی نمایش داده می‌شود تا کنترل‌ها روی هم نیفتند. اگر گوشی نچرخید، چرخش خودکار دستگاه را فعال کن.</Text></View>;

  return <View style={styles.eqLandscapeRoot}>
    {pageBackground?<ExpoImage source={{uri:pageBackground,isAnimated:pageBackgroundKind==='gif'}} contentFit="cover" autoplay={pageBackgroundKind==='gif'} style={StyleSheet.absoluteFillObject}/>:null}
    <View pointerEvents="none" style={styles.eqBackgroundShade}/>
    <View style={[styles.eqTopBar,{borderBottomColor:`${accent}55`}] }>
      <View style={[styles.eqBrandBlock,{width:168,flex:0}]}>
        <MagicPressable accessibilityRole="button" accessibilityLabel="بازگشت به آوای نوا" onPress={onBack} style={[styles.eqBackButton,{borderColor:accent,shadowColor:accent}]}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={{width:28,height:28}}/></MagicPressable>
        <View style={{flex:1}}><Text style={styles.eqBrand}>NOVA EQ</Text><Text style={styles.eqTrack}>صدای واقعی • دو Deck • رقص نور</Text></View>
      </View>
      <View style={styles.eqTabRail}>{[['sound','تنظیم صدا','options-outline'],['dj','DJ','disc-outline'],['lights','رقص نور','pulse-outline']].map(([id,label,ic],i)=><MagicPressable key={id} accessibilityRole="button" accessibilityLabel={label} onPress={()=>setTab(i)} style={[styles.eqTopTab,{minWidth:90,paddingHorizontal:9,borderColor:tab===i?accent:'rgba(255,255,255,.14)',shadowColor:accent},tab===i&&{borderColor:accent,backgroundColor:`${accent}23`,shadowOpacity:.4}]}><Ionicons name={ic as any} size={17} color={tab===i?accent:'#aab1ca'}/><Text style={styles.eqTopTabText}>{label}</Text></MagicPressable>)}</View>
      <MagicPressable accessibilityRole="button" accessibilityLabel="تنظیمات و شخصی‌سازی اکولایزر" onPress={()=>setShowSettings(true)} style={[styles.eqSettingsButton,{borderColor:accent,shadowColor:accent}]}><Ionicons name="settings-outline" size={22} color={accent}/></MagicPressable>
    </View>

    {tab===0&&<View style={styles.eqSoundPage}>
      <View style={styles.eqSoundMain}>
        <View style={[styles.eqCurrentSong,{borderColor:accent,shadowColor:accent}]}>
          <View style={[styles.eqSoundDisc,{borderColor:accent,shadowColor:accent}]}><Ionicons name="musical-notes" size={34} color={accent}/></View>
          <View style={{flex:1,minWidth:0}}><Text style={styles.eqNowPlayingLabel}>آهنگ در حال پخش</Text><Text numberOfLines={1} style={styles.eqNowPlayingTitle}>{musicTitle}</Text><Text numberOfLines={1} style={styles.eqNowPlayingArtist}>{musicArtist}</Text><Text style={styles.eqNowPlayingState}>{musicStatus.playing?'در حال پخش • تنظیم‌ها زنده اعمال می‌شوند':musicStatus.loading?'در حال آماده‌سازی آهنگ…':'مکث • تنظیم‌ها ذخیره می‌شوند و هنگام پخش اعمال خواهند شد'}</Text></View>
        </View>
        <View style={styles.eqSoundTransport}>
          <MagicPressable accessibilityRole="button" accessibilityLabel="۱۰ ثانیه عقب" onPress={()=>void DjAudio.seek(-10)} style={[styles.eqSoundAction,{borderColor:accent}]}><Ionicons name="play-back" size={20} color={accent}/><Text style={styles.eqSoundActionText}>۱۰- ثانیه</Text></MagicPressable>
          <MagicPressable accessibilityRole="button" accessibilityLabel={musicStatus.playing?'مکث آهنگ':'پخش آهنگ'} onPress={async()=>{const ok=musicStatus.playing?await DjAudio.pauseMusic():await DjAudio.resumeMusic();if(ok){setMusicStatus((v:any)=>({...v,playing:!musicStatus.playing}));setS({playing:!musicStatus.playing});}else if(!musicStatus.uri&&musicTracks[0])await playLibraryTrack(musicTracks[0]);else Alert.alert('تنظیم صدا','یک آهنگ را از فهرست انتخاب کن تا کنترل‌های پخش فعال شوند.');}} style={[styles.eqSoundAction,{borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.1)'}]}><Ionicons name={musicStatus.playing?'pause':'play'} size={24} color="#72ffc5"/><Text style={styles.eqSoundActionText}>{musicStatus.playing?'مکث':'پخش'}</Text></MagicPressable>
          <MagicPressable accessibilityRole="button" accessibilityLabel="۱۰ ثانیه جلو" onPress={()=>void DjAudio.seek(10)} style={[styles.eqSoundAction,{borderColor:accent}]}><Ionicons name="play-forward" size={20} color={accent}/><Text style={styles.eqSoundActionText}>۱۰+ ثانیه</Text></MagicPressable>
        </View>
        <View style={styles.eqGlobalControlRow}>
          <View style={styles.eqGlobalControl}><Text style={styles.eqDeckControlTitle}>صدای آهنگ</Text><View style={styles.eqControlValueRow}><MagicPressable onPress={()=>void setEqVol(eqVolume-5)} style={styles.eqSmallKnob}><Ionicons name="remove" size={18} color={accent}/></MagicPressable><View style={styles.eqGainMeter}>{Array.from({length:12},(_,i)=><View key={i} style={[styles.eqGainSegment,{backgroundColor:i<Math.round(eqVolume/100*12)?accent:'rgba(255,255,255,.12)'}]}/>)}</View><MagicPressable onPress={()=>void setEqVol(eqVolume+5)} style={styles.eqSmallKnob}><Ionicons name="add" size={18} color={accent}/></MagicPressable><Text style={[styles.eqDeckControlValue,{color:accent}]}>{eqVolume}%</Text></View></View>
          <View style={styles.eqGlobalControl}><Text style={styles.eqDeckControlTitle}>سرعت پخش</Text><View style={styles.eqControlValueRow}>{[75,90,100,110,125,150].map(v=><MagicPressable key={v} onPress={()=>void setEqPlaybackRate(v)} style={[styles.eqRateChip,{borderColor:eqRate===v?accent:'rgba(255,255,255,.15)',backgroundColor:eqRate===v?`${accent}22`:'rgba(255,255,255,.03)'}]}><Text style={[styles.eqRateChipText,{color:eqRate===v?accent:'#fff'}]}>{v}%</Text></MagicPressable>)}</View></View>
        </View>
      </View>
      <View style={[styles.eqBandsPanel,{borderColor:`${accent}55`}]}>
        <View style={styles.eqPanelTop}><Text style={styles.eqMainTitle}>اکولایزر پنج‌باند</Text><View style={[styles.eqStatusPill,{borderColor:musicStatus.uri?'#72ffc5':'#ffd166'}]}><View style={[styles.eqStatusDot,{backgroundColor:musicStatus.uri?'#72ffc5':'#ffd166'}]}/><Text style={styles.eqStatusText}>{musicStatus.uri?'متصل به آهنگ':'آماده برای آهنگ'}</Text></View></View>
        <View style={styles.eqBandGrid}>{[['زیرصدا','SUB'],['بم','LOW'],['میانی','MID'],['بالا','HIGH'],['شفافیت','AIR']].map(([label,short],i)=>{
          const v=Number(eqBands[i]||0);const segments=Array.from({length:9},(_,j)=>j-4);
          return <View key={short} style={styles.eqBandControl}><Text style={styles.eqBandName}>{label}</Text><Text style={[styles.eqBandValue,{color:accent}]}>{v>0?'+':''}{v}</Text><View style={styles.eqBandMeter}>{segments.map((n,j)=><View key={j} style={[styles.eqBandSegment,{backgroundColor:(v===0&&j===4)||(v>0&&j>=4&&j<=4+Math.ceil(v/25))||(v<0&&j<=4&&j>=4-Math.ceil(Math.abs(v)/25))?accent:'rgba(255,255,255,.12)'}]}/>)}</View><View style={styles.eqBandAdjust}><MagicPressable accessibilityLabel={`کاهش ${label}`} onPress={()=>void setBandValue(i,v-10)} style={[styles.eqBandButton,{borderColor:accent}]}><Ionicons name="remove" size={19} color={accent}/></MagicPressable><MagicPressable accessibilityLabel={`افزایش ${label}`} onPress={()=>void setBandValue(i,v+10)} style={[styles.eqBandButton,{borderColor:accent}]}><Ionicons name="add" size={19} color={accent}/></MagicPressable></View></View>;
        })}</View>
        <View style={styles.eqPresetRow}>{presets.map(p=><MagicPressable key={p.name} onPress={()=>void applySoundPreset(p)} style={[styles.eqPresetButton,{borderColor:eqPresetName===p.name?accent:'rgba(255,255,255,.16)',backgroundColor:eqPresetName===p.name?`${accent}18`:'rgba(255,255,255,.03)'}]}><Ionicons name="radio-outline" size={14} color={eqPresetName===p.name?accent:'#fff'}/><Text style={[styles.eqPresetText,{color:eqPresetName===p.name?accent:'#fff'}]}>{p.name}</Text></MagicPressable>)}</View>
        <View style={styles.eqBassRow}><View style={{flex:1}}><Text style={styles.eqNowPlayingTitle}>تقویت‌کنندهٔ باس</Text><Text style={styles.eqNowPlayingArtist}>اثر واقعی AudioEffect روی آهنگ در حال پخش</Text></View><MagicPressable onPress={()=>void setBass(!bassBoost)} style={[styles.eqPowerPill,{borderColor:bassBoost?'#ffd166':'rgba(255,255,255,.25)',backgroundColor:bassBoost?'rgba(255,209,102,.12)':'rgba(255,255,255,.04)'}]}><Ionicons name={bassBoost?'flash':'flash-off'} size={17} color={bassBoost?'#ffd166':'#aab1ca'}/><Text style={styles.eqDeckButtonText}>{bassBoost?'روشن':'خاموش'}</Text></MagicPressable></View>
      </View>
      <View style={[styles.eqSongLibrary,{borderColor:`${accent}45` }]}>
        <View style={styles.eqPanelTop}><Text style={styles.eqLibraryTitle}>انتخاب آهنگ از گوشی</Text><MagicPressable onPress={()=>void refreshTracks()} style={[styles.eqTinyAction,{borderColor:accent}]}><Ionicons name="refresh" size={16} color={accent}/></MagicPressable></View>
        {libraryLoading?<Text style={styles.eqLibraryHint}>در حال خواندن فهرست موسیقی…</Text>:null}
        {!!libraryError?<Text style={styles.eqLibraryHint}>{libraryError}</Text>:null}
        <ScrollView style={{flex:1}} contentContainerStyle={{gap:4,paddingBottom:6}} nestedScrollEnabled>{musicTracks.slice(0,80).map((track)=><MagicPressable key={track.id||track.uri} accessibilityRole="button" accessibilityLabel={`پخش ${track.title}`} onPress={()=>void playLibraryTrack(track)} style={[styles.eqSongRow,{borderColor:musicStatus.uri===track.uri?accent:'rgba(255,255,255,.1)'}]}><Ionicons name={musicStatus.uri===track.uri&&musicStatus.playing?'volume-high':'musical-note'} size={15} color={musicStatus.uri===track.uri?accent:'#abb3d0'}/><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={styles.eqSongRowTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.eqSongRowArtist}>{track.artist||'هنرمند ناشناس'} • {formatTrackDuration(track.durationMs)}</Text></View>{musicStatus.uri===track.uri?<Ionicons name="checkmark-circle" size={16} color={accent}/>:null}</MagicPressable>)}</ScrollView>
      </View>
    </View>}

    {tab===1&&<ScrollView style={styles.eqDjPage} contentContainerStyle={{paddingBottom:12}} nestedScrollEnabled>
      <View style={styles.eqDjToolbar}>
        <View style={{flexDirection:'row',alignItems:'center',gap:7}}><View style={[styles.eqStatusDot,{backgroundColor:djOn?'#72ffc5':'#67253d',width:11,height:11,shadowColor:djOn?'#72ffc5':'#67253d',shadowOpacity:djOn?.9:.1}]}/><Text style={styles.eqDjStatusText}>{djOn?'NOVA DJ روشن است':'دی‌جی خاموش است'}</Text></View>
        <MagicPressable accessibilityRole="button" accessibilityLabel={djOn?'خاموش کردن دی‌جی':'روشن کردن دی‌جی'} onPress={()=>void togglePower()} style={[styles.eqPowerButton,{borderColor:djOn?'#72ffc5':'#ff79c8',backgroundColor:djOn?'rgba(114,255,197,.12)':'rgba(255,121,200,.1)',shadowColor:djOn?'#72ffc5':'#ff79c8'}]}><Ionicons name="power" size={18} color={djOn?'#72ffc5':'#ff79c8'}/><Text style={[styles.eqPowerButtonText,{color:djOn?'#72ffc5':'#ff79c8'}]}>{djOn?'DJ ON':'DJ OFF'}</Text></MagicPressable>
        <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Text style={styles.eqDeckControlTitle}>BPM مرجع لوپ</Text><MagicPressable onPress={()=>setBpm(Math.max(60,bpm-1))} style={styles.eqSmallKnob}><Ionicons name="remove" size={15} color="#ffd166"/></MagicPressable><Text style={[styles.eqDeckControlValue,{color:'#ffd166'}]}>{bpm}</Text><MagicPressable onPress={()=>setBpm(Math.min(200,bpm+1))} style={styles.eqSmallKnob}><Ionicons name="add" size={15} color="#ffd166"/></MagicPressable></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.eqDjStage}>
        {renderDeck(0,'#64f5ff')}
        <View style={[styles.eqCenterMixer,{borderColor:djOn?'#b28cff':'rgba(255,255,255,.15)',shadowColor:'#b28cff',shadowOpacity:djOn?.5:0}]}>
          <View style={[styles.eqTouchMonitor,{borderColor:djOn?'#64f5ff':'rgba(255,255,255,.2)',shadowColor:'#64f5ff',shadowOpacity:djOn?.8:0}]}>
            <View style={styles.eqMonitorTop}><View><Text style={[styles.eqMonitorBrand,{color:djOn?'#64f5ff':'#aab1ca'}]}>NOVA • TOUCH MONITOR</Text><Text style={styles.eqMonitorSub}>{djTarget===0?'آهنگ‌ها به Deck A می‌روند':'آهنگ‌ها به Deck B می‌روند'}</Text></View><View style={[styles.eqMonitorLed,{backgroundColor:djOn?'#72ffc5':'#51233c'}]}/></View>
            <View style={styles.eqMonitorWave}>{Array.from({length:36},(_,i)=>{const val=Number(bars[i%Math.max(1,bars.length)]||4);return <View key={i} style={[styles.eqMonitorBar,{height:Math.max(5,Math.min(58,val*(i%4===0?1.1:.68))),backgroundColor:i%3===0?'#64f5ff':i%3===1?'#b28cff':'#ff79c8'}]}/>})}</View>
            <View style={styles.eqMonitorNow}><Text numberOfLines={1} style={styles.eqNowPlayingTitle}>{djTarget===0?deckA.title:deckB.title}</Text><Text style={styles.eqMonitorSub}>مانیتور لمسی • انتخاب آهنگ، پخش، CUE و جست‌وجوی سریع</Text></View>
            <View style={styles.eqDeckTargetRow}>{([[0,'A','#64f5ff'],[1,'B','#ff79c8']] as any[]).map(([idx,label,c])=><MagicPressable key={label} onPress={()=>setDjTarget(idx)} style={[styles.eqDeckTarget,{borderColor:djTarget===idx?c:'rgba(255,255,255,.16)',backgroundColor:djTarget===idx?`${c}22`:'rgba(255,255,255,.03)'}]}><Text style={[styles.eqDeckTargetText,{color:c}]}>هدف {label}</Text></MagicPressable>)}</View>
            <View style={styles.eqMonitorTransportRow}>
              <MagicPressable disabled={!(djTarget===0?deckA.loaded:deckB.loaded)} onPress={()=>void toggleDeck(djTarget)} style={[styles.eqMonitorTransport,{borderColor:djTarget===0?'#64f5ff':'#ff79c8',opacity:(djTarget===0?deckA.loaded:deckB.loaded)?1:.42}]}><Ionicons name={(djTarget===0?deckA.playing:deckB.playing)?'pause':'play'} size={13} color={djTarget===0?'#64f5ff':'#ff79c8'}/></MagicPressable>
              <MagicPressable disabled={!(djTarget===0?deckA.loaded:deckB.loaded)} onPress={()=>void cueDeck(djTarget)} style={[styles.eqMonitorTransport,{borderColor:'#ffd166',opacity:(djTarget===0?deckA.loaded:deckB.loaded)?1:.42}]}><Ionicons name="return-down-back" size={13} color="#ffd166"/></MagicPressable>
              <MagicPressable disabled={!(djTarget===0?deckA.loaded:deckB.loaded)} onPress={()=>void DjAudio.seekDeck(djTarget,-10)} style={[styles.eqMonitorTransport,{borderColor:'#b28cff',opacity:(djTarget===0?deckA.loaded:deckB.loaded)?1:.42}]}><Text style={styles.eqMonitorTransportText}>−10</Text></MagicPressable>
              <MagicPressable disabled={!(djTarget===0?deckA.loaded:deckB.loaded)} onPress={()=>void DjAudio.seekDeck(djTarget,10)} style={[styles.eqMonitorTransport,{borderColor:'#b28cff',opacity:(djTarget===0?deckA.loaded:deckB.loaded)?1:.42}]}><Text style={styles.eqMonitorTransportText}>+10</Text></MagicPressable>
            </View>
            <ScrollView style={styles.eqMonitorSongList} nestedScrollEnabled>{musicTracks.slice(0,30).map(track=><MagicPressable key={track.id||track.uri} onPress={()=>void loadTrackToDeck(track,djTarget)} style={styles.eqMonitorSongRow}><Ionicons name="musical-note" size={12} color={djTarget===0?'#64f5ff':'#ff79c8'}/><Text numberOfLines={1} style={styles.eqMonitorSongText}>{track.title}</Text><Ionicons name="download-outline" size={12} color="#aeb6d1"/></MagicPressable>)}</ScrollView>
          </View>
          <Text style={styles.eqMixerTitle}>NOVA MIXER</Text>
          <View style={styles.eqCrossArea}><View style={styles.eqPanelTop}><Text style={styles.eqDeckControlTitle}>CROSSFADER</Text><Text style={[styles.eqDeckControlValue,{color:'#b28cff'}]}>{cross===50?'مرکز':cross<50?`A ${100-cross}%`:`B ${cross}%`}</Text></View><View style={styles.eqCrossTrack}>{Array.from({length:11},(_,i)=><View key={i} style={[styles.eqCrossTick,{backgroundColor:Math.abs(cross-i*10)<5?'#b28cff':'rgba(255,255,255,.14)'}]}/>) }<View style={[styles.eqCrossKnob,{left:`${Math.max(0,Math.min(96,cross-4))}%`,borderColor:djOn?'#b28cff':'#6d7592'}]}/></View><View style={styles.eqCrossButtons}><MagicPressable onPress={()=>void changeCross(Math.max(0,cross-5))} style={styles.eqMixButton}><Ionicons name="arrow-back" size={14} color="#b28cff"/><Text style={styles.eqMixButtonText}>A</Text></MagicPressable><MagicPressable onPress={()=>void changeCross(50)} style={styles.eqMixButton}><Ionicons name="radio-button-on" size={13} color="#b28cff"/><Text style={styles.eqMixButtonText}>مرکز</Text></MagicPressable><MagicPressable onPress={()=>void changeCross(Math.min(100,cross+5))} style={styles.eqMixButton}><Text style={styles.eqMixButtonText}>B</Text><Ionicons name="arrow-forward" size={14} color="#b28cff"/></MagicPressable></View></View>
          <View style={styles.eqMasterLine}><Text style={styles.eqDeckControlTitle}>MASTER</Text><MagicPressable onPress={()=>void changeMaster(master-5)} style={styles.eqSmallKnob}><Ionicons name="volume-low" size={15} color="#64f5ff"/></MagicPressable><View style={styles.eqGainMeter}>{Array.from({length:12},(_,i)=><View key={i} style={[styles.eqGainSegment,{backgroundColor:i<Math.round(master/100*12)?(i>9?'#ffd166':'#64f5ff'):'rgba(255,255,255,.12)'}]}/>)}</View><MagicPressable onPress={()=>void changeMaster(master+5)} style={styles.eqSmallKnob}><Ionicons name="volume-high" size={15} color="#64f5ff"/></MagicPressable><Text style={[styles.eqDeckControlValue,{color:'#64f5ff'}]}>{master}%</Text></View>
          <View style={styles.eqSaveMixRow}>{[0,1,2].map(slot=><View key={slot} style={styles.eqSaveMixSlot}><Text style={styles.eqSaveMixLabel}>{currentMixes[String(slot)]?'ذخیره شده':'خانهٔ خالی'}</Text><MagicPressable onPress={()=>void saveMix(slot)} style={[styles.eqSaveMixButton,{borderColor:'#ffd166'}]}><Ionicons name="save-outline" size={13} color="#ffd166"/><Text style={styles.eqSaveMixButtonText}>ذخیره {slot+1}</Text></MagicPressable><MagicPressable onPress={()=>void loadMix(slot)} style={[styles.eqSaveMixButton,{borderColor:'#72ffc5'}]}><Ionicons name="folder-open-outline" size={13} color="#72ffc5"/><Text style={styles.eqSaveMixButtonText}>بارگذاری</Text></MagicPressable></View>)}</View><Text style={styles.eqMixSaveNote}>این خانه‌ها آهنگ‌های انتخابی و تنظیمات میکس را ذخیره می‌کنند؛ خروجی گرفتن از یک فایل صوتیِ میکس‌شده هنوز در این نسخه پیاده‌سازی نشده است.</Text>
        </View>
        {renderDeck(1,'#ff79c8')}
      </ScrollView>
    </ScrollView>}

    {tab===2&&<View style={styles.eqLightsPage}>
      <View style={[styles.eqVisualHeader,{borderColor:`${accent}55`}]}><View style={{flex:1}}><Text style={styles.eqMainTitle}>طیف‌نمای زنده و رقص نور</Text><Text style={styles.eqLightsSub}>ستون‌ها از FFT صدای آهنگ پخش‌شده از موتور صوتی اندروید تغذیه می‌شوند؛ حرکت ساختگیِ مستقل از آهنگ نیست.</Text></View><View style={[styles.eqSignalChip,{borderColor:bars.some(v=>v>2)?'#72ffc5':'#ffd166'}]}><View style={[styles.eqStatusDot,{backgroundColor:bars.some(v=>v>2)?'#72ffc5':'#ffd166'}]}/><Text style={styles.eqStatusText}>{bars.some(v=>v>2)?'سیگنال زنده':'در انتظار صدا'}</Text></View></View>
      <View style={styles.eqVisualBody}><View style={[styles.eqVisualControlPanel,{borderColor:`${accent}55`}]}><Text style={styles.eqDeckControlTitle}>حالت نمایش</Text><View style={styles.eqVisualModes}>{[['ستونی','bar-chart-outline',0],['رقص نور','pulse-outline',1],['حلقه','radio-button-on-outline',2],['آینه‌ای','git-compare-outline',3]].map(([label,ic,id])=><MagicPressable key={String(id)} onPress={()=>{const n=Number(id);setVisualMode(n);setS({eqVisualMode:n});}} style={[styles.eqVisualModeButton,{borderColor:visualMode===id?accent:'rgba(255,255,255,.16)',backgroundColor:visualMode===id?`${accent}20`:'rgba(255,255,255,.03)'}]}><Ionicons name={ic as any} size={17} color={visualMode===id?accent:'#fff'}/><Text style={styles.eqDeckButtonText}>{label}</Text></MagicPressable>)}</View>
        <Text style={[styles.eqDeckControlTitle,{marginTop:18}]}>حساسیت واکنش</Text><View style={styles.eqSensitivityRow}>{[0.5,0.75,1,1.25,1.5,2].map(v=><MagicPressable key={v} onPress={()=>{setSensitivity(v);setS({eqVisualSensitivity:v});}} style={[styles.eqRateChip,{borderColor:sensitivity===v?accent:'rgba(255,255,255,.15)',backgroundColor:sensitivity===v?`${accent}22`:'rgba(255,255,255,.03)'}]}><Text style={[styles.eqRateChipText,{color:sensitivity===v?accent:'#fff'}]}>{v}×</Text></MagicPressable>)}</View>
        <Text style={styles.eqLibraryHint}>برای موج واقعی، آهنگ را از آوای نوا پخش کن یا در DJ کلید را روشن کن. در Android ممکن است مجوز سیستمِ تحلیل طیف لازم باشد.</Text>
      </View><View style={[styles.eqVisualStageBorder,{borderColor:accent,shadowColor:accent,shadowOpacity:bars.some(v=>v>2)?.45:.1}]}><EqVisualizer bars={bars} mode={visualMode} color={accent} sensitivity={sensitivity}/></View></View>
    </View>}

    {showSettings&&<View style={styles.eqCustomizationOverlay}>
      <MagicPressable accessibilityRole="button" accessibilityLabel="بستن تنظیمات" style={styles.eqCustomizationScrim} onPress={()=>setShowSettings(false)}/>
      <View style={[styles.eqCustomizationSheet,{borderColor:accent,shadowColor:accent}]}>
        <View style={styles.eqCustomizationSheetHead}><View style={{flex:1}}><Text style={styles.eqMainTitle}>شخصی‌سازی {pageNames[tab]}</Text><Text style={styles.eqLightsSub}>این تغییرها فقط روی همین صفحه اعمال می‌شوند و در حافظهٔ برنامه می‌مانند.</Text></View><MagicPressable onPress={()=>setShowSettings(false)} style={[styles.eqCustomizationClose,{borderColor:accent}]}><Image source={CONTROL_ART.closeCustom} resizeMode="contain" style={{width:24,height:24}}/></MagicPressable></View>
        <Text style={styles.eqDeckControlTitle}>رنگ اصلی نئون</Text><View style={styles.eqColorChoices}>{colors.map(c=><MagicPressable key={c} accessibilityRole="button" accessibilityLabel={`انتخاب رنگ ${c}`} onPress={()=>setS({eqPageColors:{...(s.eqPageColors||{}),[pageKey]:c}})} style={[styles.eqColorChoice,{borderColor:accent===c?'#fff':'rgba(255,255,255,.18)',backgroundColor:c,shadowColor:c,shadowOpacity:accent===c?.9:.15}]}>{accent===c?<Ionicons name="checkmark" size={16} color="#07101f"/>:null}</MagicPressable>)}</View>
        {tab===1&&<><Text style={[styles.eqDeckControlTitle,{marginTop:12}]}>نور دور دیسک‌ها</Text><View style={styles.eqVisualModes}>
          <MagicPressable onPress={()=>setS({eqDjLeds:!s.eqDjLeds})} style={[styles.eqVisualModeButton,{borderColor:s.eqDjLeds?'#ff79c8':'rgba(255,255,255,.16)',backgroundColor:s.eqDjLeds?'rgba(255,121,200,.10)':'rgba(255,255,255,.03)'}]}><Ionicons name="bulb-outline" size={17} color={s.eqDjLeds?'#ff79c8':'#fff'}/><Text style={styles.eqDeckButtonText}>{s.eqDjLeds?'نئون دور دیسک روشن':'نئون دور دیسک خاموش'}</Text></MagicPressable>
        </View></>}
        {tab===2&&<><Text style={[styles.eqDeckControlTitle,{marginTop:12}]}>تنظیمات رقص نور</Text><View style={styles.eqVisualModes}>{[['ستونی','bar-chart-outline',0],['رقص نور','pulse-outline',1],['حلقه','radio-button-on-outline',2],['آینه‌ای','git-compare-outline',3]].map(([label,ic,id])=><MagicPressable key={`set-${id}`} onPress={()=>{const n=Number(id);setVisualMode(n);setS({eqVisualMode:n});}} style={[styles.eqVisualModeButton,{borderColor:visualMode===id?accent:'rgba(255,255,255,.16)',backgroundColor:visualMode===id?`${accent}20`:'rgba(255,255,255,.03)'}]}><Ionicons name={ic as any} size={17} color={visualMode===id?accent:'#fff'}/><Text style={styles.eqDeckButtonText}>{label}</Text></MagicPressable>)}</View><View style={styles.eqSensitivityRow}>{[0.5,0.75,1,1.25,1.5,2].map(v=><MagicPressable key={`sens-${v}`} onPress={()=>{setSensitivity(v);setS({eqVisualSensitivity:v});}} style={[styles.eqRateChip,{borderColor:sensitivity===v?accent:'rgba(255,255,255,.15)',backgroundColor:sensitivity===v?`${accent}22`:'rgba(255,255,255,.03)'}]}><Text style={[styles.eqRateChipText,{color:sensitivity===v?accent:'#fff'}]}>{v}×</Text></MagicPressable>)}</View></>}
        <Text style={[styles.eqDeckControlTitle,{marginTop:10}]}>پس‌زمینهٔ اختصاصی همین صفحه</Text><View style={styles.eqBackgroundChoices}><MagicPressable disabled={settingsBusy} onPress={()=>void updateEqBg('image')} style={[styles.eqBackgroundButton,{borderColor:accent}]}><Ionicons name="image-outline" size={19} color={accent}/><Text style={styles.eqDeckButtonText}>{settingsBusy?'در حال ذخیره…':'انتخاب تصویر'}</Text></MagicPressable><MagicPressable disabled={settingsBusy} onPress={()=>void updateEqBg('gif')} style={[styles.eqBackgroundButton,{borderColor:'#ff79c8'}]}><Ionicons name="film-outline" size={19} color="#ff79c8"/><Text style={styles.eqDeckButtonText}>انتخاب GIF</Text></MagicPressable><MagicPressable onPress={resetEqBg} style={[styles.eqBackgroundButton,{borderColor:'#ffd166'}]}><Ionicons name="refresh-outline" size={19} color="#ffd166"/><Text style={styles.eqDeckButtonText}>بازنشانی</Text></MagicPressable></View>
        {pageBackground?<View style={styles.eqCustomBgPreview}><ExpoImage source={{uri:pageBackground,isAnimated:pageBackgroundKind==='gif'}} contentFit="cover" autoplay={pageBackgroundKind==='gif'} style={StyleSheet.absoluteFillObject}/><View style={styles.eqCustomBgBadge}><Ionicons name={pageBackgroundKind==='gif'?'film':'image'} size={14} color="#fff"/><Text style={styles.eqCustomBgBadgeText}>{pageBackgroundKind==='gif'?'GIF ذخیره‌شده':'تصویر ذخیره‌شده'}</Text></View></View>:<Text style={styles.eqLibraryHint}>پس‌زمینهٔ فعلی از طرح اصلی این صفحه استفاده می‌کند.</Text>}
        <MagicPressable onPress={()=>setShowSettings(false)} style={[styles.eqCustomizationResetButton,{borderColor:accent,backgroundColor:`${accent}12` }]}><Ionicons name="checkmark-circle-outline" size={18} color={accent}/><Text style={styles.eqDeckButtonText}>تأیید و بستن</Text></MagicPressable>
      </View>
    </View>}
  </View>;
}


function CameraPreviewOverlay({mode,s,setS,onClose}:{mode:'emergency'|'party';s:any;setS:(p:any)=>void;onClose:()=>void}){
  const cameraRef=useRef<any>(null);
  const [permission,setPermission]=useState<any>(null);
  const [ready,setReady]=useState(false);
  const [recording,setRecording]=useState(false);
  const [seconds,setSeconds]=useState(mode==='emergency'?Math.max(1,Number(s.emergencyCameraDurationMin||10))*60:0);
  const [savedUri,setSavedUri]=useState<string|null>(null);
  const [streamUrl,setStreamUrl]=useState('');
  const startedRef=useRef(false);
  const duration=mode==='emergency'?Math.max(1,Number(s.emergencyCameraDurationMin||10))*60:null;
  const saveVideo=useCallback(async(uri:string)=>{const root=FileSystem.documentDirectory;if(!root)return null;const dir=`${root}korosh-nova-camera/`;await FileSystem.makeDirectoryAsync(dir,{intermediates:true}).catch(()=>{});const local=`${dir}${mode}_${Date.now()}.mp4`;await FileSystem.copyAsync({from:uri,to:local});if(mode==='party'&&s.cameraStorageMode==='external'&&s.cameraStorageUri&&Platform.OS==='android'){try{const saf:any=(FileSystem as any).StorageAccessFramework;const target=await saf.createFileAsync(String(s.cameraStorageUri),`KoroshNova_${Date.now()}`,'video/mp4');await FileSystem.copyAsync({from:local,to:target});return String(target);}catch{}}return local;},[mode,s.cameraStorageMode,s.cameraStorageUri]);
  const finishEmergency=useCallback(async()=>{await EmergencyTools.stopCameraStream().catch(()=>{});setS({emergencyCameraTrigger:null});},[setS]);
  const sendEmergency=useCallback(async(url:string)=>{const nums=(Array.isArray(s.emergencyContacts)?s.emergencyContacts:[]).map((x:any)=>String(x.number||x).trim()).filter(Boolean);if(!nums.length)return;let body=String(s.emergencyMessage||'هشدار کوروش نوا');const finalUrl=String(s.emergencyStreamPublicUrl||url||'').trim();if(finalUrl)body+=`\n\nمشاهده زنده دوربین: ${finalUrl}`;if(s.emergencyAutoSms){try{const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);if(p===PermissionsAndroid.RESULTS.GRANTED)await EmergencyTools.sendSms(nums,body);}catch{}}if(s.emergencyAutoCall){try{const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);if(p===PermissionsAndroid.RESULTS.GRANTED)await EmergencyTools.callPhone(nums[0]);}catch{}}},[s.emergencyContacts,s.emergencyMessage,s.emergencyAutoSms,s.emergencyAutoCall,s.emergencyStreamPublicUrl]);
  const startEmergency=useCallback(async()=>{try{const permission=await Camera.requestCameraPermissionsAsync();if(!permission.granted)throw new Error('CAMERA_PERMISSION_REQUIRED');const result:any=await EmergencyTools.startCameraStream(8787,Math.max(60,Number(s.emergencyCameraDurationMin||10)*60));if(!result?.started)throw new Error(String(result?.error||'STREAM_FAILED'));const url=String(result.url||'');setStreamUrl(url);setS({lastEmergencyStreamUrl:String(s.emergencyStreamPublicUrl||url),lastEmergencyCameraAt:Date.now()});await sendEmergency(url);}catch{Alert.alert('دوربین اضطراری','دوربین زنده راه‌اندازی نشد.');await finishEmergency();}},[sendEmergency,setS,s.emergencyStreamPublicUrl,finishEmergency]);
  const startParty=useCallback(async()=>{if(!cameraRef.current||recording||startedRef.current)return;startedRef.current=true;setRecording(true);try{const result=await cameraRef.current.recordAsync({videoQuality:s.partyCameraQuality==='1080p'?'1080p':'720p'});if(result?.uri){const saved=await saveVideo(result.uri).catch(()=>null);const finalUri=saved||result.uri;setSavedUri(finalUri);setS({lastCameraVideoUri:finalUri,lastCameraVideoAt:Date.now()});}}catch{Alert.alert('دوربین','ضبط ویدئو شروع نشد.');}finally{setRecording(false);startedRef.current=false;}},[cameraRef,recording,s.partyCameraQuality,saveVideo,setS]);
  useEffect(()=>{if(mode==='emergency'){void startEmergency();return()=>{void EmergencyTools.stopCameraStream();};}Camera.getCameraPermissionsAsync().then(setPermission).catch(()=>{});},[mode,startEmergency]);
  useEffect(()=>{if(mode!=='emergency'||!streamUrl)return;const timer=setInterval(()=>setSeconds(v=>{if(v<=1){clearInterval(timer);void finishEmergency();return 0;}return v-1;}),1000);return()=>clearInterval(timer);},[mode,streamUrl,finishEmergency]);
  if(mode==='emergency')return <Modal transparent animationType="fade" statusBarTranslucent><View style={styles.cameraOverlay}><View style={styles.cameraStage}><View style={{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#030613'}}><Image source={CONTROL_ART.cameraEmergency} style={{width:82,height:82}}/><Text style={styles.cameraOverlayTitle}>دوربین اضطراری نورا</Text><View style={styles.cameraEmergencyBadge}><Image source={CONTROL_ART.aiAlert} style={{width:34,height:34}}/><Text style={styles.cameraEmergencyBadgeText}>{streamUrl?'پخش زنده فعال است':'در حال راه‌اندازی دوربین'}</Text><Text style={styles.cameraHudTimer}>{`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}</Text></View><Text style={styles.cameraOverlayText}>{streamUrl?`آدرس مشاهده: ${s.emergencyStreamPublicUrl||streamUrl}`:'دسترسی دوربین در حال بررسی است.'}</Text><MagicPressable style={styles.cameraSecondaryButton} onPress={()=>void finishEmergency()}><Image source={CONTROL_ART.closeCustom} style={{width:28,height:28}}/></MagicPressable></View></View></View></Modal>;
  if(!permission?.granted)return <Modal transparent animationType="fade"><View style={styles.cameraOverlay}><View style={styles.cameraPermissionCard}><Image source={CONTROL_ART.cameraParty} style={styles.cameraOverlayIcon}/><Text style={styles.cameraOverlayTitle}>دسترسی دوربین لازم است</Text><Text style={styles.cameraOverlayText}>برای ضبط مجالسی، اجازهٔ دوربین گوشی را تأیید کن.</Text><MagicPressable style={styles.saveButton} onPress={async()=>{const p=await Camera.requestCameraPermissionsAsync();setPermission(p);}}><Image source={CONTROL_ART.cameraParty} style={{width:34,height:34}}/></MagicPressable><MagicPressable style={styles.cameraSecondaryButton} onPress={onClose}><Image source={CONTROL_ART.backArrow} style={{width:28,height:28}}/></MagicPressable></View></View></Modal>;
  return <Modal transparent animationType="fade" statusBarTranslucent><View style={styles.cameraOverlay}><View style={styles.cameraStage}><CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" mode="video" onCameraReady={()=>setReady(true)} active={true}/><View style={styles.cameraHud}><View style={[styles.cameraLiveLed,{backgroundColor:recording?'#ff3b5c':'#8992a8'}]}/><Text style={styles.cameraHudText}>دوربین مجالسی</Text><Text style={styles.cameraHudTimer}>{recording?'در حال ضبط':'آماده'}</Text></View><View style={styles.cameraBottomBar}><MagicPressable style={styles.cameraActionButton} onPress={()=>void (recording?cameraRef.current?.stopRecording():startParty())}><Image source={recording?CONTROL_ART.recordVideo:CONTROL_ART.cameraParty} style={styles.cameraActionImage}/></MagicPressable><MagicPressable style={styles.cameraActionButton} onPress={onClose}><Image source={CONTROL_ART.backArrow} style={styles.cameraActionImage}/></MagicPressable></View></View>{savedUri&&<View style={styles.cameraSavedBadge}><Image source={CONTROL_ART.usbSave} style={{width:30,height:30}}/><Text style={styles.cameraSavedText}>ویدئو ذخیره شد</Text><MagicPressable accessibilityLabel="اشتراک‌گذاری ویدئو" onPress={async()=>{try{if(await Sharing.isAvailableAsync())await Sharing.shareAsync(String(savedUri),{mimeType:'video/mp4',dialogTitle:'ارسال ویدئوی کوروش نوا'});}catch{}}} style={{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:'#ffd166',alignItems:'center',justifyContent:'center'}}><Image source={CONTROL_ART.usbSave} style={{width:25,height:25}}/></MagicPressable></View>}</View></Modal>;
}
function CameraPanel({s,setS}:{s:any;setS:(p:any)=>void}){
 const [mode,setMode]=useState<'emergency'|'party'|null>(null);const [settings,setSettings]=useState<'emergency'|'party'|null>(null);const [contacts,setContacts]=useState<any[]>(Array.isArray(s.emergencyContacts)?s.emergencyContacts:[]);
 const saveContacts=(next:any[])=>{setContacts(next);setS({emergencyContacts:next});};
 const pickContacts=async()=>{try{const perm=await Contacts.requestPermissionsAsync();if(perm.status!=='granted'){Alert.alert('مخاطبین','اجازهٔ دسترسی به مخاطبین داده نشد.');return;}const result:any=await Contact.getAllDetails([ContactField.FULL_NAME,ContactField.PHONES],{limit:200,offset:0});const list=(result||[]).flatMap((c:any)=>{const phones=Array.isArray(c.phones)?c.phones:[];return phones.map((p:any)=>({id:String(c.id||`${c.fullName}-${p.number}`),name:String(c.fullName||'بدون نام'),number:String(p.number||'').trim()})).filter((x:any)=>x.number);});if(!list.length){Alert.alert('مخاطبین','شمارهٔ دارای تلفن در دفترچه پیدا نشد.');return;}setContacts(list.slice(0,50));setS({emergencyContacts:list.slice(0,50)});}catch{Alert.alert('مخاطبین','خواندن مخاطبین انجام نشد.');}};
 const saveFolder=async()=>{if(Platform.OS!=='android'){Alert.alert('ذخیره‌سازی خارجی','انتخاب فلش/SD در این نسخه فقط روی Android فعال است.');return;}try{const saf:any=(FileSystem as any).StorageAccessFramework;const r=await saf.requestDirectoryPermissionsAsync();if(r?.granted){setS({cameraStorageMode:'external',cameraStorageUri:r.directoryUri});setSettings(null);}}catch{Alert.alert('ذخیره‌سازی','انتخاب پوشه انجام نشد.');}};
 return <View style={{gap:12}}>
  <Option icon="camera" label="دوربین اضطراری نورا" color="#ff6b8a" onPress={()=>setMode('emergency')}><Text style={styles.optionSubLabel}>پس از تشخیص خطر، دوربین واقعی فعال می‌شود و پخش زندهٔ محلی را برای زمان انتخابی ارائه می‌کند.</Text></Option><Option icon="camera" label="فعال‌سازی خودکار دوربین اضطراری" color="#ff6b8a" active={s.emergencyCameraEnabled!==false} onPress={()=>setS({emergencyCameraEnabled:s.emergencyCameraEnabled===false})}><Text style={styles.optionSubLabel}>وقتی نورا سطح خطر قرمز را واقعاً ثبت کند، دوربین اضطراری باز می‌شود.</Text></Option>
  <Option icon="camera" label="دوربین مجالسی" color="#ffd166" onPress={()=>setMode('party')}/>
  <Option icon="timer" label="تنظیمات دوربین اضطراری" color="#ffd166" onPress={()=>setSettings('emergency')}/>
  <Option icon="contacts" label="مخاطبین اضطراری" color="#ff79c8" onPress={()=>pickContacts()}/>
  <Option icon="message" label="متن پیام اضطراری" color="#63f0c1" onPress={()=>setSettings('emergency')}/>
  <Option icon="phone" label="تنظیم تماس اضطراری" color="#ff8c69" onPress={()=>setSettings('emergency')}/>
  <Option icon="storage" label="محل ذخیرهٔ دوربین مجالسی" color="#63e8ff" onPress={()=>void saveFolder()}/>
  <View style={styles.cameraContactSummary}><Image source={CONTROL_ART.contactsBook} style={styles.cameraSummaryArt}/><View style={{flex:1}}><Text style={styles.cameraSummaryTitle}>مخاطبان ثبت‌شده: {contacts.length}</Text><Text style={styles.cameraSummaryText}>{contacts.slice(0,3).map((c:any)=>c.name).join('، ')||'هنوز مخاطبی انتخاب نشده'}</Text></View></View>
  {settings&&<SelectionModal title={settings==='emergency'?'تنظیمات دوربین اضطراری':'تنظیمات دوربین مجالسی'} onClose={()=>setSettings(null)}>{settings==='emergency'?<>
    <Text style={styles.muted}>زمان روشن‌ماندن دوربین بعد از هشدار نورا</Text><View style={styles.modalGrid}>{[10,20,30].map(v=><SettingsChoice key={v} label={`${v} دقیقه`} icon="timer" color="#ffd166" active={Number(s.emergencyCameraDurationMin||10)===v} onPress={()=>{setS({emergencyCameraDurationMin:v,emergencyCameraEnabled:true});setSettings(null)}}/>)}</View>
    <Text style={styles.musicSettingTitle}>متن پیام</Text><TextInput value={String(s.emergencyMessage||'')} onChangeText={v=>setS({emergencyMessage:v})} multiline style={[styles.input,{minHeight:100,textAlignVertical:'top'}]} placeholder="متن هشدار" placeholderTextColor="rgba(255,255,255,.4)"/><Text style={styles.musicSettingTitle}>نشانی پخش زندهٔ محلی</Text><Text style={styles.muted}>{s.lastEmergencyStreamUrl?'آخرین نشانی واقعی دوربین: '+String(s.lastEmergencyStreamUrl):'پس از فعال‌شدن دوربین، نشانی واقعی شبکهٔ محلی اینجا ثبت می‌شود.'}</Text>
    <View style={styles.modalGrid}><SettingsChoice label="پیام اضطراری فعال" icon="send" color="#63f0c1" active={!!s.emergencyAutoSms} onPress={async()=>{if(!s.emergencyAutoSms){const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);if(p!==PermissionsAndroid.RESULTS.GRANTED){Alert.alert('پیامک','اجازهٔ پیامک فعال نشد.');return;}}setS({emergencyAutoSms:!s.emergencyAutoSms});setSettings(null)}}/><SettingsChoice label="تماس اضطراری فعال" icon="call" color="#ff8c69" active={!!s.emergencyAutoCall} onPress={async()=>{if(!s.emergencyAutoCall){const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);if(p!==PermissionsAndroid.RESULTS.GRANTED){Alert.alert('تماس','اجازهٔ تماس فعال نشد.');return;}}setS({emergencyAutoCall:!s.emergencyAutoCall});setSettings(null)}}/></View>
    <MagicPressable style={styles.saveButton} onPress={()=>setSettings(null)}><Image source={CONTROL_ART.sendMessage} style={{width:30,height:30}}/><Text style={styles.saveButtonText}>ذخیره</Text></MagicPressable>
  </>:<><Text style={styles.muted}>کیفیت و محل ذخیرهٔ ضبط‌های مجالسی</Text><View style={styles.modalGrid}><SettingsChoice label="1080p" icon="camera" color="#ffd166" active={s.partyCameraQuality==='1080p'} onPress={()=>{setS({partyCameraQuality:'1080p'});setSettings(null)}}/><SettingsChoice label="720p" icon="camera" color="#ffd166" active={s.partyCameraQuality==='720p'} onPress={()=>{setS({partyCameraQuality:'720p'});setSettings(null)}}/></View><View style={styles.modalGrid}><SettingsChoice label="حافظهٔ برنامه" icon="memory" color="#b28cff" active={s.cameraStorageMode==='app'} onPress={()=>{setS({cameraStorageMode:'app'});setSettings(null)}}/><SettingsChoice label="فلش / SD انتخاب‌شده" icon="storage" color="#63e8ff" active={s.cameraStorageMode==='external'} onPress={()=>void saveFolder()}/></View><Text style={styles.muted}>در Android، پوشهٔ فلش یا SD با انتخاب پوشه از سیستم ثبت می‌شود.</Text></>}</SelectionModal>}
  {mode&&<CameraPreviewOverlay mode={mode} s={s} setS={setS} onClose={()=>setMode(null)}/>}</View>;
}

function BatteryPanel({s,setS}:{s:any;setS:(p:any)=>void}){
 const [data,setData]=useState<any>(s.batteryTelemetry||null);const [loading,setLoading]=useState(false);const [phone,setPhone]=useState<number>(-1);const [phoneState,setPhoneState]=useState<any>(null);
 useEffect(()=>{let alive=true;const readPhone=async()=>{try{const [level,state]=await Promise.all([Battery.getBatteryLevelAsync(),Battery.getBatteryStateAsync()]);if(alive){setPhone(level);setPhoneState(state);}}catch{if(alive){setPhone(-1);setPhoneState(null);}}};void readPhone();const t=setInterval(()=>void readPhone(),30000);return()=>{alive=false;clearInterval(t);};},[]);
 const read=useCallback(async()=>{setLoading(true);try{const next:any=await WifiEsp32.readStatus(String(s.wifiBaseUrl||''));const b=next?.batteries||next?.battery||null;setData(b||null);setS({batteryTelemetry:b||null});}catch{setData(null);}finally{setLoading(false);}},[s.wifiBaseUrl,setS]);
 useEffect(()=>{void read();const t=setInterval(()=>void read(),10000);return()=>clearInterval(t);},[read]);
 const item=(key:string,label:string,image:any)=>{const raw=(data&&((data as any)[key]??(data as any)[key.replace('battery','bat')]))||null;const level=typeof raw?.level==='number'?raw.level:typeof raw?.percentage==='number'?raw.percentage/100:typeof raw==='number'?raw:-1;const charging=raw?.charging===true||String(raw?.state||'').toLowerCase()==='charging';const known=level>=0&&level<=1;return <View style={styles.batteryCard}><Image source={image} style={styles.batteryArt}/><View style={{flex:1}}><Text style={styles.batteryTitle}>{label}</Text><Text style={styles.batteryLevel}>{known?`${Math.round(level*100)}٪`:'نامشخص'}</Text><Text style={[styles.batteryState,{color:known?(charging?'#72ffc5':'#ffd166'):'#8992a8'}]}>{known?(charging?'در حال شارژ':'متصل / بدون شارژ'):'اتصال واقعی باتری تأیید نشده'}</Text></View><View style={[styles.deviceStatusLed,{backgroundColor:known?(charging?'#72ffc5':'#ffd166'):'#8992a8',shadowColor:known?(charging?'#72ffc5':'#ffd166'):'#8992a8'}]}/></View>};
 return <View style={{gap:12}}><Text style={styles.muted}>دو باتری سخت‌افزاری آینده در اینجا تعریف شده‌اند. وقتی کنترلر مقدار واقعی ارسال کند، درصد، شارژ و وضعیت هرکدام نمایش داده می‌شود؛ بدون دادهٔ دستگاه، وضعیت خاکستری می‌ماند.</Text><View style={styles.batterySoftwareCard}><Image source={CONTROL_ART.batteryOne} style={styles.batterySoftwareArt}/><View style={{flex:1}}><Text style={styles.batteryTitle}>باتری نرم‌افزاری گوشی</Text><Text style={styles.batteryLevel}>{phone>=0?`${Math.round(phone*100)}٪`:'نامشخص'}</Text><Text style={styles.batteryState}>{phone>=0?(Number(phoneState)===2?'در حال شارژ':Number(phoneState)===3?'کامل':'مصرف باتری'):'وضعیت گوشی قابل خواندن نیست'}</Text></View></View>{item('battery1','باتری ۱',CONTROL_ART.batteryOne)}{item('battery2','باتری ۲',CONTROL_ART.batteryTwo)}<MagicPressable style={styles.fuseRefreshButton} onPress={()=>void read()}><Image source={CONTROL_ART.batteryOne} style={{width:28,height:28}}/><Text style={styles.fuseRefreshText}>{loading?'در حال خواندن…':'خواندن وضعیت واقعی'}</Text></MagicPressable></View>;
}

function EmergencyNotificationActions({s}:{s:any}){
 const sendSms=async()=>{const nums=(Array.isArray(s.emergencyContacts)?s.emergencyContacts:[]).map((x:any)=>String(x.number||x).trim()).filter(Boolean);if(!nums.length){Alert.alert('مخاطب اضطراری','ابتدا مخاطب انتخاب کن.');return;}try{const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);if(p!==PermissionsAndroid.RESULTS.GRANTED){Alert.alert('پیامک','برای ارسال خودکار باید اجازهٔ پیامک فعال باشد.');return;}const r=await EmergencyTools.sendSms(nums,String(s.emergencyMessage||'هشدار کوروش نوا'));if(!r?.ok)throw new Error(String(r?.error||'SMS_FAILED'));}catch{Alert.alert('پیامک','ارسال خودکار پیامک انجام نشد.');}};
 const call=async()=>{const n=String(s.emergencyContacts?.[0]?.number||'').trim();if(!n){Alert.alert('تماس','ابتدا مخاطب اضطراری را انتخاب کن.');return;}try{const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);if(p!==PermissionsAndroid.RESULTS.GRANTED){Alert.alert('تماس','برای تماس خودکار باید اجازهٔ تماس فعال باشد.');return;}const r=await EmergencyTools.callPhone(n);if(!r?.ok)throw new Error(String(r?.error||'CALL_FAILED'));}catch{Alert.alert('تماس','تماس اضطراری انجام نشد.');}};
 return <View style={styles.emergencyActionRow}><MagicPressable style={styles.emergencyAction} onPress={()=>void sendSms()}><Image source={CONTROL_ART.sendMessage} style={styles.emergencyActionArt}/><Text style={styles.emergencyActionText}>ارسال پیام</Text></MagicPressable><MagicPressable style={styles.emergencyAction} onPress={()=>void call()}><Image source={CONTROL_ART.callAction} style={styles.emergencyActionArt}/><Text style={styles.emergencyActionText}>تماس</Text></MagicPressable></View>
}

function Control({s,setS,go,requestSecureAction,onPreviewSound}:{s:any;setS:(p:any)=>void;go:(p:PageId)=>void;requestSecureAction:(target:string,title:string,action:()=>void)=>void;onPreviewSound:(key:string,source:any)=>void}){const [cat,setCat]=useState<string|null>(null);const openCategory=(id:string,label:string)=>{const protectedTarget=id==='security'?'securityAdmin':id==='fuses'?'fuses':id==='liveMic'?'liveMic':id==='contacts'?'contacts':id==='diagnostics'?'diagnostics':id==='lights'?'lighting':id==='music'||id==='equalizer'?'musicLibrary':id==='ai'||id==='aiProfile'?'nora':id==='sound'?'speakerPower':id==='cameras'?'camera':id==='batteries'?'hardwareCore':id==='hardwareCore'?'hardwareCore':'';requestSecureAction(protectedTarget,label,()=>{setCat(id);setS({controlCategory:id})});};if(cat)return <ControlDetail cat={cat} s={s} setS={setS} onBack={()=>{setCat(null);setS({controlCategory:null})}} go={go} onPreviewSound={onPreviewSound}/>;return <ScrollView contentContainerStyle={styles.pad}><View style={styles.controlHero}><View style={[styles.controlHeroIcon,{borderColor:'#b28cff',shadowColor:'#b28cff'}]}><Image source={CONTROL_ART.hardwareCore} resizeMode="contain" style={{width:48,height:48}}/></View><Text style={styles.sectionTitle}>اتاق فرمان</Text><Text style={styles.muted}>هر گزینه صفحه مستقل و کنترل‌های خودش را دارد.</Text></View><View style={styles.optionList}>{CONTROL_CATS.map(([id,l,ic])=><Option key={id} icon={ic} label={l} image={id==='liveMic'?CONTROL_ART.liveMic:undefined} color={PAGE_META[id]?.color||'#63e8ff'} onPress={()=>openCategory(id,l)}/>)}</View></ScrollView>}
function LiveMicPanel({s,setS}:{s:any;setS:(p:any)=>void}){
  const [running,setRunning]=useState(false);const [busy,setBusy]=useState(false);const [transport,setTransport]=useState<'bluetooth'|'wifi'|'dual'>((s.liveMicTransport==='wifi'||s.liveMicTransport==='bluetooth')?s.liveMicTransport:'dual');const [status,setStatus]=useState('خاموش');
  const host=String(s.wifiBaseUrl||'').replace(/^https?:\/\//,'').split('/')[0].split(':')[0];
  const toggle=async()=>{if(busy)return;setBusy(true);try{if(running){await LiveMic.stop();setRunning(false);setStatus('خاموش');return;}
    if(transport!=='bluetooth'&&!host){setStatus('نشانی Wi‑Fi اسپیکر مشخص نیست.');return;}
    const result=await LiveMic.start({transport,host,port:4210});
    if(!result?.started){setStatus(result?.error==='RECORD_AUDIO_PERMISSION_REQUIRED'?'اجازهٔ میکروفن لازم است.':'میکروفن زنده شروع نشد.');return;}
    setS({liveMicTransport:transport});setRunning(true);setStatus(transport==='dual'?'زنده · Wi‑Fi + Bluetooth':transport==='wifi'?'زنده · Wi‑Fi':'زنده · Bluetooth');
  }catch{setStatus('راه‌اندازی میکروفن زنده انجام نشد.')}finally{setBusy(false)}};
  useEffect(()=>()=>{void LiveMic.stop()},[]);
  const choose=(v:'bluetooth'|'wifi'|'dual')=>{if(running)return;setTransport(v);setS({liveMicTransport:v})};
  return <View style={styles.liveMicPanel}>
    <View style={styles.liveMicHero}><Animated.View style={[styles.liveMicGlow,{transform:[{scale:running?1.05:1}],borderColor:running?'#72ffc5':'#63e8ff',shadowColor:running?'#72ffc5':'#63e8ff'}]}><Image source={CONTROL_ART.liveMic} resizeMode="contain" style={styles.liveMicHeroImage}/></Animated.View><Text style={styles.liveMicTitle}>میکروفن زنده نوا</Text><Text style={styles.liveMicText}>میکروفن گوشی صدای زنده را به مسیر انتخاب‌شده می‌فرستد. حالت دوگانه، دو مسیر را مستقل هم‌زمان فعال می‌کند.</Text><View style={[styles.deviceStatusLine,{justifyContent:'center'}]}><View style={[styles.deviceStatusLed,{backgroundColor:running?'#72ffc5':'#8992a8',shadowColor:running?'#72ffc5':'#8992a8'}]}/><Text style={[styles.deviceStatusLabel,{color:running?'#72ffc5':'#8992a8'}]}>{status}</Text></View></View>
    <Text style={styles.liveMicSectionTitle}>مسیر پخش</Text>
    <View style={styles.liveMicTransportGrid}>{[{id:'bluetooth',label:'Bluetooth',image:CONTROL_ART.liveBluetooth,color:'#63e8ff'},{id:'wifi',label:'Wi‑Fi',image:CONTROL_ART.liveWifi,color:'#72ffc5'},{id:'dual',label:'هر دو مستقل',image:CONTROL_ART.livePhone,color:'#b28cff'}].map((v:any)=>{const active=transport===v.id;return <MagicPressable key={v.id} disabled={running} onPress={()=>choose(v.id)} style={[styles.liveMicTransportCard,active&&styles.liveMicTransportActive,{borderColor:active?'#72ffc5':v.color,shadowColor:v.color},running&&{opacity:.55}]}><Image source={v.image} resizeMode="contain" style={styles.liveMicTransportImage}/><Text style={styles.liveMicTransportLabel}>{v.label}</Text><View style={[styles.securityTickBox,active&&styles.securityTickBoxActive]}>{active&&<Ionicons name="checkmark" size={16} color="#06111a"/>}</View></MagicPressable>})}</View>
    <MagicPressable onPress={()=>void toggle()} disabled={busy} style={[styles.liveMicMainButton,{borderColor:running?'#ff465f':'#72ffc5',shadowColor:running?'#ff465f':'#72ffc5'},busy&&{opacity:.55}]}><Image source={CONTROL_ART.liveMic} resizeMode="contain" style={styles.liveMicButtonImage}/><Text style={styles.liveMicMainText}>{busy?'در حال آماده‌سازی…':running?'توقف میکروفن زنده':'شروع میکروفن زنده'}</Text></MagicPressable>
    <View style={styles.liveMicSettingsCard}><Image source={CONTROL_ART.liveWifi} resizeMode="contain" style={styles.liveMicSettingsImage}/><View style={{flex:1,gap:4}}><Text style={styles.liveMicSettingsTitle}>تنظیم مستقل Wi‑Fi</Text><Text style={styles.liveMicSettingsText}>آدرس از تنظیمات اتصال اسپیکر خوانده می‌شود؛ پورت زنده 4210 است.</Text><TextInput value={String(s.wifiBaseUrl||'')} onChangeText={v=>setS({wifiBaseUrl:v})} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="نشانی Wi‑Fi اسپیکر" placeholderTextColor="rgba(255,255,255,.4)" style={[styles.input,{marginBottom:0}]}/></View></View>
    <View style={styles.liveMicNote}><Image source={CONTROL_ART.livePhone} resizeMode="contain" style={styles.liveMicNoteImage}/><Text style={styles.liveMicNoteText}>در Bluetooth، خروجی صوتی فعلی گوشی مقصد پخش می‌شود. در Wi‑Fi، بسته‌های PCM زنده به نشانی واردشده ارسال می‌شوند؛ تأیید دریافت فقط وقتی ممکن است که مقصد پاسخ واقعی بدهد.</Text></View>
  </View>;
}

function SimBalancePanel(){
  const [carrier,setCarrier]=useState('در حال شناسایی…');
  const [supported,setSupported]=useState(false);
  const [loading,setLoading]=useState<'balance'|'data'|null>(null);
  const [balance,setBalance]=useState('');
  const [data,setData]=useState('');
  const [error,setError]=useState('');
  const refreshCarrier=async()=>{
    try{
      const info=await CarrierBalance.getCarrier();
      setCarrier(String(info?.carrier||'اپراتور ناشناخته'));
      setSupported(!!info?.supported);
      if(info?.error==='READ_PHONE_STATE_REQUIRED') setError('برای شناسایی سیم‌کارت، اجازهٔ وضعیت تلفن لازم است.');
    }catch{setCarrier('اپراتور ناشناخته');setSupported(false);setError('شناسایی اپراتور انجام نشد.');}
  };
  useEffect(()=>{void refreshCarrier();},[]);
  const query=async(kind:'balance'|'data')=>{
    setError('');setLoading(kind);
    try{
      if(Platform.OS!=='android'){setError('این قابلیت فقط روی Android قابل استفاده است.');return;}
      const ps=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
      const cp=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
      if(ps!==PermissionsAndroid.RESULTS.GRANTED||cp!==PermissionsAndroid.RESULTS.GRANTED){setError('برای استعلام واقعی، اجازهٔ تلفن و تماس را فعال کن.');return;}
      const r=await CarrierBalance.query(kind);
      if(r?.ok){if(kind==='balance')setBalance(String(r.response||''));else setData(String(r.response||''));setCarrier(String(r.carrier||carrier));}
      else if(r?.error==='UNSUPPORTED_CARRIER') setError('اپراتور این سیم‌کارت شناسایی نشد؛ نتیجهٔ ساختگی نمایش داده نمی‌شود.');
      else if(r?.error==='USSD_FAILED') setError('اپراتور پاسخ USSD نداد. آنتن و فعال بودن سیم‌کارت را بررسی کن.');
      else setError('استعلام واقعی انجام نشد؛ نتیجهٔ ساختگی نمایش داده نمی‌شود.');
    }catch{setError('استعلام واقعی انجام نشد؛ نتیجهٔ ساختگی نمایش داده نمی‌شود.');}
    finally{setLoading(null);}
  };
  return <View style={{gap:12}}>
    <View style={[styles.simCarrierCard,{borderColor:'#63e8ff',shadowColor:'#63e8ff'}]}><Ionicons name="cellular" size={24} color="#63e8ff"/><View style={{flex:1}}><Text style={styles.simCarrierTitle}>{carrier}</Text><Text style={styles.muted}>اطلاعات مستقیماً از شبکهٔ سیم‌کارت با USSD دریافت می‌شود.</Text></View><View style={[styles.simCarrierDot,{backgroundColor:supported?'#72ffc5':'#ffd166',shadowColor:supported?'#72ffc5':'#ffd166'}]}/></View>
    <View style={styles.simQueryGrid}>
      <MagicPressable disabled={!!loading||!supported} onPress={()=>void query('balance')} style={[styles.simQueryCard,{borderColor:'#72ffc5',opacity:(loading||!supported)?0.52:1}]}><Ionicons name="wallet-outline" size={30} color="#72ffc5"/><Text style={styles.simQueryTitle}>مانده شارژ سیم‌کارت</Text><Text style={styles.simQueryValue}>{loading==='balance'?'در حال استعلام…':balance||'برای استعلام لمس کن'}</Text></MagicPressable>
      <MagicPressable disabled={!!loading||!supported} onPress={()=>void query('data')} style={[styles.simQueryCard,{borderColor:'#63e8ff',opacity:(loading||!supported)?0.52:1}]}><Ionicons name="speedometer-outline" size={30} color="#63e8ff"/><Text style={styles.simQueryTitle}>مانده اینترنت</Text><Text style={styles.simQueryValue}>{loading==='data'?'در حال استعلام…':data||'برای استعلام لمس کن'}</Text></MagicPressable>
    </View>
    <MagicPressable onPress={()=>void refreshCarrier()} style={[styles.saveButton,{borderColor:'#b28cff',backgroundColor:'rgba(178,140,255,.08)'}]}><Ionicons name="refresh" size={19} color="#b28cff"/><Text style={styles.saveButtonText}>شناسایی دوبارهٔ سیم‌کارت</Text></MagicPressable>
    {error&&<Text style={styles.muted}>{error}</Text>}
    <Text style={styles.muted}>هیچ مقدار محاسباتی یا تخمینی به‌عنوان مانده نمایش داده نمی‌شود؛ اگر شبکه پاسخ ندهد، نتیجه خالی می‌ماند.</Text>
  </View>;
}

function SettingsChoice({label,icon,color,active,onPress,disabled=false}:{label:string;icon:string;color:string;active:boolean;onPress?:()=>void;disabled?:boolean}){const customIconMap:any={profile:'profileNora',contacts:'contactsBook',phone:'phoneCall',timer:'timer',camera:'camera',battery:'battery',network:'networkCore',memory:'memoryChip',diagnostics:'diagnosticsCore',sound:'soundCore',equalizer:'equalizerCore',hardware:'hardwareCore',future:'futureModule',message:'message',send:'sendMessage',call:'callAction',storage:'storage',wifi:'wifi','wifi-outline':'wifi',bluetooth:'bluetooth','bluetooth-outline':'bluetooth','swap-horizontal-outline':'networkCore','bulb-outline':'lightCore','rainbow-outline':'effect','person-circle-outline':'profileNora','radio-outline':'musicCore'};const art=OPTION_ART[icon]||OPTION_ART[customIconMap[icon]]||OPTION_ART.hardwareCore;return <MagicPressable accessibilityRole={disabled?'text':'button'} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.presetIconCard,active&&styles.presetIconCardActive,{borderColor:active?'#72ffc5':color,opacity:disabled ? 0.48 : 1},pressed&&!disabled&&styles.pressed]}>{art?<Image source={art} resizeMode="contain" style={styles.noraPresetImage}/>:<Ionicons name={icon as any} size={31} color={color}/>}<Text style={styles.modalCardText}>{label}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>}

function MemoryControlPanel({s}:{s:any}){const [info,setInfo]=useState<any>(null);useEffect(()=>{let alive=true;(async()=>{try{const [free,total]=await Promise.all([(FileSystem as any).getFreeDiskStorageAsync?.()||Promise.resolve(-1),(FileSystem as any).getTotalDiskCapacityAsync?.()||Promise.resolve(-1)]);if(alive)setInfo({free,total});}catch{if(alive)setInfo(null);}})();return()=>{alive=false;};},[]);return <View style={{gap:10}}><View style={styles.deviceStatusCard}><Image source={CONTROL_ART.memoryChip} style={styles.deviceStatusArt}/><View style={styles.deviceStatusTextBlock}><Text style={styles.deviceStatusTitle}>حافظهٔ پایدار برنامه</Text><Text style={styles.deviceStatusDesc}>{info&&info.free>=0?`فضای آزاد: ${Math.round(info.free/1024/1024)} MB · کل: ${Math.round(info.total/1024/1024)} MB`:'اطلاعات فضای ذخیره‌سازی خوانده نشد.'}</Text></View></View><Text style={styles.muted}>این بخش فقط وضعیت واقعی حافظه را نشان می‌دهد و هیچ فضای ذخیره‌سازی فرضی اعلام نمی‌کند.</Text></View>}

function EmergencyContactsPanel({s,setS}:{s:any;setS:(p:any)=>void}){
 const [available,setAvailable]=useState<any[]>([]);const [loading,setLoading]=useState(false);const selected=Array.isArray(s.emergencyContacts)?s.emergencyContacts:[];
 const load=async()=>{setLoading(true);try{const perm=await Contacts.requestPermissionsAsync();if(perm.status!=='granted'){Alert.alert('مخاطبین','اجازهٔ دسترسی به مخاطبین داده نشد.');return;}const result:any=await Contact.getAllDetails([ContactField.FULL_NAME,ContactField.PHONES],{limit:500,offset:0});const list=(result||[]).flatMap((c:any)=>{const phones=Array.isArray(c.phones)?c.phones:[];return phones.map((p:any)=>({id:`${c.id}-${p.number}`,name:String(c.fullName||'بدون نام'),number:String(p.number||'').trim()})).filter((x:any)=>x.number);});setAvailable(list);}catch{Alert.alert('مخاطبین','خواندن دفترچهٔ مخاطبین انجام نشد.');}finally{setLoading(false);}};
 const toggle=(item:any)=>{const active=selected.some((x:any)=>String(x.number)===String(item.number));setS({emergencyContacts:active?selected.filter((x:any)=>String(x.number)!==String(item.number)):[...selected,item]});};
 const sendSms=async()=>{const nums=selected.map((x:any)=>String(x.number||'')).filter(Boolean);if(!nums.length){Alert.alert('پیام اضطراری','حداقل یک مخاطب را تیک بزن.');return;}try{const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);if(p!==PermissionsAndroid.RESULTS.GRANTED){Alert.alert('پیامک','اجازهٔ ارسال پیامک فعال نشد.');return;}const r=await EmergencyTools.sendSms(nums,String(s.emergencyMessage||'هشدار کوروش نوا'));if(!r?.ok)throw new Error(String(r?.error||'SMS_FAILED'));Alert.alert('پیام اضطراری','پیام برای مخاطبان انتخاب‌شده ارسال شد.');}catch{Alert.alert('پیامک','ارسال مستقیم پیامک انجام نشد.');}};
 const call=async()=>{const n=String(selected[0]?.number||'');if(!n){Alert.alert('تماس اضطراری','یک مخاطب را تیک بزن.');return;}try{const p=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);if(p!==PermissionsAndroid.RESULTS.GRANTED){Alert.alert('تماس','اجازهٔ تماس فعال نشد.');return;}const r=await EmergencyTools.callPhone(n);if(!r?.ok)throw new Error(String(r?.error||'CALL_FAILED'));}catch{Alert.alert('تماس','تماس اضطراری انجام نشد.');}};
 return <View style={{gap:12}}><Text style={styles.muted}>مخاطب‌ها انتخابی‌اند؛ فقط موارد تیک‌خورده در پیام و تماس اضطراری استفاده می‌شوند.</Text><MagicPressable style={styles.saveButton} onPress={()=>void load()}><Image source={CONTROL_ART.contactsBook} style={{width:32,height:32}}/><Text style={styles.saveButtonText}>{loading?'در حال خواندن…':'خواندن مخاطبین گوشی'}</Text></MagicPressable><View style={{gap:8}}>{available.map(item=>{const active=selected.some((x:any)=>String(x.number)===String(item.number));return <MagicPressable key={item.id} onPress={()=>toggle(item)} style={[styles.contactSelectCard,active&&styles.contactSelectCardActive]}><Image source={CONTROL_ART.contactAdd} style={styles.contactSelectArt}/><View style={{flex:1}}><Text style={styles.contactSelectName}>{item.name}</Text><Text style={styles.contactSelectNumber}>{item.number}</Text></View><View style={[styles.securityTickBox,active&&styles.securityTickBoxActive]}>{active&&<Ionicons name="checkmark" size={17} color="#06111a"/>}</View></MagicPressable>})}</View><Text style={styles.musicSettingTitle}>متن پیام اضطراری</Text><TextInput value={String(s.emergencyMessage||'')} onChangeText={v=>setS({emergencyMessage:v})} multiline style={[styles.input,{minHeight:110,textAlignVertical:'top'}]} placeholder="متن پیام اضطراری نورا" placeholderTextColor="rgba(255,255,255,.4)"/><View style={styles.emergencyActionRow}><MagicPressable style={styles.emergencyAction} onPress={()=>void sendSms()}><Image source={CONTROL_ART.sendMessage} style={styles.emergencyActionArt}/><Text style={styles.emergencyActionText}>پیام اضطراری</Text></MagicPressable><MagicPressable style={styles.emergencyAction} onPress={()=>void call()}><Image source={CONTROL_ART.callAction} style={styles.emergencyActionArt}/><Text style={styles.emergencyActionText}>تماس اضطراری</Text></MagicPressable></View></View>;
}

function UpdateControl(){
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const check=async()=>{if(busy)return;setBusy(true);setStatus('');try{if(!Updates.isEnabled){setStatus('به‌روزرسانی آنلاین در این خروجی فعال نیست.');return;}const result=await Updates.checkForUpdateAsync();if(!result.isAvailable){setStatus('نسخهٔ جدیدی برای این دستگاه پیدا نشد.');return;}setStatus('نسخهٔ جدید پیدا شد؛ در حال دریافت…');const fetched=await Updates.fetchUpdateAsync();if((fetched as any).isNew){setStatus('دریافت کامل شد؛ در حال اعمال نسخهٔ جدید…');await Updates.reloadAsync();}else setStatus('نسخهٔ جدید دریافت نشد.');}catch{setStatus('بررسی یا دریافت به‌روزرسانی انجام نشد.');}finally{setBusy(false);}};
  return <View style={{gap:8}}><Option icon="refresh" label={busy?'دریافت به‌روزرسانی…':'بررسی و نصب به‌روزرسانی'} color="#63e8ff" active={busy} onPress={()=>void check()}/>{!!status&&<Text style={styles.muted}>{status}</Text>}<Text style={styles.muted}>نسخه نصب‌شده: {APP_VERSION}</Text></View>;
}

function ControlDetail({cat,s,setS,onBack,go,onPreviewSound}:{cat:string;s:any;setS:(p:any)=>void;onBack:()=>void;go:(p:PageId)=>void;onPreviewSound:(key:string,source:any)=>void}){
  const [modal,setModal]=useState<string|null>(null);const title=CONTROL_CATS.find(x=>x[0]===cat)?.[1]||cat;const color=PAGE_META[cat]?.color||'#b28cff';
  const choose=(key:string,value:any)=>{setS({[key]:value});setModal(null)};
  return <ScrollView contentContainerStyle={styles.pad}><View style={styles.detailTop}><MagicPressable accessibilityRole="button" accessibilityLabel="بازگشت" onPress={onBack} style={[styles.detailBackButton,{borderColor:color,shadowColor:color}]}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={styles.detailBackImage}/></MagicPressable><View style={{flex:1,alignItems:'center'}}><View style={[styles.detailIcon,{borderColor:color,shadowColor:color}]}>{OPTION_ART[cat]?<Image source={OPTION_ART[cat]} resizeMode="contain" style={styles.detailIconImage}/>:<Ionicons name={(icons[cat]||'settings-outline') as any} size={30} color={color}/>}</View><Text style={styles.sectionTitle}>{title}</Text></View><View style={{width:58}}/></View>
    {cat==='icons'&&<><Text style={styles.muted}>هفت آیکن نوار پایین؛ هرکدام با چند طرح، GIF، رنگ و انتخاب از گالری.</Text><View style={styles.optionList}>{NAV_PAGES.map(([id,label])=><Option key={id} icon={id} label={label} color={s.navIconColor?.[id]||ICON_COLORS[PAGES.findIndex(x=>x[0]===id)%ICON_COLORS.length]} onPress={()=>setModal(`icon:${id}`)}/>)}</View></>}
    {cat==='liveMic'&&<LiveMicPanel s={s} setS={setS}/>}
    {cat==='network'&&<><Option icon="network" label="روش اتصال · خودکار / Wi‑Fi / Bluetooth" color="#63e8ff" onPress={()=>setModal('transport')}/><Option icon="wifi" label={s.wifiEsp32?'Wi‑Fi اسپیکر متصل':'بررسی Wi‑Fi اسپیکر'} color="#63e8ff" active={!!s.wifiEsp32} onPress={()=>void WifiEsp32.ping(String(s.wifiBaseUrl||'')).then(ok=>setS({wifiEsp32:ok}))}/><Option icon="bluetooth" label={s.connected?'Bluetooth متصل':'Bluetooth قطع'} color="#56dfff" active={s.connected} onPress={()=>go('bluetooth')}/></>}
    {cat==='simBalance'&&<SimBalancePanel/>}
    {cat==='ai'&&<><Option icon="profile" label="پروفایل نورا" color="#63f0c1" onPress={()=>setModal('aiProfile')}/><Option icon="mic" label="میکروفون و تشخیص گفتار" color="#ff79c8" onPress={()=>setModal('mic')}/><Option icon="effect" label="افکت آیکن نورا" color="#b28cff" onPress={()=>setModal('aiEffect')}/></>}
    {cat==='aiProfile'&&<><Option icon="profile" label="انتخاب پروفایل" color="#63f0c1" onPress={()=>setModal('aiProfile')}/><Option icon="memory" label="حافظه مشترک نورا" color="#b28cff" active={!!s.noraSharedMemoryEnabled} onPress={()=>setS({noraSharedMemoryEnabled:!s.noraSharedMemoryEnabled})}/><Text style={styles.muted}>حافظه این بخش به تنظیمات مشترک نورا متصل است.</Text></>}
    {cat==='contacts'&&<EmergencyContactsPanel s={s} setS={setS}/>}
    {cat==='cameras'&&<CameraPanel s={s} setS={setS}/>}
    {cat==='batteries'&&<BatteryPanel s={s} setS={setS}/>}
    {cat==='hardwareCore'&&<><Option icon="hardwareCore" label="هسته ارتباطی ESP32" color="#63e8ff" onPress={()=>setModal('core')}/><Option icon="networkCore" label="دو مسیر مستقل Wi‑Fi + Bluetooth" color="#56dfff" active={!!(s.wifiEsp32||s.connected)} onPress={()=>setModal('core')}/><Text style={styles.muted}>وضعیت اتصال فقط از مسیر واقعی دستگاه نمایش داده می‌شود؛ بدون پاسخ دستگاه، چراغ روشن فرض نمی‌شود.</Text></>}
    {cat==='lights'&&<><Option icon="rgb" label="چهارسیمه RGB" color="#63e8ff" onPress={()=>go('rgb')}/><Option icon="effect" label="نئون» افکت‌های نئون" color="#ff79c8" onPress={()=>go('rgb')}/><Option icon="settings" label="تنظیم کامل RGB و نئون" color="#72ffc5" onPress={()=>setModal('rgbSettings')}/><Option icon="galaxy" label="کهکشانی» افکت‌های مستقل" color="#b28cff" onPress={()=>go('galaxy')}/></>}
    {cat==='music'&&<><Option icon="music" label="تصویر چرخان آوای نوا" color="#ff79c8" onPress={()=>go('music')}/><Option icon="gallery" label="تصویر و GIF گالری" color="#ffd166" onPress={()=>go('music')}/><Option icon="effect" label="افکت آوای نوا" color="#63e8ff" onPress={()=>go('music')}/></>}
    {cat==='equalizer'&&<><Option icon="equalizer" label="پروفایل اکولایزر" color="#ffd166" onPress={()=>go('equalizer')}/><Option icon="effect" label="سبک نمایش اکولایزر" color="#63e8ff" onPress={()=>setModal('eqStyle')}/></>}
    {cat==='sound'&&<SpeakerSoundPanel s={s} setS={setS} onPreview={onPreviewSound}/>} 

    {cat==='memory'&&<><Option icon="memory" label="حافظه محلی برنامه" color="#b28cff" active onPress={()=>setModal('memory')}><Text style={styles.optionSubLabel}>ذخیره‌سازی تنظیمات و فایل‌های برنامه در حافظهٔ پایدار.</Text></Option><Option icon="profile" label="پروفایل نورا" color="#63f0c1" onPress={()=>setModal('aiProfile')}/></>}
    {cat==='diagnostics'&&<><Option icon="diagnostics" label="سلامت هسته" color="#72ffc5" onPress={()=>setModal('diagnostics')}/><UpdateControl/></>}
    {cat==='security'&&<SecurityPanel s={s} setS={setS}/>} 
    {cat==='fuses'&&<FuseStatusPanel s={s}/>}
    {modal&&<SelectionModal title={modal.startsWith('icon:')?'تنظیم آیکن پایین':modal==='transport'?'مسیر ارتباطی':modal==='aiProfile'?'پروفایل نورا':modal==='aiEffect'?'افکت نورا':modal==='mic'?'میکروفون':modal==='eqStyle'?'سبک اکولایزر':modal==='rgbSettings'?'تنظیم کامل RGB و نئون':modal==='diagnostics'?'تشخیص و نگهداری':modal==='core'?'هسته ارتباطی':modal==='memory'?'حافظه':'انتخاب'} onClose={()=>setModal(null)}>{modal.startsWith('icon:')&&(()=>{const id=modal.split(':')[1];const color=s.navIconColor?.[id]||ICON_COLORS[PAGES.findIndex(x=>x[0]===id)%ICON_COLORS.length];const preset=Number(s.navIconPreset?.[id])||0;const gallery=s.navIconGallery?.[id];return <><Text style={styles.muted}>طرح</Text><View style={styles.modalGrid}>{(CUSTOM_PAGE_ICON_ASSETS[id]||[]).map((src:any,i:number)=>{const active=preset===i&&!gallery;return <MagicPressable key={i} accessibilityRole="radio" accessibilityState={{selected:active}} onPress={()=>{setS({navIconPreset:{...(s.navIconPreset||{}),[id]:i},navIconGallery:{...(s.navIconGallery||{}),[id]:null},navIconGalleryKind:{...(s.navIconGalleryKind||{}),[id]:null},navIconSourceKind:{...(s.navIconSourceKind||{}),[id]:'static'}});setModal(null)}} style={[styles.presetIconCard,active&&styles.presetIconCardActive,{borderColor:color}]}><Image source={src} style={styles.noraPresetImage} resizeMode="contain"/><Text style={styles.modalCardText}>{NAV_ICON_NAMES[id]?.[i]||`طرح اختصاصی ${i+1}`}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable>})}</View><Text style={styles.musicSettingTitle}>نسخهٔ متحرک</Text><View style={styles.modalGrid}><MagicPressable onPress={()=>{setS({navIconSourceKind:{...(s.navIconSourceKind||{}),[id]:'gif'},navIconGallery:{...(s.navIconGallery||{}),[id]:null},navIconGalleryKind:{...(s.navIconGalleryKind||{}),[id]:null}});setModal(null)}} style={[styles.presetIconCard,(s.navIconSourceKind?.[id]==='gif')&&styles.presetIconCardActive,{borderColor:color}]}><ExpoImage source={NAV_ICON_GIF_ASSETS[id]} contentFit="contain" autoplay style={styles.noraPresetImage}/><Text style={styles.modalCardText}>{NAV_ICON_GIF_NAMES[id]||'GIF اختصاصی نوا'}</Text>{s.navIconSourceKind?.[id]==='gif'&&!gallery&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable></View><Text style={styles.musicSettingTitle}>رنگ</Text><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8}}>{ICON_COLORS.map((c,i)=>{const active=color.toLowerCase()===c.toLowerCase();return <MagicPressable key={c} accessibilityRole="button" accessibilityLabel={`رنگ ${ICON_COLOR_NAMES[i]}`} onPress={()=>{setS({navIconColor:{...(s.navIconColor||{}),[id]:c}});setModal(null)}} style={[styles.presetIconCard,active&&styles.presetIconCardActive,{width:99,borderColor:active?'#72ffc5':c}]}><View style={{width:30,height:30,borderRadius:15,backgroundColor:c,borderWidth:1,borderColor:'#fff'}}/><Text style={styles.modalCardText}>{ICON_COLOR_NAMES[i]}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View><View style={styles.settingsActions}><MagicPressable style={styles.galleryMiniButton} onPress={async()=>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(!r.canceled&&r.assets?.[0]?.uri){const a=r.assets[0];const saved=await persistGalleryUri(a.uri,`nav_${id}_image`,a.fileName||undefined,a.mimeType||undefined);setS({navIconGallery:{...(s.navIconGallery||{}),[id]:saved},navIconGalleryKind:{...(s.navIconGalleryKind||{}),[id]:'image'},navIconSourceKind:{...(s.navIconSourceKind||{}),[id]:'gallery'}});setModal(null)}}}><Image source={require('./assets/control_custom/nav_gallery_image.png')} resizeMode="contain" style={{width:30,height:30}}/><Text style={styles.galleryMiniText}>تصویر ثابت از گالری</Text>{gallery&&s.navIconGalleryKind?.[id]==='image'&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable><MagicPressable style={styles.galleryMiniButton} onPress={async()=>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(!r.canceled&&r.assets?.[0]?.uri){const a=r.assets[0];if(!isGifAsset(a)){Alert.alert('GIF لازم است','یک فایل GIF واقعی انتخاب کن.');return;}const saved=await persistGalleryUri(a.uri,`nav_${id}_gif`,a.fileName||undefined,a.mimeType||undefined);setS({navIconGallery:{...(s.navIconGallery||{}),[id]:saved},navIconGalleryKind:{...(s.navIconGalleryKind||{}),[id]:'gif'},navIconSourceKind:{...(s.navIconSourceKind||{}),[id]:'gallery'}});setModal(null)}}}><Image source={require('./assets/control_custom/nav_gallery_gif.png')} resizeMode="contain" style={{width:30,height:30}}/><Text style={styles.galleryMiniText}>GIF متحرک از گالری</Text>{gallery&&s.navIconGalleryKind?.[id]==='gif'&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={13} color="#06111a"/></View>}</MagicPressable></View></>})()}
    {modal==='transport'&&<><View style={styles.modalGrid}><SettingsChoice label="هر دو مستقل" icon="swap-horizontal-outline" color={color} active={(s.transportMode||'dual')==='dual'} onPress={()=>choose('transportMode','dual')}/><SettingsChoice label="Bluetooth LE" icon="bluetooth-outline" color={color} active={s.transportMode==='bluetooth'} onPress={()=>choose('transportMode','bluetooth')}/><SettingsChoice label="Wi‑Fi مستقیم اسپیکر" icon="wifi-outline" color="#72ffc5" active={s.transportMode==='wifi'} onPress={()=>choose('transportMode','wifi')}/></View><TextInput value={String(s.wifiBaseUrl||'http://192.168.4.1')} onChangeText={v=>setS({wifiBaseUrl:v})} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="نشانی Wi‑Fi اسپیکر" placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/><MagicPressable style={styles.saveButton} onPress={async()=>{const ok=await WifiEsp32.ping(String(s.wifiBaseUrl||''));setS({wifiEsp32:ok});Alert.alert('Wi‑Fi اسپیکر',ok?'ارتباط Wi‑Fi تأیید شد.':'اسپیکر از این نشانی پاسخ نداد.')}}><Ionicons name="wifi" size={20} color="#fff"/><Text style={styles.saveButtonText}>بررسی اتصال Wi‑Fi</Text></MagicPressable></>}
    {modal==='aiProfile'&&<View style={styles.modalGrid}>{NORA_CHARACTER_NAMES.map((v,i)=><SettingsChoice key={v} label={v} icon="person-circle-outline" color={color} active={Number(s.noraCharacter||0)===i} onPress={()=>choose('noraCharacter',i)}/>)}</View>}
    {modal==='aiEffect'&&<View style={styles.modalGrid}>{[['تپش نرم','pulse-outline'],['چرخش آرام','sync-outline'],['هاله پرنور','radio-outline'],['ضربان واضح','sunny-outline'],['موج زنده','pulse']].map(([v,ic],i)=>{const active=Number(s.pageIconEffect?.ai||0)===i;return <SettingsChoice key={v} label={v} icon={ic} color={color} active={active} onPress={()=>{setS({pageIconEffect:{...(s.pageIconEffect||{}),ai:i}});setModal(null)}}/>})}</View>}
    {modal==='mic'&&<View style={styles.modalGrid}>{[['با لمس شروع/توقف','mic-outline'],['فقط هنگام نگه‌داشتن','hand-left-outline'],['میکروفون خاموش','mic-off-outline']].map(([v,ic],i)=>{const active=Number(s.micMode??1)===i;return <SettingsChoice key={v} label={v} icon={ic} color={color} active={active} onPress={()=>choose('micMode',i)}/>})}</View>}
    {modal==='eqStyle'&&<View style={styles.modalGrid}>{[['طیف فرکانس','stats-chart-outline'],['ستون‌های نور','bar-chart-outline'],['نبض صوتی','pulse-outline'],['موج آینه‌ای','analytics-outline']].map(([v,ic],i)=>{const active=Number(s.eqVisualMode||0)===i;return <SettingsChoice key={v} label={v} icon={ic} color={color} active={active} onPress={()=>choose('eqVisualMode',i)}/>})}</View>} 
    {modal==='rgbSettings'&&<ScrollView contentContainerStyle={{gap:12}}>
      <Text style={styles.muted}>این تنظیمات مستقیماً روی صفحه RGB و نئون ذخیره می‌شوند؛ تنظیمات تصویری صفحه نیز از تنظیمات اصلی صفحه RGB قابل تغییر است.</Text>
      <View style={styles.modalGrid}>
        {[[0,'شروع روی چهار سیمه','bulb-outline'],[1,'شروع روی رنگ دلخواه','color-palette-outline'],[2,'شروع روی نئون','rainbow-outline']].map(([v,l,ic])=><SettingsChoice key={String(v)} label={String(l)} icon={String(ic)} color="#63e8ff" active={Number(s.rgbDefaultTab||0)===Number(v)} onPress={()=>choose('rgbDefaultTab',Number(v))}/>)}
      </View>
      <View style={styles.modalGrid}>
        <SettingsChoice label="هدف رنگ RGB" icon="bulb-outline" color="#63e8ff" active={(s.rgbColorTarget||'rgb')==='rgb'} onPress={()=>choose('rgbColorTarget','rgb')}/>
        <SettingsChoice label="هدف رنگ نئون" icon="rainbow-outline" color="#ff79c8" active={s.rgbColorTarget==='neon'} onPress={()=>choose('rgbColorTarget','neon')}/>
      </View>
      <Text style={styles.musicSettingTitle}>تغییر ظاهر چرخ رنگ RGB</Text>
      <Text style={styles.muted}>پنج مدل متفاوت؛ طرح انتخابی در صفحه رنگ دلخواه ذخیره می‌شود.</Text>
      <ColorWheelAppearanceSelector value={Number(s.rgbWheelStyle||0)} onChange={v=>setS({rgbWheelStyle:v})} accent="#63e8ff"/>
      <MusicReactiveControls value={Number(s.rgbMusicReactiveMode||0)} onChange={v=>setS({rgbMusicReactiveMode:v})} accent="#63e8ff" title="سه مدل رقص نور RGB با آهنگ"/>
      <MusicReactiveControls value={Number(s.neonMusicReactiveMode||0)} onChange={v=>setS({neonMusicReactiveMode:v})} accent="#ff79c8" title="سه مدل رقص نور نئون با آهنگ"/>
      <Slider label="روشنایی RGB" value={Number(s.brightness??75)} onChange={async v=>{const n=Math.round(v*2.55);setS({brightness:v});await sendDualLightCommand(s,'light.brightness',{value:n},()=>LotusBle.brightness(Math.round(v)));}}/>
      <Slider label="سرعت RGB" value={Number(s.speed??55)} onChange={async v=>{const n=Math.round(v*2.55);setS({speed:v});await sendDualLightCommand(s,'light.speed',{value:n},()=>LotusBle.speed(Math.round(v)));}}/>
      <Slider label="روشنایی نئون" value={Number(s.neonBrightness??75)} onChange={async v=>{setS({neonBrightness:v});await sendDualLightCommand(s,'light.neonBrightness',{value:Math.round(v*2.55),target:'lotus'},()=>LotusBle.brightness(Math.round(v)));}}/>
      <Slider label="سرعت نئون" value={Number(s.neonSpeed??55)} onChange={async v=>{setS({neonSpeed:v});await sendDualLightCommand(s,'light.neonSpeed',{value:Math.round(v*2.55),target:'lotus'},()=>LotusBle.speed(Math.round(v)));}}/>
      <View style={styles.modalGrid}>
        {Array.from({length:6},(_,i)=><MagicPressable key={`rgbfx-${i}`} onPress={()=>choose('rgbEffect',i)} style={[styles.presetIconCard,Number(s.rgbEffect||0)===i&&styles.presetIconCardActive,{borderColor:'#63e8ff'}]}><Image source={require(`./assets/ui_controls/rgb_effects/effect_${i+1}.png`)} resizeMode="contain" style={styles.noraPresetImage}/><Text style={styles.modalCardText}>RGB افکت {i+1}</Text>{Number(s.rgbEffect||0)===i&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>)}
      </View>
      <MagicPressable style={styles.saveButton} onPress={()=>{setS({rgbPower:false,neonPower:false,rgbDefaultTab:0,rgbColorTarget:'rgb',rgbWheelStyle:0,rgbMusicReactiveMode:0,neonMusicReactiveMode:0,brightness:75,speed:55,neonBrightness:75,neonSpeed:55,rgbEffect:0,neonEffect:0});setModal(null)}}><Ionicons name="refresh" size={19} color="#fff"/><Text style={styles.saveButtonText}>بازنشانی تنظیمات RGB و نئون</Text></MagicPressable>
    </ScrollView>}
    {modal==='core'&&<View style={{gap:10}}><View style={styles.deviceStatusCard}><Image source={CONTROL_ART.hardwareCore} style={styles.deviceStatusArt}/><View style={styles.deviceStatusTextBlock}><Text style={styles.deviceStatusTitle}>ESP32</Text><Text style={styles.deviceStatusDesc}>Wi‑Fi: {s.wifiEsp32?'تأییدشده':'نامشخص'} · Bluetooth: {s.connected?'متصل':'نامشخص'}</Text></View></View><MagicPressable style={styles.saveButton} onPress={async()=>{const ok=await WifiEsp32.ping(String(s.wifiBaseUrl||''));setS({wifiEsp32:ok});Alert.alert('هسته ارتباطی',ok?'پاسخ واقعی ESP32 دریافت شد.':'ESP32 از نشانی فعلی پاسخ نداد.');}}><Image source={CONTROL_ART.networkCore} style={{width:30,height:30}}/><Text style={styles.saveButtonText}>بررسی واقعی Wi‑Fi</Text></MagicPressable></View>}
    {modal==='memory'&&<MemoryControlPanel s={s}/>}
    {modal==='future'&&<><View style={styles.modalGrid}>{[['حسگر','radio-outline'],['دوربین','camera-outline'],['SIM','card-outline'],['ماژول Bluetooth','bluetooth-outline']].map(([v,ic])=><SettingsChoice key={v} label={v} icon={ic} color={color} active={s.futureModule===v} onPress={()=>choose('futureModule',v)}/>)}</View></>}
    {modal==='contact'&&<><View style={styles.modalGrid}>{[['مخاطب ۱','person-circle-outline'],['مخاطب ۲','people-circle-outline'],['پیام اضطراری','chatbubble-ellipses-outline'],['غیرفعال','close-circle-outline']].map(([v,ic],i)=><SettingsChoice key={v} label={v} icon={ic} color={color} active={Number(s.emergencyContactPreset||0)===i} onPress={()=>choose('emergencyContactPreset',i)}/>)}</View></>}
    {modal==='diagnostics'&&<View style={styles.diagnosticBox}><Ionicons name="shield-checkmark-outline" size={44} color="#72ffc5"/><Text style={styles.modalTitle}>هسته آماده بررسی است</Text></View>}
    </SelectionModal>}
  </ScrollView>
}
function deviceBitState(value:any,allowBoolean=true):'connected'|'cut'|'fault'|'unknown'{
  if(value===true)return allowBoolean?'connected':'unknown';
  if(value===false)return allowBoolean?'cut':'unknown';
  if(value===null||value===undefined)return 'unknown';
  if(typeof value==='string'){
    const v=value.trim().toLowerCase();
    if(['fault','error','failed','unstable','خراب','خطا','ناپایدار'].includes(v))return 'fault';
    if(['connected','online','working','responsive','ready','on','ok','وصل','متصل','فعال','سالم'].includes(v))return 'connected';
    if(['disconnected','offline','cut','broken','off','قطع','قطع‌شده','غیرفعال','ناسالم'].includes(v))return 'cut';
    return 'unknown';
  }
  if(typeof value!=='object')return 'unknown';
  const status=String(value.status??value.state??value.result??'').trim().toLowerCase();
  if(value.fault===true||value.error===true||['fault','error','failed','unstable','خراب','خطا','ناپایدار'].includes(status))return 'fault';
  if(value.connected===true||value.working===true||value.responsive===true||value.present===true||value.ok===true||['connected','online','working','responsive','ready','on','ok','وصل','متصل','فعال','سالم'].includes(status))return 'connected';
  if(value.connected===false||value.working===false||value.responsive===false||value.present===false||value.ok===false||['disconnected','offline','cut','broken','off','قطع','قطع‌شده','غیرفعال','ناسالم'].includes(status))return 'cut';
  return 'unknown';
}
function getTelemetryItem(collection:any,key:string){
  if(!collection||typeof collection!=='object')return undefined;
  const alias:any={rgb4:['rgb4','rgb','fourWire','four_wire','rgbFourWire'],amplifier:['amplifier','amp','audioAmp'],controller:['controller','mainController','central','esp32'],galaxy:['galaxy','fiber','galaxyLight'],neon:['neon','ring','neonRing'],power:['power','mainPower','speakerPower'],volume:['volume','audio','sound','amplifier']};
  for(const k of [key,...(alias[key]||[])])if(Object.prototype.hasOwnProperty.call(collection,k))return collection[k];
  return undefined;
}
function DeviceStatusCard({item,status}:{item:any;status:'connected'|'cut'|'fault'|'unknown'}){
  const meta=STATUS_DISPLAY[status]||STATUS_DISPLAY.unknown;
  return <View style={[styles.deviceStatusCard,{borderColor:`${meta.color}66`,shadowColor:meta.color}]}>
    <View style={[styles.deviceStatusArtFrame,{borderColor:`${meta.color}88`,shadowColor:meta.color}]}><Image source={item.image} resizeMode="contain" style={styles.deviceStatusArt}/></View>
    <View style={styles.deviceStatusTextBlock}>
      <Text style={styles.deviceStatusTitle}>{item.label}</Text>
      <Text style={styles.deviceStatusDesc}>{item.desc}</Text>
      <View style={styles.deviceStatusLine}><View accessibilityLabel={meta.label} style={[styles.deviceStatusLed,{backgroundColor:meta.color,shadowColor:meta.color,shadowOpacity:status==='unknown'?0.16:0.95}]}/><Text style={[styles.deviceStatusLabel,{color:meta.color}]}>{meta.label}</Text></View>
    </View>
  </View>;
}
function FuseStatusPanel({s}:{s:any}){
  const [telemetry,setTelemetry]=useState<any>(null);const [loading,setLoading]=useState(false);const [updatedAt,setUpdatedAt]=useState('');
  const refresh=useCallback(async()=>{
    setLoading(true);
    try{
      const next=await WifiEsp32.readStatus(String(s.wifiBaseUrl||''));
      if(next){setTelemetry(next);setUpdatedAt(new Date().toLocaleTimeString());}
      else{setTelemetry(null);setUpdatedAt('');}
    }catch{setTelemetry(null);setUpdatedAt('');}
    finally{setLoading(false);}
  },[s.wifiBaseUrl]);
  useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[refresh]);
  const fuseData=telemetry?.fuses;const touchData=telemetry?.touchButtons;
  const statusFor=(collection:any,key:string,allowBoolean=true)=>deviceBitState(getTelemetryItem(collection,key),allowBoolean);
  return <View style={{gap:14}}>
    <View style={styles.fuseStatusIntro}><View style={[styles.fuseStatusIntroIcon,{borderColor:'#ffd166',shadowColor:'#ffd166'}]}><Image source={CONTROL_ART.fuseController} resizeMode="contain" style={styles.fuseStatusIntroArt}/></View><View style={{flex:1}}><Text style={styles.fuseStatusIntroTitle}>وضعیت مدارها</Text><Text style={styles.fuseStatusIntroText}>این صفحه فقط وضعیت گزارش‌شده را نمایش می‌دهد؛ هیچ فیوز یا کلیدی از اینجا خاموش و روشن نمی‌شود.</Text></View></View>
    <View style={styles.deviceStatusHeading}><Text style={styles.deviceStatusSectionTitle}>فیوزهای مستقل</Text><Text style={styles.deviceStatusSectionHint}>۵ مسیر جداگانه</Text></View>
    <View style={styles.deviceStatusList}>{FUSE_STATUS_ITEMS.map(item=><DeviceStatusCard key={`fuse-${item.id}`} item={item} status={statusFor(fuseData,item.key)}/>)}</View>
    <View style={styles.deviceStatusHeading}><Text style={styles.deviceStatusSectionTitle}>کلیدهای لمسی</Text><Text style={styles.deviceStatusSectionHint}>سلامت پاسخ کلید</Text></View>
    <View style={styles.deviceStatusList}>{TOUCH_STATUS_ITEMS.map(item=><DeviceStatusCard key={`touch-${item.id}`} item={item} status={statusFor(touchData,item.key,true)}/>)}</View>
    <View style={styles.fuseStatusFooter}><Text style={styles.fuseStatusFooterText}>{(telemetry?.fuses||telemetry?.touchButtons)?'وضعیت فیوزها و کلیدها از گزارش دستگاه خوانده شده است.':telemetry?'پاسخ دستگاه دریافت شد، اما دادهٔ معتبر فیوزها/کلیدها در گزارش نیست؛ چراغ‌ها خاکستری می‌مانند.':'هنوز گزارش معتبرِ مدارها و کلیدها دریافت نشده؛ چراغ‌ها خاکستری می‌مانند تا دادهٔ واقعی برسد.'}{updatedAt?`  ·  ${updatedAt}`:''}</Text><MagicPressable onPress={()=>void refresh()} style={({pressed})=>[styles.fuseRefreshButton,pressed&&styles.pressed]}><Image source={CONTROL_ART.fuseController} resizeMode="contain" style={{width:25,height:25}}/><Text style={styles.fuseRefreshText}>{loading?'در حال بررسی…':'بررسی دوباره'}</Text></MagicPressable></View>
  </View>;
}


function SpeakerSoundPanel({s,setS,onPreview}:{s:any;setS:(p:any)=>void;onPreview:(key:string,source:any)=>void}){
  const [selectedEventKey,setSelectedEventKey]=useState<string|null>(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [picking,setPicking]=useState(false);
  const alerts={...DEFAULT_SPEAKER_ALERTS,...(s.speakerAlerts||{})};
  const getConfig=(key:string)=>({...DEFAULT_SPEAKER_ALERTS[key],...(alerts[key]||{})});
  const updateConfig=(key:string,next:any)=>setS({speakerAlerts:{...alerts,[key]:{...getConfig(key),...next}}});
  const selectedEvent=SPEAKER_ALERT_EVENTS.find((event:any)=>event.key===selectedEventKey) as any;
  const selectedConfig=selectedEvent?getConfig(selectedEvent.key):null;
  const currentLabel=(conf:any)=>conf.mode==='off'?'خاموش':conf.mode==='file'?(conf.fileName||'فایل انتخابی'):SPEAKER_VOICE_PRESETS[Math.max(0,Math.min(SPEAKER_VOICE_PRESETS.length-1,Number(conf.presetId)||0))].label;
  const previewCurrent=()=>{
    if(!selectedEvent||!selectedConfig)return;
    if(selectedConfig.mode==='off'){
      Alert.alert('هنوز صدایی انتخاب نشده','یکی از پنج نمونه را با دکمهٔ «شنیدن» آزمایش کن، یا ابتدا یک صدا انتخاب کن.');
      return;
    }
    if(selectedConfig.mode==='file'&&selectedConfig.fileUri)onPreview(selectedEvent.key,{uri:selectedConfig.fileUri});
    else onPreview(selectedEvent.key,SPEAKER_ALERT_CLIPS[selectedEvent.key]?.[Math.max(0,Math.min(4,Number(selectedConfig.presetId)||0))]);
  };
  const choosePreset=(presetId:number)=>{
    if(!selectedEvent)return;
    updateConfig(selectedEvent.key,{mode:'preset',presetId,fileUri:null,fileName:null});
    setSelectedEventKey(null);
  };
  const chooseCustomFile=async()=>{
    if(!selectedEvent)return;
    setPicking(true);
    try{
      const picked=await DocumentPicker.getDocumentAsync({type:'audio/*',copyToCacheDirectory:true,multiple:false});
      if(picked.canceled||!picked.assets?.[0])return;
      const asset=picked.assets[0];
      const name=String(asset.name||'audio.mp3');
      const ext=(name.match(/\.([a-z0-9]{2,5})$/i)?.[1]||'mp3').toLowerCase();
      const permittedExtensions=['mp3','wav','m4a','aac','ogg','3gp','opus'];
      if(!(String(asset.mimeType||'').startsWith('audio/')||permittedExtensions.includes(ext))){
        Alert.alert('فایل صوتی پشتیبانی نمی‌شود','یک فایل صوتی رایج مانند MP3، WAV، M4A، AAC یا OGG انتخاب کن.');
        return;
      }
      const root=FileSystem.documentDirectory;
      if(!root)throw new Error('Persistent document folder unavailable');
      const directory=`${root}speaker_alerts/`;
      await FileSystem.makeDirectoryAsync(directory,{intermediates:true}).catch(()=>{});
      const safeName=name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-70)||`nova_${ext}`;
      const destination=`${directory}${Date.now()}_${safeName}`;
      await FileSystem.copyAsync({from:asset.uri,to:destination});
      const previousFile=selectedConfig?.mode==='file'?String(selectedConfig.fileUri||''):'';
      updateConfig(selectedEvent.key,{mode:'file',fileUri:destination,fileName:name,presetId:0});
      if(previousFile&&previousFile.startsWith(directory)&&previousFile!==destination)void FileSystem.deleteAsync(previousFile,{idempotent:true}).catch(()=>{});
      const previewKey=selectedEvent.key;
      setSelectedEventKey(null);
      onPreview(previewKey,{uri:destination});
    }catch{
      Alert.alert('انتخاب صدا انجام نشد','فایل در حافظهٔ امن برنامه ذخیره نشد؛ دوباره امتحان کن.');
    }finally{setPicking(false);}
  };
  const turnEverythingOff=()=>{
    // The master switch silences every event without destroying its individual chosen voice.
    setS({speakerAlertsEnabled:false});
    setSettingsOpen(false);
  };
  return <View style={styles.speakerSoundPanel}>
    <View style={styles.speakerSoundHero}>
      <Image source={require('./assets/speaker_alerts_custom/phone_to_speaker.png')} resizeMode="contain" style={styles.speakerSoundHeroArt}/>
      <View style={{flex:1,minWidth:0,gap:5}}>
        <Text style={styles.speakerSoundHeroTitle}>آواهای زندهٔ کوروش نوا</Text>
        <Text style={styles.speakerSoundHeroText}>برای هر رویداد صدای مستقل انتخاب کن؛ پنج نمونهٔ اختصاصی آفلاین، فایل دلخواه یا سکوت.</Text>
        <View style={styles.speakerSoundHeroActions}>
          <MagicPressable onPress={()=>setS({speakerAlertsEnabled:s.speakerAlertsEnabled===false})} style={[styles.speakerSoundMasterButton,{borderColor:s.speakerAlertsEnabled===false?'#8992a8':'#72ffc5'}]}>
            <Image source={require('./assets/speaker_alerts_custom/mute_sound.png')} resizeMode="contain" style={styles.speakerSoundMiniArt}/>
            <Text style={[styles.speakerSoundMasterText,{color:s.speakerAlertsEnabled===false?'#aab1c4':'#72ffc5'}]}>{s.speakerAlertsEnabled===false?'همهٔ آواها خاموش':'همهٔ آواها روشن'}</Text>
            <View style={[styles.securityTickBox,s.speakerAlertsEnabled!==false&&styles.securityTickBoxActive]}>{s.speakerAlertsEnabled!==false&&<Ionicons name="checkmark" size={16} color="#06111a"/>}</View>
          </MagicPressable>
          <MagicPressable onPress={()=>setSettingsOpen(true)} style={styles.speakerSoundSettingsButton}><Image source={require('./assets/speaker_alerts_custom/voice_royal.png')} resizeMode="contain" style={styles.speakerSoundMiniArt}/><Text style={styles.speakerSoundSettingsText}>تنظیمات آوا</Text></MagicPressable>
        </View>
      </View>
    </View>
    <View style={styles.speakerSoundSectionTitleRow}><Text style={styles.speakerSoundSectionTitle}>رویدادهای اسپیکر</Text><Text style={styles.speakerSoundHint}>هر کارت پنجرهٔ مستقل دارد</Text></View>
    <View style={styles.speakerSoundEventList}>{SPEAKER_ALERT_EVENTS.map((event:any)=>{
      const conf=getConfig(event.key);const label=currentLabel(conf);const enabled=s.speakerAlertsEnabled!==false&&conf.mode!=='off';
      return <MagicPressable key={event.key} accessibilityRole="button" accessibilityLabel={`تنظیم آوای ${event.label}`} onPress={()=>setSelectedEventKey(event.key)} style={({pressed})=>[styles.speakerSoundEventCard,{borderColor:enabled?`${event.color}99`:'rgba(137,146,168,.42)',shadowColor:event.color},pressed&&styles.pressed]}>
        <View style={[styles.speakerSoundEventArtFrame,{borderColor:enabled?`${event.color}88`:'rgba(137,146,168,.4)'}]}><Image source={event.image} resizeMode="contain" style={styles.speakerSoundEventArt}/></View>
        <View style={styles.speakerSoundEventText}><Text style={styles.speakerSoundEventTitle}>{event.label}</Text><Text style={styles.speakerSoundEventDesc}>{event.description}</Text><Text numberOfLines={1} style={[styles.speakerSoundCurrent,{color:enabled?event.color:'#8992a8'}]}>{label}</Text></View>
        <View style={styles.speakerSoundEventRight}><View style={[styles.deviceStatusLed,{backgroundColor:enabled?'#72ffc5':s.speakerAlertsEnabled===false||conf.mode==='off'?'#8992a8':'#ffd166',shadowColor:enabled?'#72ffc5':'#8992a8'}]}/><Ionicons name="options-outline" size={20} color={event.color}/></View>
      </MagicPressable>;
    })}</View>
    <View style={styles.speakerSoundFooter}><Image source={require('./assets/speaker_alerts_custom/audio_preview_phone.png')} resizeMode="contain" style={styles.speakerSoundFooterArt}/><Text style={styles.speakerSoundFooterText}>پیش‌شنوی از مسیر صوتی فعال گوشی پخش می‌شود؛ اگر صدای گوشی به بلوتوث اسپیکر هدایت شده باشد، از اسپیکر شنیده می‌شود. اعلان‌هایی که اتصالشان از خود دستگاه گزارش نشده، بدون دادهٔ واقعی به‌صورت خودکار اعلام نمی‌شوند.</Text></View>
    {selectedEvent&&<SelectionModal title={`آوای ${selectedEvent.label}`} onClose={()=>setSelectedEventKey(null)}>
      <View style={styles.speakerSoundModalHero}><Image source={selectedEvent.image} resizeMode="contain" style={styles.speakerSoundModalHeroArt}/><View style={{flex:1,gap:4}}><Text style={styles.speakerSoundModalTitle}>{selectedEvent.label}</Text><Text style={styles.speakerSoundModalText}>{selectedEvent.description}</Text><Text style={styles.speakerSoundModalText}>انتخاب صدا این رویداد مستقل ذخیره می‌شود.</Text></View></View>
      <MagicPressable onPress={previewCurrent} style={styles.speakerSoundPhonePreview}><Image source={require('./assets/speaker_alerts_custom/audio_preview_phone.png')} resizeMode="contain" style={styles.speakerSoundActionArt}/><View style={{flex:1}}><Text style={styles.speakerSoundActionTitle}>شنیدن صدای انتخاب‌شده</Text><Text style={styles.speakerSoundActionDesc}>پخش آزمایشی از مسیر صدای گوشی</Text></View><Ionicons name="play-circle" size={27} color="#72ffc5"/></MagicPressable>
      <Text style={styles.speakerSoundSectionTitle}>پنج صدای اختصاصی و آفلاین نوا</Text>
      <View style={styles.speakerSoundPresetGrid}>{SPEAKER_VOICE_PRESETS.map((preset:any,index:number)=>{
        const active=selectedConfig?.mode==='preset'&&Number(selectedConfig?.presetId)===index;
        return <View key={preset.id} style={[styles.speakerSoundPresetCard,{borderColor:active?'#72ffc5':preset.color,shadowColor:preset.color},active&&styles.speakerSoundPresetCardActive]}>
          <Image source={preset.image} resizeMode="contain" style={styles.speakerSoundPresetArt}/><Text style={styles.speakerSoundPresetName}>{preset.label}</Text>
          <View style={styles.speakerSoundPresetActions}>
            <MagicPressable accessibilityRole="button" accessibilityLabel={`شنیدن ${preset.label}`} onPress={()=>onPreview(selectedEvent.key,SPEAKER_ALERT_CLIPS[selectedEvent.key][index])} style={[styles.speakerSoundPresetPreview,{borderColor:preset.color}]}><Ionicons name="play" size={15} color={preset.color}/><Text style={[styles.speakerSoundPresetButtonText,{color:preset.color}]}>شنیدن</Text></MagicPressable>
            <MagicPressable accessibilityRole="button" accessibilityLabel={`انتخاب ${preset.label}`} onPress={()=>choosePreset(index)} style={[styles.speakerSoundPresetChoose,active&&styles.speakerSoundPresetChooseActive]}><Text style={[styles.speakerSoundPresetButtonText,{color:active?'#06111a':'#fff'}]}>{active?'انتخاب شده':'انتخاب'}</Text>{active&&<Ionicons name="checkmark" size={15} color="#06111a"/>}</MagicPressable>
          </View>
        </View>;
      })}</View>
      <MagicPressable disabled={picking} onPress={()=>void chooseCustomFile()} style={[styles.speakerSoundFileButton,picking&&{opacity:.6}]}><Image source={require('./assets/speaker_alerts_custom/choose_audio_file.png')} resizeMode="contain" style={styles.speakerSoundActionArt}/><View style={{flex:1}}><Text style={styles.speakerSoundActionTitle}>{picking?'در حال ذخیرهٔ فایل…':'انتخاب صدا از حافظهٔ گوشی'}</Text><Text style={styles.speakerSoundActionDesc}>{selectedConfig?.mode==='file'&&selectedConfig.fileName?`فعلی: ${selectedConfig.fileName}`:'فایل صوتی را انتخاب کن؛ در برنامه ذخیره می‌شود.'}</Text></View><Ionicons name="folder-open" size={24} color="#63e8ff"/></MagicPressable>
      <MagicPressable onPress={()=>{updateConfig(selectedEvent.key,{mode:'off'});setSelectedEventKey(null)}} style={styles.speakerSoundMuteButton}><Image source={require('./assets/speaker_alerts_custom/mute_sound.png')} resizeMode="contain" style={styles.speakerSoundActionArt}/><View style={{flex:1}}><Text style={styles.speakerSoundActionTitle}>این رویداد بدون صدا باشد</Text><Text style={styles.speakerSoundActionDesc}>فقط اعلان همین کارت خاموش می‌شود.</Text></View><View style={[styles.securityTickBox,selectedConfig?.mode==='off'&&styles.securityTickBoxActive]}>{selectedConfig?.mode==='off'&&<Ionicons name="checkmark" size={16} color="#06111a"/>}</View></MagicPressable>
    </SelectionModal>}
    {settingsOpen&&<SelectionModal title="تنظیمات عمومی آواهای نوا" onClose={()=>setSettingsOpen(false)}>
      <View style={styles.speakerSoundModalHero}><Image source={require('./assets/speaker_alerts_custom/voice_royal.png')} resizeMode="contain" style={styles.speakerSoundModalHeroArt}/><View style={{flex:1,gap:4}}><Text style={styles.speakerSoundModalTitle}>شدت صدای اعلان‌ها</Text><Text style={styles.speakerSoundModalText}>تنظیم حجم روی پیش‌شنوی و اعلان‌های صوتی اعمال می‌شود.</Text></View></View>
      <View style={styles.speakerSoundVolumeGrid}>{[{value:30,label:'آرام',image:require('./assets/speaker_alerts_custom/voice_calm.png')},{value:55,label:'معمولی',image:require('./assets/speaker_alerts_custom/voice_aurora.png')},{value:75,label:'واضح',image:require('./assets/speaker_alerts_custom/voice_heartbeat.png')},{value:100,label:'بلند',image:require('./assets/speaker_alerts_custom/voice_royal.png')}].map((v:any)=><MagicPressable key={v.value} onPress={()=>setS({speakerAlertVolume:v.value})} style={[styles.speakerSoundVolumeCard,Number(s.speakerAlertVolume??70)===v.value&&styles.speakerSoundVolumeCardActive]}><Image source={v.image} resizeMode="contain" style={styles.speakerSoundVolumeArt}/><Text style={styles.speakerSoundVolumeName}>{v.label}</Text><Text style={styles.speakerSoundVolumePct}>{v.value}٪</Text>{Number(s.speakerAlertVolume??70)===v.value&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>)}</View>
      <View style={styles.speakerSoundBluetoothCard}><Image source={require('./assets/speaker_alerts_custom/bluetooth_connected.png')} resizeMode="contain" style={styles.speakerSoundActionArt}/><View style={{flex:1,gap:4}}><Text style={styles.speakerSoundActionTitle}>تشخیص خروجی صدای Bluetooth نوا</Text><Text style={styles.speakerSoundActionDesc}>نامی وارد کن که در تنظیمات Bluetooth گوشی برای اسپیکر دیده می‌شود.</Text><TextInput value={String(s.speakerBluetoothName??'Nova')} onChangeText={(v)=>setS({speakerBluetoothName:v})} placeholder="مثلاً Korosh Nova" placeholderTextColor="rgba(255,255,255,.4)" style={[styles.input,{marginTop:3,marginBottom:0,minHeight:42}]}/></View></View>
      <MagicPressable onPress={async()=>{const permitted=await btPermissions();if(!permitted){Alert.alert('دسترسی Bluetooth لازم است','برای خواندن خروجی صوتی واقعی، مجوز Bluetooth گوشی را تأیید کن.');return;}try{const result:any=await AudioRoute.getBluetoothAudioDevices();if(!result?.supported){Alert.alert('وضعیت نامعلوم است','گوشی اجازهٔ خواندن وضعیت خروجی Bluetooth را نداد؛ چراغ وضعیت خاکستری می‌ماند.');return;}const devices=Array.isArray(result.devices)?result.devices:[];const matched=devices.find((device:any)=>matchesNovaAudioRoute(String(device?.name||''),String(s.speakerBluetoothName||'Nova')));setS({bluetoothSpeakerConnected:!!matched});Alert.alert(matched?'خروجی Bluetooth نوا شناسایی شد':'خروجی Bluetooth نوا شناسایی نشد',matched?`خروجی فعال: ${String(matched.name||'Nova')}`:devices.length?`نام‌های خروجی متصل: ${devices.map((v:any)=>v.name).filter(Boolean).join('، ')}. نام بالا را با نام اسپیکر هماهنگ کن.`:'فعلاً خروجی صوتی Bluetooth متصل گزارش نشده.');}catch{Alert.alert('بررسی انجام نشد','وضعیت خروجی صوتی خوانده نشد؛ پس از بررسی مجوزها دوباره تلاش کن.');}}} style={styles.speakerSoundBtCheck}><Image source={require('./assets/speaker_alerts_custom/audio_preview_phone.png')} resizeMode="contain" style={{width:32,height:32}}/><Text style={styles.speakerSoundPresetButtonText}>بررسی اتصال واقعی Bluetooth</Text><View style={[styles.deviceStatusLed,{backgroundColor:s.bluetoothSpeakerConnected===true?'#72ffc5':s.bluetoothSpeakerConnected===false?'#ff465f':'#8992a8',shadowColor:s.bluetoothSpeakerConnected===true?'#72ffc5':s.bluetoothSpeakerConnected===false?'#ff465f':'#8992a8'}]}/></MagicPressable>
      <Text style={styles.speakerSoundBluetoothHint}>{s.bluetoothSpeakerConnected===true?'خروجی صوتی نام‌گذاری‌شدهٔ نوا فعال است.':s.bluetoothSpeakerConnected===false?'خروجی متصل با نام واردشده پیدا نشد.': 'وضعیت خروجی هنوز تأیید نشده است.'}</Text>
      <MagicPressable onPress={turnEverythingOff} style={styles.speakerSoundMuteButton}><Image source={require('./assets/speaker_alerts_custom/mute_sound.png')} resizeMode="contain" style={styles.speakerSoundActionArt}/><View style={{flex:1}}><Text style={styles.speakerSoundActionTitle}>خاموش‌کردن همهٔ صداها</Text><Text style={styles.speakerSoundActionDesc}>همهٔ رویدادها یکجا بی‌صدا می‌شوند.</Text></View><Ionicons name="volume-mute" size={23} color="#ff879b"/></MagicPressable>
      <MagicPressable onPress={()=>{setS({speakerAlertsEnabled:true});setSettingsOpen(false)}} style={styles.speakerSoundMasterEnable}><Ionicons name="volume-high" size={21} color="#06111a"/><Text style={styles.speakerSoundMasterEnableText}>روشن‌کردن همهٔ آواها</Text></MagicPressable>
    </SelectionModal>}
  </View>;
}

function PatternPad({onComplete,onInvalid,label='الگو را رسم کن',disabled=false}:{onComplete:(pattern:string)=>void;onInvalid?:()=>void;label?:string;disabled?:boolean}){
  const size=244,margin=40,step=82;const [path,setPath]=useState<number[]>([]);const pathRef=useRef<number[]>([]);const completeRef=useRef(onComplete);const invalidRef=useRef(onInvalid);
  useEffect(()=>{completeRef.current=onComplete;invalidRef.current=onInvalid},[onComplete,onInvalid]);
  const addPoint=(evt:any)=>{const x=Number(evt?.nativeEvent?.locationX),y=Number(evt?.nativeEvent?.locationY);if(!Number.isFinite(x)||!Number.isFinite(y))return;const col=Math.round((x-margin)/step),row=Math.round((y-margin)/step);if(col<0||col>2||row<0||row>2)return;const cx=margin+col*step,cy=margin+row*step;if(Math.hypot(x-cx,y-cy)>31)return;const id=row*3+col;if(!pathRef.current.includes(id)){const next=[...pathRef.current,id];pathRef.current=next;setPath(next);}};
  const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>!disabled,onMoveShouldSetPanResponder:()=>!disabled,onPanResponderTerminationRequest:()=>false,onPanResponderGrant:(evt)=>{if(disabled)return;pathRef.current=[];setPath([]);addPoint(evt)},onPanResponderMove:(evt)=>{if(!disabled)addPoint(evt)},onPanResponderRelease:()=>{const result=pathRef.current.slice();pathRef.current=[];setPath([]);if(result.length>=4)completeRef.current(result.join('-'));else invalidRef.current?.()},onPanResponderTerminate:()=>{pathRef.current=[];setPath([])} }),[disabled]);
  const centers=Array.from({length:9},(_,i)=>({id:i,x:margin+(i%3)*step,y:margin+Math.floor(i/3)*step}));
  const lines=path.slice(1).map((id,i)=>{const a=centers[path[i]],b=centers[id];const dx=b.x-a.x,dy=b.y-a.y;const length=Math.sqrt(dx*dx+dy*dy);const angle=Math.atan2(dy,dx);return <View key={`${path[i]}-${id}`} pointerEvents="none" style={{position:'absolute',left:(a.x+b.x)/2-length/2,top:(a.y+b.y)/2-2,width:length,height:4,borderRadius:3,backgroundColor:'#72ffc5',shadowColor:'#72ffc5',shadowOpacity:.95,shadowRadius:8,transform:[{rotate:`${angle}rad`}]}}/>});
  return <View style={styles.patternPadWrap}><Text style={styles.patternPadLabel}>{label}</Text><View style={styles.patternPad} {...pan.panHandlers}>{lines}{centers.map(point=>{const active=path.includes(point.id);return <View key={point.id} pointerEvents="none" style={[styles.patternDot,{left:point.x-12,top:point.y-12},active&&styles.patternDotActive]}><View style={[styles.patternDotCore,active&&styles.patternDotCoreActive]}/></View>})}</View><Text style={styles.patternHint}>نقطه‌ها را به هم وصل کن؛ حداقل ۴ نقطه</Text></View>;
}
function SecurityMethodCard({item,active,onPress,disabled=false}:{item:any;active:boolean;onPress:()=>void;disabled?:boolean}){
  return <MagicPressable accessibilityRole="button" accessibilityLabel={item.label} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.securityMethodCard,{borderColor:active?'#72ffc5':item.color,shadowColor:item.color,opacity:disabled ? 0.52 : 1},active&&styles.securityMethodCardActive,pressed&&!disabled&&styles.pressed]}><Image source={item.image} resizeMode="contain" style={styles.securityMethodArt}/><Text style={styles.securityMethodTitle}>{item.label}</Text><Text style={styles.securityMethodDesc}>{item.desc}</Text><View style={[styles.securityTickBox,active&&styles.securityTickBoxActive]}>{active&&<Ionicons name="checkmark" size={17} color="#06111a"/>}</View></MagicPressable>;
}
function SecurityTargetCard({item,active,onPress,disabled=false}:{item:any;active:boolean;onPress:()=>void;disabled?:boolean}){
  return <MagicPressable accessibilityRole="checkbox" accessibilityState={{checked:active,disabled}} accessibilityLabel={item.label} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.securityTargetCard,{borderColor:active?'#72ffc5':`${item.color}77`,shadowColor:item.color,opacity:disabled ? 0.52 : 1},active&&styles.securityTargetCardActive,pressed&&!disabled&&styles.pressed]}><Image source={item.image} resizeMode="contain" style={styles.securityTargetArt}/><View style={styles.securityTargetText}><Text style={styles.securityTargetTitle}>{item.label}</Text><Text style={styles.securityTargetDesc}>{item.desc}</Text></View><View style={[styles.securityTickBox,active&&styles.securityTickBoxActive]}>{active&&<Ionicons name="checkmark" size={18} color="#06111a"/>}</View></MagicPressable>;
}
async function makeRecoveryCode(){
  const bytes=await Crypto.getRandomBytesAsync(10);const hex=Array.from(bytes).map((v:number)=>v.toString(16).padStart(2,'0')).join('').toUpperCase();return hex.match(/.{1,4}/g)?.join('-')||hex;
}
function normalizeRecoveryCode(value:string){return String(value||'').toUpperCase().replace(/[^A-F0-9]/g,'');}
function SecurityPanel({s,setS}:{s:any;setS:(p:any)=>void}){
  const [serviceState,setServiceState]=useState<'checking'|'unconfigured'|'available'|'offline'>(FAMILY_SECURITY_CONFIGURED?'checking':'unconfigured');
  const [serviceMessage,setServiceMessage]=useState(FAMILY_SECURITY_CONFIGURED?'در حال بررسی سرویس مرکزی…':'سرویس مرکزی خانواده هنوز پیکربندی نشده است.');
  const [pairInput,setPairInput]=useState('');const [issuedPairCode,setIssuedPairCode]=useState('');const [issuedPairExpiry,setIssuedPairExpiry]=useState('');const [devicePolicy,setDevicePolicy]=useState<FamilySecuritySnapshot|null>(null);const [memberEnrolled,setMemberEnrolled]=useState(false);const [deviceList,setDeviceList]=useState<FamilyDevice[]>([]);
  const [email,setEmail]=useState('');const [otp,setOtp]=useState('');const [otpRequested,setOtpRequested]=useState(false);
  const [token,setToken]=useState<string|null>(null);const [snapshot,setSnapshot]=useState<FamilySecuritySnapshot|null>(null);
  const [settingsOpen,setSettingsOpen]=useState(false);const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  const [method,setMethod]=useState<FamilyAuthMethod>('pin');const [currentPin,setCurrentPin]=useState('');const [pin,setPin]=useState('');const [pinConfirm,setPinConfirm]=useState('');const [patternFirst,setPatternFirst]=useState('');const [patternConfirmed,setPatternConfirmed]=useState(false);
  const [recoveryCode,setRecoveryCode]=useState('');const [recoveryVisible,setRecoveryVisible]=useState(false);const [recoveryAcknowledged,setRecoveryAcknowledged]=useState(false);
  const [bioAvailable,setBioAvailable]=useState(false);const [bioEnrolled,setBioEnrolled]=useState(false);const [localBioEnabled,setLocalBioEnabled]=useState(false);
  const options={...DEFAULTS.securityOptions,...(snapshot?.options||s.securityOptions||{})};
  const syncSnapshot=(fresh:FamilySecuritySnapshot,localBio=localBioEnabled)=>{
    setSnapshot(fresh);setMethod(fresh.authMethod);
    const deviceMethod:FamilyAuthMethod=fresh.authMethod==='biometric'&&!localBio?'pin':fresh.authMethod;
    setS({securityOwnerSetup:!!fresh.hasCredential,securityOwnerRole:fresh.primaryOwnerRole||'',securityOwnerName:fresh.currentName||'',securityMethod:deviceMethod,securityBiometric:!!fresh.biometricAllowed&&localBio,securityPinSet:!!fresh.hasCredential,securityOptions:{...DEFAULTS.securityOptions,...fresh.options},familySecurityVersion:fresh.policyVersion,familySecurityServiceConnected:true,familySecuritySyncedAt:Date.now(),familySecurityEnrollment:'enrolled'});
  };
  const refreshSnapshot=async(activeToken:string)=>{
    const fresh=await fetchFamilySecurity(activeToken);syncSnapshot(fresh);return fresh;
  };
  useEffect(()=>{
    let active=true;
    const probe=async()=>{
      const localBio=await SecureStore.getItemAsync('korosh_nova_local_biometric_enabled_v1').catch(()=>null);
      const hardware=await LocalAuthentication.hasHardwareAsync().catch(()=>false);
      const enrolled=await LocalAuthentication.isEnrolledAsync().catch(()=>false);
      if(active){setLocalBioEnabled(localBio==='true');setBioAvailable(!!hardware);setBioEnrolled(!!enrolled);}
      const savedDeviceToken=await getFamilyDeviceToken().catch(()=>null);
      if(savedDeviceToken){
        try{const policy=await fetchFamilyDevicePolicy(savedDeviceToken);if(active){setMemberEnrolled(true);setDevicePolicy(policy);setS({securityOwnerSetup:!!policy.hasCredential,securityPinSet:!!policy.hasCredential,securityOwnerRole:policy.primaryOwnerRole||'',securityMethod:policy.authMethod,securityBiometric:!!policy.biometricAllowed,securityOptions:{...DEFAULTS.securityOptions,...policy.options},familySecurityVersion:policy.policyVersion,familySecurityServiceConnected:true,familySecuritySyncedAt:Date.now(),familySecurityEnrollment:'enrolled'});}}
        catch(error:any){if(active&&error?.status===401){await clearFamilyDeviceToken();setMemberEnrolled(false);setDevicePolicy(null);setS({familySecurityServiceConnected:false,familySecurityEnrollment:'revoked',securityOptions:{...DEFAULTS.securityOptions},securityOwnerSetup:false,securityPinSet:false});}else if(active){setMemberEnrolled(true);setServiceMessage('کد عضویت روی این گوشی وجود دارد، اما دریافت سیاست تازه از سرور تأیید نشد.');}}
      }
      if(!FAMILY_SECURITY_CONFIGURED){if(active){setServiceState('unconfigured');setServiceMessage('سرویس خانواده تعیین نشده؛ هیچ گوشی‌ای مالک خودکار نمی‌شود و هیچ قفل خانوادگی فعال اعلام نمی‌شود.');}return;}
      try{const health=await checkFamilyService();if(active){setServiceState(health.configured?'available':'unconfigured');setServiceMessage(health.configured?`سرویس مرکزی پاسخ می‌دهد · ${health.familyName||'خانواده کوروش نوا'}`:'سرویس پاسخ می‌دهد، اما پیکربندی خانوادگی/ایمیل/پایگاه‌داده کامل نیست.');}}
      catch{if(active){setServiceState('offline');setServiceMessage('سرویس مرکزی در دسترس نیست؛ وضعیت همگام‌سازی تأیید نشده است.');}}
    };
    void probe();
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!token)return;
    const subscription=AppState.addEventListener('change',nextState=>{
      if(nextState==='background'){
        setToken(null);setSnapshot(null);setOtp('');setOtpRequested(false);setCurrentPin('');setPin('');setPinConfirm('');setPatternFirst('');setPatternConfirmed(false);setRecoveryVisible(false);setRecoveryCode('');setIssuedPairCode('');
        setStatus('برای حفاظت از مدیریت امنیت، نشست والد پس از رفتن برنامه به پس‌زمینه بسته شد. برای ادامه دوباره ایمیل را تأیید کن.');
      }
    });
    return()=>subscription.remove();
  },[token]);
  const sendCode=async()=>{
    if(!FAMILY_SECURITY_CONFIGURED){setServiceMessage('نشانی API خانواده هنوز در تنظیمات Build وارد نشده است.');setServiceState('unconfigured');return;}
    if(!/^\S+@\S+\.\S+$/.test(email.trim())){setStatus('ایمیل معتبر پدر یا مادر را وارد کن.');return;}
    setBusy(true);setStatus('');
    try{await requestFamilyEmailCode(email);setOtpRequested(true);setStatus('اگر این ایمیل از قبل در سرور به‌عنوان پدر یا مادر ثبت شده باشد، کد شش‌رقمی ارسال می‌شود.');}
    catch(error:any){setStatus(error?.message||'ارسال کد ایمیل انجام نشد.');}
    finally{setBusy(false);}
  };
  const verifyCode=async()=>{
    if(!/^\d{6}$/.test(otp.trim())){setStatus('کد شش‌رقمی ایمیل را وارد کن.');return;}
    setBusy(true);setStatus('');
    try{
      const result=await verifyFamilyEmailCode(email,otp);await registerAdminDevice(result.token);setToken(result.token);setOtp('');setOtpRequested(false);
      const fresh=await refreshSnapshot(result.token);setServiceState('available');setMemberEnrolled(true);
      setStatus(`${result.profile.name} با ایمیل تأیید شد. فقط دو جایگاه پدر/مادر در این خانواده مجاز است.`);
      if(!fresh.hasCredential)setSettingsOpen(true);
    }catch(error:any){setStatus(error?.message||'تأیید والد انجام نشد.');}
    finally{setBusy(false);}
  };
  const joinDevice=async()=>{
    if(!FAMILY_SECURITY_CONFIGURED){setStatus('سرویس مرکزی هنوز پیکربندی نشده است؛ این گوشی متصل نشد.');return;}
    if(!/^\d{8}$/.test(pairInput.trim())){setStatus('کد اتصال باید ۸ رقم باشد.');return;}
    setBusy(true);setStatus('');
    try{const result=await enrollFamilyDevice(pairInput.trim());setPairInput('');setMemberEnrolled(true);setDevicePolicy(result.policy);setS({securityOwnerSetup:!!result.policy.hasCredential,securityPinSet:!!result.policy.hasCredential,securityMethod:result.policy.authMethod,securityBiometric:!!result.policy.biometricAllowed,securityOptions:{...DEFAULTS.securityOptions,...result.policy.options},familySecurityVersion:result.policy.policyVersion,familySecurityServiceConnected:true,familySecuritySyncedAt:Date.now(),familySecurityEnrollment:'enrolled'});setStatus('این گوشی به‌عنوان عضو عادی خانواده متصل شد؛ دسترسی تغییر رمز یا سیاست امنیتی به آن داده نشد.');}
    catch(error:any){setStatus(error?.message||'اتصال گوشی به خانواده ناموفق بود.');}
    finally{setBusy(false);}
  };
  const issuePairCode=async()=>{
    if(!token){setStatus('برای ساخت کد اتصال، ابتدا والد مجاز باید با ایمیل تأیید شود.');return;}
    setBusy(true);setStatus('');
    try{const result=await createFamilyPairCode(token);setIssuedPairCode(result.pairCode);setIssuedPairExpiry(result.expiresAt);setStatus('کد یک‌بارمصرف ساخته شد؛ روی گوشی خانواده واردش کن.');}
    catch(error:any){setStatus(error?.message||'ساخت کد اتصال انجام نشد.');}
    finally{setBusy(false);}
  };
  const refreshDeviceList=async()=>{if(!token)return;try{const result=await fetchFamilyDevices(token);setDeviceList(result.devices||[]);}catch(error:any){setStatus(error?.message||'فهرست گوشی‌ها دریافت نشد.');}};
  const revokeDevice=async(deviceId:string)=>{if(!token)return;setBusy(true);try{await revokeFamilyDevice(token,deviceId);await refreshDeviceList();setStatus('عضویت گوشی انتخاب‌شده لغو شد؛ توکن آن دیگر پذیرفته نمی‌شود.');}catch(error:any){setStatus(error?.message||'لغو عضویت گوشی انجام نشد.');}finally{setBusy(false);}};
  const refreshPolicyAfterConflict=async()=>{
    if(!token)return;
    try{const fresh=await refreshSnapshot(token);setStatus('سیاست تازهٔ خانواده دریافت شد؛ تغییر جدید را دوباره با نسخهٔ به‌روز انجام بده.');}
    catch{setStatus('همگام‌سازی وضعیت تازه انجام نشد.');}
  };
  useEffect(()=>{if(token)void refreshDeviceList();},[token]);
  const applyPolicy=async(nextOptions:Record<string,boolean>,nextMethod:FamilyAuthMethod=snapshot?.authMethod||'pin',nextBiometric=snapshot?.biometricAllowed||false)=>{
    if(!token||!snapshot)return false;
    try{
      const fresh=await saveFamilySecurityPolicy(token,{authMethod:nextMethod,biometricAllowed:nextBiometric,options:nextOptions,expectedPolicyVersion:snapshot.policyVersion});
      syncSnapshot(fresh);setStatus('سیاست امنیتی روی سرور خانواده ذخیره و تأیید شد.');return true;
    }catch(error:any){
      if(error?.code==='policy_conflict'||error?.status===409){await refreshPolicyAfterConflict();return false;}
      setStatus(error?.message||'ذخیرهٔ سیاست انجام نشد؛ انتخاب فعال محسوب نمی‌شود.');return false;
    }
  };
  const toggleTarget=async(key:string)=>{
    if(!snapshot?.hasCredential){setStatus('ابتدا از صفحهٔ مستقل «تنظیمات امنیت» رمز مشترک خانواده را ثبت کن.');return;}
    if(!token){setStatus('نشست مدیر امنیت تمام شده؛ دوباره با کد ایمیل وارد شو.');return;}
    const next={...options,[key]:!options[key]};
    setBusy(true);const saved=await applyPolicy(next);setBusy(false);
    if(!saved)return;
    if(key==='childLock'){
      const enable=next.childLock===true;
      let deviceState:boolean|undefined=undefined;const attempted=!!(s.wifiEsp32&&s.wifiBaseUrl);
      if(attempted){try{const sent=await WifiEsp32.command(String(s.wifiBaseUrl),'security.childLock',{enabled:enable});if(sent){const report:any=await WifiEsp32.readStatus(String(s.wifiBaseUrl));deviceState=reportedTelemetryBit(report?.raw,['childLock','child_lock','security.childLock','security.child_lock','touchLock','touch_lock']);}}catch{deviceState=undefined;}}
      setS({childLockDeviceConfirmed:deviceState===true?true:deviceState===false?false:null,childLockDeviceMayBeLocked:deviceState===true?true:deviceState===false?false:enable&&attempted});
      setStatus(enable?(deviceState===true?'قفل کودک خانوادگی فعال شد و دستگاه فیزیکی هم تأیید کرد.':deviceState===false?'قفل کودک برنامه برای خانواده فعال است؛ دستگاه فیزیکی آن را تأیید نکرد.':'قفل کودک خانوادگی در سیاست ثبت شد؛ وضعیت فیزیکی دستگاه نامعلوم است.'):(deviceState===false?'قفل کودک خانوادگی غیرفعال و بازشدن قفل فیزیکی تأیید شد.':deviceState===true?'سیاست خانوادگی غیرفعال شد، اما دستگاه هنوز قفل فیزیکی را گزارش می‌کند.':'سیاست خانوادگی غیرفعال شد؛ آزادشدن قفل فیزیکی تأیید نشده است.'));
    }
  };
  const saveCredential=async()=>{
    if(!token||!snapshot){setStatus('برای ثبت رمز، ابتدا والد تأییدشده را با ایمیل وارد کن.');return;}
    if(snapshot.hasCredential&&!/^\d{6,8}$/.test(currentPin)){setStatus('برای تغییر رمز، ابتدا PIN فعلی مشترک را وارد کن.');return;}
    if(!/^\d{6,8}$/.test(pin)){setStatus('رمز عددی پشتیبان باید ۶ تا ۸ رقم باشد.');return;}
    if(pin!==pinConfirm){setStatus('رمز و تکرار آن یکسان نیستند.');return;}
    if(method==='pattern'&&(!patternFirst||!patternConfirmed)){setStatus('الگو باید حداقل ۴ نقطه داشته باشد و دوبار یکسان رسم شود.');return;}
    setBusy(true);setStatus('');
    try{
      const result=await saveFamilyCredential(token,{method,pin,currentPin:snapshot.hasCredential?currentPin:undefined,expectedPolicyVersion:snapshot.policyVersion,pattern:method==='pattern'?patternFirst:undefined});
      setRecoveryCode(result.recoveryCode);setRecoveryVisible(true);setRecoveryAcknowledged(false);
      const fresh=await refreshSnapshot(token);
      if(method==='biometric'){
        if(bioAvailable&&bioEnrolled){
          const auth=await LocalAuthentication.authenticateAsync({promptMessage:'فعال‌سازی بیومتریک روی همین گوشی',fallbackLabel:'استفاده از رمز مشترک',cancelLabel:'انصراف'} as any);
          if(auth.success){await SecureStore.setItemAsync('korosh_nova_local_biometric_enabled_v1','true',{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});setLocalBioEnabled(true);syncSnapshot(fresh,true);}
          else{await SecureStore.deleteItemAsync('korosh_nova_local_biometric_enabled_v1').catch(()=>{});setLocalBioEnabled(false);syncSnapshot(fresh,false);}
        }else{
          await SecureStore.deleteItemAsync('korosh_nova_local_biometric_enabled_v1').catch(()=>{});setLocalBioEnabled(false);syncSnapshot(fresh,false);
          setStatus('رمز مشترک ثبت شد؛ این گوشی بیومتریک آماده ندارد، پس PIN پشتیبان باقی می‌ماند. روی گوشی پشتیبانی‌شده می‌توان بیومتریک را جداگانه فعال کرد.');
        }
      }else{
        await SecureStore.deleteItemAsync('korosh_nova_local_biometric_enabled_v1').catch(()=>{});setLocalBioEnabled(false);syncSnapshot(fresh,false);
      }
      setCurrentPin('');setPin('');setPinConfirm('');setPatternFirst('');setPatternConfirmed(false);
      if(!status)setStatus('رمز مشترک در سرویس مرکزی ذخیره شد؛ فقط هش رمز در سرور نگهداری می‌شود. کد بازیابی را امن یادداشت کن.');
    }catch(error:any){if(error?.code==='policy_conflict'||error?.status===409)await refreshPolicyAfterConflict();else setStatus(error?.message||'ذخیرهٔ مرکزی رمز انجام نشد؛ هیچ رمز تازه‌ای اعمال نشده است.');}
    finally{setBusy(false);}
  };
  const enableLocalBiometric=async()=>{
    if(!snapshot?.biometricAllowed){setStatus('ابتدا یک والد تأییدشده باید اجازهٔ بیومتریک را در سیاست مشترک فعال کند.');return;}
    try{
      const hardware=await LocalAuthentication.hasHardwareAsync();const enrolled=await LocalAuthentication.isEnrolledAsync();
      if(!hardware||!enrolled){setStatus('این گوشی حسگر/اطلاعات بیومتریک آماده ندارد؛ گزینه فعال نشد.');return;}
      const result=await LocalAuthentication.authenticateAsync({promptMessage:'تأیید برای فعال‌سازی بیومتریک روی این گوشی',fallbackLabel:'لغو',cancelLabel:'لغو'} as any);
      if(!result.success){setStatus('احراز هویت واقعی ناموفق بود؛ بیومتریک فعال نشد.');return;}
      await SecureStore.setItemAsync('korosh_nova_local_biometric_enabled_v1','true',{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});setLocalBioEnabled(true);syncSnapshot(snapshot,true);setStatus('بیومتریک فقط روی همین گوشی فعال شد؛ PIN/الگوی مشترک همچنان راه پشتیبان است.');
    }catch{setStatus('فعال‌سازی بیومتریک انجام نشد.');}
  };
  const disableLocalBiometric=async()=>{await SecureStore.deleteItemAsync('korosh_nova_local_biometric_enabled_v1').catch(()=>{});setLocalBioEnabled(false);if(snapshot)syncSnapshot(snapshot,false);setStatus('میان‌بُر بیومتریک همین گوشی خاموش شد؛ رمز مشترک خانواده تغییر نکرد.');};
  const signOut=()=>{setToken(null);setSnapshot(null);setCurrentPin('');setOtp('');setOtpRequested(false);setPin('');setPinConfirm('');setPatternFirst('');setPatternConfirmed(false);setRecoveryVisible(false);setRecoveryCode('');setStatus('از مدیریت امنیت خارج شدی؛ برای ورود دوباره تأیید ایمیل والد لازم است.');};
  const statusColor=serviceState==='available'?'#72ffc5':serviceState==='offline'?'#ffd166':'#8992a8';
  const statusLabel=serviceState==='available'?'سرویس مرکزی پاسخ‌گو':serviceState==='offline'?'اتصال مرکزی تأیید نشد':serviceState==='checking'?'در حال بررسی سرویس':'سرویس مرکزی پیکربندی نشده';

  if(settingsOpen){
    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.securityPanelRoot}>
      <View style={[styles.securityHeroCard,{borderColor:'#b28cff'}]}>
        <MagicPressable accessibilityRole="button" accessibilityLabel="بازگشت به حفاظت‌ها" onPress={()=>setSettingsOpen(false)} style={[styles.securitySettingsBack,{borderColor:'#b28cff',width:48,height:48,paddingHorizontal:0}]}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={{width:28,height:28}}/></MagicPressable>
        <Image source={CONTROL_ART.authFamily} resizeMode="contain" style={styles.securityHeroArt}/>
        <View style={{flex:1}}><Text style={styles.securityHeroTitle}>تنظیمات مستقل امنیت خانواده</Text><Text style={styles.securityHeroText}>هویت والدین، روش ورود، رمز مشترک و بیومتریک گوشی فقط در این صفحه تنظیم می‌شوند.</Text></View>
      </View>
      <View style={styles.securityNoteCard}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>وضعیت سرویس خانوادگی</Text><Text style={styles.securitySmallText}>{serviceMessage}</Text><Text style={[styles.securitySmallText,{color:statusColor,fontWeight:'900'}]}>{statusLabel}</Text></View><View style={[styles.deviceStatusLed,{backgroundColor:statusColor,shadowColor:statusColor}]}/></View>
      <View style={styles.securityNoteCard}><Image source={CONTROL_ART.ownerFather} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>حداکثر دو مدیر امنیتی</Text><Text style={styles.securitySmallText}>فقط ایمیل‌های پدر و مادر که از قبل روی سرور تعیین شده‌اند پذیرفته می‌شوند. نفر سوم، انتخاب سرپرست داخل گوشی و مالک‌شدن صرفاً به‌دلیل نصب اول وجود ندارد.</Text></View></View>
      {snapshot?.parentAdmins?.length? <View style={styles.securityTargetsList}>{snapshot.parentAdmins.slice(0,2).map((parent)=>{
        const active=parent.role===snapshot.currentRole;
        const image=parent.role==='father'?CONTROL_ART.ownerFather:CONTROL_ART.ownerMother;
        return <View key={parent.role} style={[styles.securityTargetCard,{borderColor:active?'#72ffc5':'rgba(99,232,255,.32)'}]}><Image source={image} resizeMode="contain" style={styles.securityTargetArt}/><View style={styles.securityTargetText}><Text style={styles.securityTargetTitle}>{parent.role==='father'?'پدر':'مادر'}{parent.isPrimary?' · مالک اصلی':''}{active?' · واردشده':''}</Text><Text style={styles.securityTargetDesc}>{parent.name} · {parent.emailMasked}</Text><Text style={styles.securityTargetDesc}>جایگاه از پیش ثبت‌شدهٔ سرور؛ قابل جعل از داخل اپ نیست</Text></View><View style={[styles.securityTickBox,active&&styles.securityTickBoxActive]}>{active&&<Ionicons name="checkmark" size={18} color="#06111a"/>}</View></View>;
      })}</View>:<Text style={styles.securitySmallText}>پس از ورود با ایمیل تأییدشده، جایگاه‌های ثبت‌شدهٔ پدر و مادر نمایش داده می‌شوند.</Text>}
      {!memberEnrolled&&<View style={styles.securitySettingsForm}>
        <Text style={styles.securitySectionTitle}>اتصال گوشی عضو خانواده</Text>
        <Text style={styles.securitySmallText}>والد با ورود تأییدشده کد ۸ رقمی یک‌بارمصرف می‌سازد. این کد فقط یک گوشی را برای عضویت عادی ثبت می‌کند و امکان تغییر رمز یا تنظیمات امنیتی نمی‌دهد.</Text>
        <Text style={styles.securityFieldLabel}>کد اتصال ۸ رقمی</Text><TextInput value={pairInput} onChangeText={v=>setPairInput(v.replace(/\D/g,'').slice(0,8))} keyboardType="number-pad" maxLength={8} placeholder="کد ساخته‌شده توسط والد" placeholderTextColor="rgba(255,255,255,.4)" style={styles.input}/>
        <MagicPressable disabled={busy||serviceState!=='available'} onPress={()=>void joinDevice()} style={[styles.securitySaveButton,(busy||serviceState!=='available')&&{opacity:.5}]}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال اتصال…':'اتصال امن این گوشی به خانواده'}</Text></MagicPressable>
      </View>}
      {!token? <View style={styles.securitySettingsForm}>
        <Text style={styles.securitySectionTitle}>ورود والد از پیش تعیین‌شده</Text>
        <Text style={styles.securitySmallText}>انتخاب «پدر/مادر» در گوشی، احراز هویت نیست. سرور فقط ایمیل‌های از پیش تعریف‌شده را می‌پذیرد و کد یک‌بارمصرف می‌فرستد.</Text>
        <Text style={styles.securityFieldLabel}>ایمیل تأییدشدهٔ پدر یا مادر</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="ایمیل ثبت‌شدهٔ والد" placeholderTextColor="rgba(255,255,255,.4)" style={styles.input}/>
        {!otpRequested?<MagicPressable disabled={busy||serviceState!=='available'} onPress={()=>void sendCode()} style={[styles.securitySaveButton,(busy||serviceState!=='available')&&{opacity:.5}]}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال ارسال…':'ارسال کد یک‌بارمصرف به ایمیل'}</Text></MagicPressable>:<><Text style={styles.securityFieldLabel}>کد شش‌رقمی ایمیل</Text><TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="کد ۶ رقمی" placeholderTextColor="rgba(255,255,255,.4)" style={styles.input}/><MagicPressable disabled={busy} onPress={()=>void verifyCode()} style={[styles.securitySaveButton,busy&&{opacity:.55}]}><Image source={CONTROL_ART.authPin} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال تأیید…':'تأیید ایمیل و ورود به مدیریت'}</Text></MagicPressable><MagicPressable accessibilityRole="button" accessibilityLabel="تغییر ایمیل یا ارسال دوباره" onPress={()=>{setOtpRequested(false);setOtp('')}} style={[styles.securitySettingsSecondary,{flexDirection:'row-reverse',gap:7}]}><Image source={CONTROL_ART.securityEmail} resizeMode="contain" style={{width:27,height:27}}/><Text style={styles.securitySettingsSecondaryText}>تغییر ایمیل / ارسال دوباره</Text></MagicPressable></>}
      </View>:<>
        <View style={styles.securityNoteCard}><Image source={CONTROL_ART.authRecovery} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>روش ورود مشترک</Text><Text style={styles.securitySmallText}>PIN و الگو روی تمام گوشی‌ها از سرور مشترک بررسی می‌شوند. بیومتریک قابلیت خود Android و مخصوص همین گوشی است؛ اثر انگشت از یک گوشی به گوشی دیگر کپی نمی‌شود.</Text></View></View>
        <Text style={styles.securitySectionTitle}>روش اصلی احراز هویت</Text>
        <View style={styles.securityMethodsGrid}>{SECURITY_METHODS.map(item=><SecurityMethodCard key={item.id} item={item} active={method===item.id} onPress={()=>{setMethod(item.id as FamilyAuthMethod);setPatternFirst('');setPatternConfirmed(false);setStatus('')}}/>)}</View>
        {snapshot.hasCredential&&<><Text style={styles.securityFieldLabel}>تأیید دوبارهٔ هویت · PIN فعلی مشترک</Text><TextInput value={currentPin} onChangeText={setCurrentPin} keyboardType="number-pad" maxLength={8} secureTextEntry placeholder="PIN فعلی برای اجازهٔ تغییر" placeholderTextColor="rgba(255,255,255,.42)" style={styles.input}/></>}
        <Text style={styles.securityFieldLabel}>رمز عددی پشتیبان خانواده (همیشه لازم است)</Text>
        <TextInput value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={8} secureTextEntry placeholder="رمز ۶ تا ۸ رقم" placeholderTextColor="rgba(255,255,255,.42)" style={styles.input}/>
        <TextInput value={pinConfirm} onChangeText={setPinConfirm} keyboardType="number-pad" maxLength={8} secureTextEntry placeholder="تکرار رمز عددی" placeholderTextColor="rgba(255,255,255,.42)" style={styles.input}/>
        {method==='pattern'&&<View style={styles.securityPatternSection}><Text style={styles.securityFieldLabel}>الگوی مشترک را دوبار یکسان رسم کن</Text><PatternPad label={patternFirst?'همان الگو را دوباره رسم کن':'الگوی مشترک جدید را رسم کن'} onComplete={v=>{if(!patternFirst){setPatternFirst(v);setPatternConfirmed(false);setStatus('حالا همان الگو را بار دوم رسم کن.');}else if(v===patternFirst){setPatternConfirmed(true);setStatus('الگو برای ذخیره آماده است.');}else{setPatternFirst('');setPatternConfirmed(false);setStatus('دو الگو یکسان نبودند؛ از نو شروع کن.');}}} onInvalid={()=>setStatus('الگو باید حداقل ۴ نقطهٔ متفاوت داشته باشد.')}/><View style={styles.securityPatternStatus}><View style={[styles.deviceStatusLed,{backgroundColor:patternConfirmed?'#72ffc5':'#8992a8'}]}/><Text style={styles.securitySmallText}>{patternConfirmed?'الگو تأیید شد':'الگو هنوز تأیید نشده'}</Text></View></View>}
        <MagicPressable disabled={busy} onPress={()=>void saveCredential()} style={[styles.securitySaveButton,busy&&{opacity:.55}]}><Image source={CONTROL_ART.authPin} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال ذخیرهٔ مرکزی…':snapshot.hasCredential?'تغییر رمز مشترک خانواده':'ثبت رمز مشترک خانواده'}</Text></MagicPressable>
        {snapshot.biometricAllowed&&<View style={styles.securityNoteCard}><Image source={CONTROL_ART.authBiometric} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>بیومتریک همین گوشی</Text><Text style={styles.securitySmallText}>{!bioAvailable||!bioEnrolled?'این گوشی حسگر یا اثر انگشت ثبت‌شدهٔ آماده ندارد.':localBioEnabled?'بیومتریک واقعی فقط روی همین گوشی فعال است.':'بیومتریک در سیاست خانواده مجاز است؛ برای فعال‌سازی محلی باید همین گوشی با احراز هویت Android تأیید شود.'}</Text></View>{bioAvailable&&bioEnrolled&&<MagicPressable accessibilityRole="button" accessibilityLabel={localBioEnabled?'خاموش کردن بیومتریک این گوشی':'فعال کردن بیومتریک این گوشی'} onPress={()=>void (localBioEnabled?disableLocalBiometric():enableLocalBiometric())} style={[styles.securityMiniAction,{borderColor:localBioEnabled?'#ff79c8':'#72ffc5',flexDirection:'row-reverse',gap:4}]}><Image source={CONTROL_ART.authBiometric} resizeMode="contain" style={{width:25,height:25}}/><Text style={[styles.securityMiniActionText,{color:localBioEnabled?'#ff79c8':'#72ffc5'}]}>{localBioEnabled?'خاموش‌کردن':'فعال‌سازی'}</Text></MagicPressable>}</View>}
        {recoveryVisible&&!!recoveryCode&&<View style={styles.recoveryReveal}><View style={styles.recoveryHeader}><Image source={CONTROL_ART.authRecovery} resizeMode="contain" style={styles.recoveryArt}/><View style={{flex:1}}><Text style={styles.recoveryTitle}>کد بازیابی مشترک تازه</Text><Text style={styles.securitySmallText}>این کد فقط همین بار از سرور دریافت شده؛ بیرون از گوشی نگهش دار. کد قبلی دیگر معتبر نیست.</Text></View></View><Text selectable style={styles.recoveryCode}>{recoveryCode}</Text><MagicPressable onPress={()=>{setRecoveryAcknowledged(true);setRecoveryVisible(false);setRecoveryCode('');setStatus('کد بازیابی پنهان شد؛ هر والد تأییدشده می‌تواند در صورت نیاز با ایمیل و کد بازیابی، رمز را بازنشانی کند.')}} style={styles.recoveryAckButton}><Image source={CONTROL_ART.authRecovery} resizeMode="contain" style={{width:29,height:29}}/><Text style={styles.securitySaveText}>کد را یادداشت کردم</Text></MagicPressable></View>}
        <View style={styles.securityManagerActions}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={{width:40,height:40}}/><View style={{flex:1}}><Text style={styles.securityTargetTitle}>مدیر واردشده: {snapshot.currentRole==='father'?'پدر':'مادر'}{snapshot.currentRole===snapshot.primaryOwnerRole?' · مالک اصلی':''}</Text><Text style={styles.securityTargetDesc}>نشست مدیریت فقط در حافظهٔ این صفحه است؛ خروج از صفحه یا بستن اپ آن را پایان می‌دهد.</Text></View><MagicPressable accessibilityRole="button" accessibilityLabel="خروج از مدیریت امنیت" onPress={signOut} style={[styles.securityMiniAction,{borderColor:'#ff79c8',flexDirection:'row-reverse',gap:4}]}><Image source={CONTROL_ART.securityExit} resizeMode="contain" style={{width:25,height:25}}/><Text style={[styles.securityMiniActionText,{color:'#ff79c8'}]}>خروج</Text></MagicPressable></View>
      </>}
      {token&&<View style={styles.securitySettingsForm}>
        <Text style={styles.securitySectionTitle}>افزودن گوشی‌های خانواده</Text><Text style={styles.securitySmallText}>فقط دو ایمیل والد می‌توانند مدیریت امنیت کنند. گوشی‌های دیگر با کد کوتاه‌عمر فقط عضو عادی می‌شوند؛ از این مسیر مدیر سوم ساخته نمی‌شود.</Text>
        <MagicPressable disabled={busy} onPress={()=>void issuePairCode()} style={[styles.securitySaveButton,busy&&{opacity:.55}]}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال ساخت کد…':'ساخت کد اتصال گوشی خانواده'}</Text></MagicPressable>
        {!!issuedPairCode&&<View style={styles.recoveryReveal}><Text style={styles.recoveryTitle}>کد اتصال یک‌بارمصرف · فقط ۱۰ دقیقه</Text><Text selectable style={styles.recoveryCode}>{issuedPairCode}</Text><Text style={styles.securitySmallText}>انقضا: {new Date(issuedPairExpiry).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})} · کد را فقط به گوشی موردنظر بده.</Text></View>}
        <View style={styles.securityManagerActions}><Text style={[styles.securitySectionTitle,{flex:1}]}>گوشی‌های ثبت‌شده</Text><MagicPressable accessibilityRole="button" accessibilityLabel="تازه‌سازی فهرست گوشی‌ها" onPress={()=>void refreshDeviceList()} style={[styles.securityMiniAction,{borderColor:'#63e8ff',flexDirection:'row-reverse',gap:4}]}><Image source={CONTROL_ART.securityRefresh} resizeMode="contain" style={{width:25,height:25}}/><Text style={[styles.securityMiniActionText,{color:'#63e8ff'}]}>تازه‌سازی</Text></MagicPressable></View>
        {deviceList.map(device=><View key={device.deviceId} style={styles.securityTargetCard}><Image source={device.role==='admin'?CONTROL_ART.authFamily:CONTROL_ART.ownerFather} resizeMode="contain" style={styles.securityTargetArt}/><View style={styles.securityTargetText}><Text style={styles.securityTargetTitle}>{device.deviceName}</Text><Text style={styles.securityTargetDesc}>{device.role==='admin'?'دستگاه ورود مدیر · مجوز مدیریت فقط با ایمیل والد':'عضو عادی خانواده'} · {device.lastSeenAt?new Date(device.lastSeenAt).toLocaleString('fa-IR'):'هنوز همگام نشده'}</Text></View><MagicPressable accessibilityRole="button" accessibilityLabel={`لغو عضویت ${device.deviceName}`} disabled={busy} onPress={()=>void revokeDevice(device.deviceId)} style={[styles.securityMiniAction,{borderColor:'#ff79c8',flexDirection:'row-reverse',gap:4}]}><Image source={CONTROL_ART.securityRevoke} resizeMode="contain" style={{width:25,height:25}}/><Text style={[styles.securityMiniActionText,{color:'#ff79c8'}]}>لغو</Text></MagicPressable></View>)}
      </View>}
      {!!status&&<Text style={styles.securityStatusText}>{status}</Text>}
      <Text style={styles.securityScopeNote}>این فهرست از سرور می‌آید: حداکثر پدر و مادر. اضافه‌کردن نفر سوم از رابط برنامه وجود ندارد. هویت والد با کد ایمیل تأیید می‌شود؛ PIN خام در پایگاه داده ذخیره نمی‌شود و سرور فقط هش رمز را نگه می‌دارد.</Text>
    </ScrollView>;
  }

  if(!token||!snapshot){
    return <View style={styles.securityPanelRoot}>
      <View style={styles.securityHeroCard}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={styles.securityHeroArt}/><View style={{flex:1}}><Text style={styles.securityHeroTitle}>رمز مشترک خانواده</Text><Text style={styles.securityHeroText}>فقط پدر و مادرِ ازپیش‌تأییدشده اجازهٔ ورود به مدیریت امنیت دارند؛ نصب زودتر برنامه هیچ امتیازی ایجاد نمی‌کند.</Text></View><MagicPressable onPress={()=>setSettingsOpen(true)} style={styles.securityGearButton}><Image source={UI_ICONS.settings} resizeMode="contain" style={styles.securityGearArt}/><Text style={styles.securityGearText}>تنظیمات</Text></MagicPressable></View>
      <View style={styles.securityNoteCard}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>اتصال مرکزی</Text><Text style={styles.securitySmallText}>{serviceMessage}</Text><Text style={[styles.securitySmallText,{color:statusColor,fontWeight:'900'}]}>{statusLabel}</Text></View><View style={[styles.deviceStatusLed,{backgroundColor:statusColor,shadowColor:statusColor}]}/></View>
      {memberEnrolled&&devicePolicy&&<View style={styles.securityNoteCard}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>این گوشی عضو خانواده است</Text><Text style={styles.securitySmallText}>نسخهٔ سیاست: {devicePolicy.policyVersion} · {s.familySecurityServiceConnected===true?'آخرین همگام‌سازی تأیید شده':'همگام‌سازی تازه تأیید نشده'}</Text><Text style={styles.securitySmallText}>عضو عادی می‌تواند از قابلیت‌های مجاز استفاده کند، اما حق تغییر رمز یا سیاست امنیتی ندارد.</Text></View><View style={[styles.deviceStatusLed,{backgroundColor:s.familySecurityServiceConnected===true?'#72ffc5':'#ffd166'}]}/></View>}
      {memberEnrolled&&devicePolicy&&<><Text style={styles.securitySectionTitle}>سیاست مشترک فعلی خانواده</Text><View style={styles.securityTargetsList}>{SECURITY_TARGETS.map(item=><SecurityTargetCard key={item.key} item={item} active={devicePolicy.options?.[item.key]===true} disabled onPress={()=>{}}/>)}</View></>}
      {serviceState==='unconfigured'||serviceState==='offline'?<><View style={styles.securityOwnerGateWrap}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={{width:82,height:82,alignSelf:'center'}}/><Text style={styles.securityGateTitle}>هنوز هیچ سرپرستی ثبت نمی‌شود</Text><Text style={styles.securityGateSubtitle}>برای جلوگیری از مالک‌شدن اولین نصب‌کننده، ابتدا API مرکزی و ایمیل‌های والدین باید روی سرور تعیین شوند. تا آن زمان انتخاب رمز یا تیک‌زدن قفل‌ها فعال نمی‌شود.</Text><Text style={styles.securityScopeNote}>وضعیت فعلی فقط نشان می‌دهد سرویس تنظیم نشده یا در دسترس نیست؛ این صفحه عمداً مالک محلی نمی‌سازد.</Text></View><MagicPressable onPress={()=>setSettingsOpen(true)} style={styles.securitySaveButton}><Image source={UI_ICONS.settings} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>تنظیمات مستقل امنیت خانواده</Text></MagicPressable></>:<View style={styles.securitySettingsForm}>
        <Text style={styles.securitySectionTitle}>ورود مدیر امنیتی تأییدشده</Text><Text style={styles.securitySmallText}>ایمیل از قبل در سرویس مرکزی تعریف می‌شود. اپ به کاربر اجازه نمی‌دهد خودش را پدر، مادر یا مالک معرفی کند.</Text>
        <Text style={styles.securityFieldLabel}>ایمیل پدر یا مادر</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="ایمیل از پیش ثبت‌شده" placeholderTextColor="rgba(255,255,255,.4)" style={styles.input}/>
        {!otpRequested?<MagicPressable disabled={busy} onPress={()=>void sendCode()} style={[styles.securitySaveButton,busy&&{opacity:.55}]}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال ارسال…':'ارسال کد تأیید ایمیل'}</Text></MagicPressable>:<><Text style={styles.securityFieldLabel}>کد شش‌رقمی</Text><TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="کد ایمیل" placeholderTextColor="rgba(255,255,255,.4)" style={styles.input}/><MagicPressable disabled={busy} onPress={()=>void verifyCode()} style={[styles.securitySaveButton,busy&&{opacity:.55}]}><Image source={CONTROL_ART.authPin} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال بررسی…':'تأیید والد و ورود'}</Text></MagicPressable></>}
      </View>}
      {!memberEnrolled&&serviceState==='available'&&<View style={styles.securitySettingsForm}><Text style={styles.securitySectionTitle}>اتصال گوشی عضو خانواده</Text><Text style={styles.securitySmallText}>از والد کد ۸ رقمی بگیر؛ این اتصال دسترسی مدیریت نمی‌دهد.</Text><TextInput value={pairInput} onChangeText={v=>setPairInput(v.replace(/\D/g,'').slice(0,8))} keyboardType="number-pad" maxLength={8} placeholder="کد اتصال ۸ رقمی" placeholderTextColor="rgba(255,255,255,.4)" style={styles.input}/><MagicPressable disabled={busy} onPress={()=>void joinDevice()} style={[styles.securitySaveButton,busy&&{opacity:.55}]}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={{width:34,height:34}}/><Text style={styles.securitySaveText}>{busy?'در حال اتصال…':'اتصال این گوشی به خانواده'}</Text></MagicPressable></View>}
      {!!status&&<Text style={styles.securityStatusText}>{status}</Text>}
    </View>;
  }

  return <View style={styles.securityPanelRoot}>
    <View style={styles.securityHeroCard}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={styles.securityHeroArt}/><View style={{flex:1}}><Text style={styles.securityHeroTitle}>حفاظت‌های اختیاری خانواده</Text><Text style={styles.securityHeroText}>سیاست نسخهٔ {snapshot.policyVersion} · مدیر: {snapshot.currentRole==='father'?'پدر':'مادر'} · تمام تیک‌ها پس از تأیید سرور روی سیاست مشترک ذخیره می‌شوند.</Text></View><MagicPressable onPress={()=>setSettingsOpen(true)} style={styles.securityGearButton}><Image source={UI_ICONS.settings} resizeMode="contain" style={styles.securityGearArt}/><Text style={styles.securityGearText}>تنظیمات</Text></MagicPressable></View>
    {!snapshot.hasCredential&&<View style={styles.securityNoteCard}><Image source={CONTROL_ART.authPin} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>ابتدا رمز مشترک را بساز</Text><Text style={styles.securitySmallText}>تا زمانی که رمز مشترک مرکزی ذخیره نشده، تیک‌های حفاظت قابل اعمال نیستند.</Text></View><MagicPressable accessibilityRole="button" accessibilityLabel="باز کردن تنظیمات رمز مشترک" onPress={()=>setSettingsOpen(true)} style={[styles.securityMiniAction,{borderColor:'#72ffc5',flexDirection:'row-reverse',gap:4}]}><Image source={CONTROL_ART.authPin} resizeMode="contain" style={{width:25,height:25}}/><Text style={[styles.securityMiniActionText,{color:'#72ffc5'}]}>تنظیم</Text></MagicPressable></View>}
    <View style={styles.securityNoteCard}><Image source={CONTROL_ART.authFamily} resizeMode="contain" style={styles.securityNoteArt}/><View style={{flex:1,gap:4}}><Text style={styles.securitySectionTitle}>مدیران امنیتی مجاز</Text><Text style={styles.securitySmallText}>{snapshot.parentAdmins.map(p=>`${p.role==='father'?'پدر':'مادر'}${p.isPrimary?' (مالک اصلی)':''}`).join(' · ')} · سقف ثابت: ۲ نفر</Text><Text style={styles.securitySmallText}>تغییر سیاست نیازمند اتصال به سرور است؛ اگر سرویس در دسترس نباشد، انتخاب جدید فعال اعلام نمی‌شود.</Text></View><View style={[styles.deviceStatusLed,{backgroundColor:'#72ffc5',shadowColor:'#72ffc5'}]}/></View>
    <Text style={styles.securitySectionTitle}>انتخاب بخش‌هایی که می‌خواهی قفل شوند</Text>
    <Text style={styles.securitySmallText}>همه به‌طور پیش‌فرض خاموش‌اند. با لمس، تیک نئونی ظاهر می‌شود فقط پس از ذخیرهٔ موفق در سرور. دوربین اضطراری و دوربین مجالسی در این نسخه قابلیت واقعی دارند و وضعیت آن‌ها فقط بر اساس مجوز و اتصال واقعی نمایش داده می‌شود.</Text>
    <View style={styles.securityTargetsList}>{SECURITY_TARGETS.map(item=><SecurityTargetCard key={item.key} item={item} active={!!options[item.key]} disabled={busy||!snapshot.hasCredential} onPress={()=>void toggleTarget(item.key)}/>)}</View>
    {!!options.childLock||!!s.childLockDeviceMayBeLocked?<View style={styles.childLockStatusCard}><Image source={CONTROL_ART.childLockSpeaker} resizeMode="contain" style={styles.childLockStatusArt}/><View style={{flex:1}}><Text style={styles.childLockStatusTitle}>{s.childLockDeviceConfirmed===true?'قفل فیزیکی دستگاه تأیید شده':s.childLockDeviceConfirmed===false?'قفل برنامه فعال است؛ قفل فیزیکی تأیید نشده':'وضعیت فیزیکی دستگاه نامعلوم است'}</Text><Text style={styles.securitySmallText}>{s.childLockDeviceConfirmed===true?'گزارش دستگاه، قفل فیزیکی را صریحاً تأیید کرد.':s.childLockDeviceConfirmed===false?'سیاست قفل کودک روی خانواده اعمال شده، اما دستگاه آن را تأیید نکرد.':'فرمان یا سیاست نرم‌افزاری به‌تنهایی اثبات قفل فیزیکی نیست.'}</Text></View><View style={[styles.deviceStatusLed,{backgroundColor:s.childLockDeviceConfirmed===true?'#72ffc5':s.childLockDeviceConfirmed===false?'#ffd166':'#8992a8'}]}/></View>:null}
    <View style={styles.securityManagerActions}><Image source={snapshot.currentRole==='mother'?CONTROL_ART.ownerMother:CONTROL_ART.ownerFather} resizeMode="contain" style={{width:40,height:40}}/><View style={{flex:1}}><Text style={styles.securityTargetTitle}>ورود تأییدشده: {snapshot.currentRole==='father'?'پدر':'مادر'}</Text><Text style={styles.securityTargetDesc}>مدیریت این صفحه فقط برای دو ایمیل از پیش ثبت‌شده مجاز است.</Text></View><MagicPressable accessibilityRole="button" accessibilityLabel="خروج از مدیریت امنیت" onPress={signOut} style={[styles.securityMiniAction,{borderColor:'#ff79c8',flexDirection:'row-reverse',gap:4}]}><Image source={CONTROL_ART.securityExit} resizeMode="contain" style={{width:25,height:25}}/><Text style={[styles.securityMiniActionText,{color:'#ff79c8'}]}>خروج</Text></MagicPressable></View>
    {!!status&&<Text style={styles.securityStatusText}>{status}</Text>}
    <Text style={styles.securityScopeNote}>PIN/الگو به‌صورت هش در سرور ذخیره می‌شوند. رمزگذاری امنیتی، قفل اپ، قفل اسپیکر و قفل کودک پیش‌فرض خاموش‌اند. بیومتریک فقط روی گوشی‌ای فعال می‌شود که واقعاً پشتیبانی کند و کاربر روی همان دستگاه احراز هویت شود.</Text>
  </View>;
}

function SecurityGate({method='pin',biometricEnabled=false,title='تأیید هویت',image=CONTROL_ART.lockApp,onUnlock,onCancel,onCredentialReset,onVerifyCredential,onVerifyBiometric,onRequestRecoveryCode,onRecoverCentral,cancelable=true}:{method?:string;biometricEnabled?:boolean;title?:string;image?:any;onUnlock:()=>void;onCancel:()=>void;onCredentialReset?:(result?:{policyVersion?:number})=>void;onVerifyCredential?:(kind:'pin'|'pattern',value:string)=>Promise<boolean>;onVerifyBiometric?:()=>Promise<boolean>;onRequestRecoveryCode?:(email:string)=>Promise<unknown>;onRecoverCentral?:(input:{email:string;otp:string;recoveryCode:string;newPin:string})=>Promise<{ok:boolean;recoveryCode:string;policyVersion:number}>;cancelable?:boolean}){
  const [pin,setPin]=useState('');const [message,setMessage]=useState('');const [usePinFallback,setUsePinFallback]=useState(method==='pin');const [recovering,setRecovering]=useState(false);const [recovery,setRecovery]=useState('');const [newPin,setNewPin]=useState('');const [newPinAgain,setNewPinAgain]=useState('');const [recoveryEmail,setRecoveryEmail]=useState('');const [recoveryOtp,setRecoveryOtp]=useState('');const [recoveryOtpSent,setRecoveryOtpSent]=useState(false);const [recoveryCompleteCode,setRecoveryCompleteCode]=useState('');const [busy,setBusy]=useState(false);const [failedAttempts,setFailedAttempts]=useState(0);const [retryBlocked,setRetryBlocked]=useState(false);const lockoutTimer=useRef<any>(null);
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(cancelable)onCancel();return true});return()=>sub.remove()},[cancelable,onCancel]);
  useEffect(()=>()=>{if(lockoutTimer.current)clearTimeout(lockoutTimer.current)},[]);
  const failedAttempt=(reason:string)=>{const next=failedAttempts+1;if(next>=5){setFailedAttempts(0);setRetryBlocked(true);setMessage('۵ تلاش ناموفق ثبت شد؛ ۳۰ ثانیه صبر کن.');if(lockoutTimer.current)clearTimeout(lockoutTimer.current);lockoutTimer.current=setTimeout(()=>{setRetryBlocked(false);setMessage('');},30000);}else{setFailedAttempts(next);setMessage(`${reason} · ${5-next} فرصت باقی مانده`);}};
  const verifyPin=async()=>{if(retryBlocked)return;try{if(onVerifyCredential){const ok=await onVerifyCredential('pin',pin);if(ok){setMessage('');setFailedAttempts(0);onUnlock();}else failedAttempt('رمز مشترک نادرست است.');return;}const saved=await getActiveSecuritySecret('pin');if(saved&&pin===saved){setMessage('');setFailedAttempts(0);onUnlock();}else failedAttempt('رمز پشتیبان نادرست است.');}catch(error:any){setMessage(onVerifyCredential?'سرویس تأیید رمز مشترک در دسترس نیست؛ اتصال امنیت خانواده را بررسی کن.':'بررسی رمز در فضای امن انجام نشد.');}};
  const verifyPattern=async(value:string)=>{if(retryBlocked)return;try{if(onVerifyCredential){const ok=await onVerifyCredential('pattern',value);if(ok){setMessage('');setFailedAttempts(0);onUnlock();}else failedAttempt('الگوی مشترک نادرست است.');return;}const saved=await getActiveSecuritySecret('pattern');if(saved&&value===saved){setMessage('');setFailedAttempts(0);onUnlock();}else failedAttempt('الگو نادرست است.');}catch{setMessage(onVerifyCredential?'سرویس تأیید الگوی مشترک در دسترس نیست؛ اتصال امنیت خانواده را بررسی کن.':'بررسی الگو انجام نشد.');}};
  const biometric=async()=>{try{const has=await LocalAuthentication.hasHardwareAsync();const enrolled=await LocalAuthentication.isEnrolledAsync();if(!has||!enrolled){setMessage('اثر انگشت/چهره آماده نیست؛ از رمز پشتیبان استفاده کن.');setUsePinFallback(true);return;}const result=await LocalAuthentication.authenticateAsync({promptMessage:title,fallbackLabel:'استفاده از رمز پشتیبان',cancelLabel:'انصراف'} as any);if(!result.success){setMessage('احراز هویت تأیید نشد.');return;}if(onVerifyBiometric){const allowed=await onVerifyBiometric();if(!allowed){setMessage('اجازهٔ بیومتریک از سیاست تازهٔ خانواده تأیید نشد؛ برای ادامه از PIN/الگوی مشترک استفاده کن.');setUsePinFallback(true);return;}}setMessage('');onUnlock();}catch(error:any){setMessage(onVerifyBiometric?(error?.message||'سرویس تأیید بیومتریک خانواده در دسترس نیست.'):'احراز هویت بیومتریک انجام نشد.');}};
  const sendRecoveryEmailCode=async()=>{if(!onRequestRecoveryCode){setMessage('روش بازیابی مرکزی در دسترس نیست.');return;}if(!/^\S+@\S+\.\S+$/.test(recoveryEmail.trim())){setMessage('ایمیل والد تأییدشده را وارد کن.');return;}setBusy(true);try{await onRequestRecoveryCode(recoveryEmail);setRecoveryOtpSent(true);setMessage('اگر ایمیل متعلق به یکی از دو والد ثبت‌شده باشد، کد بازیابی ایمیلی ارسال می‌شود.');}catch(error:any){setMessage(error?.message||'ارسال کد بازیابی انجام نشد.');}finally{setBusy(false);}};
  const resetFromRecovery=async()=>{
    if(!/^\d{6,8}$/.test(newPin)){setMessage('رمز تازه باید ۶ تا ۸ رقم باشد.');return;}if(newPin!==newPinAgain){setMessage('رمز تازه و تکرار آن یکسان نیستند.');return;}
    if(retryBlocked){setMessage('برای تلاش دوباره ۳۰ ثانیه صبر کن.');return;}
    setBusy(true);
    try{
      if(onRecoverCentral){
        if(!recoveryOtpSent||!/^\d{6}$/.test(recoveryOtp.trim())){setMessage('ابتدا کد ایمیل والد را دریافت و وارد کن.');return;}
        const result=await onRecoverCentral({email:recoveryEmail,otp:recoveryOtp,recoveryCode:recovery,newPin});
        if(!result?.ok||!result.recoveryCode){setMessage('بازیابی مرکزی تأیید نشد.');return;}
        setRecoveryCompleteCode(result.recoveryCode);setMessage('رمز مشترک بازنشانی شد. کد بازیابی تازه را یادداشت کن، سپس ادامه بده.');setPin('');setRecovery('');setNewPin('');setNewPinAgain('');setRecoveryOtp('');setRecoveryOtpSent(false);onCredentialReset?.({policyVersion:result.policyVersion});return;
      }
      if(!/^\d{6,8}$/.test(newPin)){setMessage('رمز تازه باید ۶ تا ۸ رقم باشد.');return;}const activeId=await getActiveSecurityRecordId();const expected=await getActiveSecuritySecret('recovery');if(!activeId||!expected||normalizeRecoveryCode(recovery)!==normalizeRecoveryCode(expected)){failedAttempt('کد بازیابی معتبر نیست.');return;}await SecureStore.setItemAsync(secureRecordKey('pin',activeId),newPin);await SecureStore.deleteItemAsync(secureRecordKey('pattern',activeId)).catch(()=>{});onCredentialReset?.();setRecovering(false);setMessage('رمز با کد بازیابی بازنشانی شد.');setPin('');onUnlock();
    }catch(error:any){setMessage(error?.message|| (onRecoverCentral?'بازیابی مرکزی انجام نشد.':'بازیابی امن انجام نشد.'));}finally{setBusy(false);}
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.securityGate}>
    <View style={styles.securityGateHero}><Image source={image} resizeMode="contain" style={styles.securityGateArt}/></View>
    <Text style={styles.securityGateTitle}>{recovering?'بازیابی دسترسی':title}</Text>
    <Text style={styles.securityGateSubtitle}>{recovering?'کد بازیابی را وارد کن و یک رمز عددی تازه بساز.':method==='pattern'?'برای ادامه، الگوی ثبت‌شده را رسم کن.':method==='biometric'?'با اثر انگشت یا چهره تأیید شو؛ رمز پشتیبان هم در دسترس است.':'برای ادامه، رمز عددی را وارد کن.'}</Text>
    {!recovering? <>
      {biometricEnabled&&method!=='biometric'&&<MagicPressable onPress={()=>void biometric()} style={styles.securityGateBiometric}><Image source={CONTROL_ART.authBiometric} resizeMode="contain" style={styles.securityGateBioArt}/><Text style={styles.securityGateBiometricText}>تأیید با اثر انگشت / چهره</Text></MagicPressable>}
      {method==='pattern'&&!usePinFallback?<PatternPad label="الگوی ثبت‌شده را رسم کن" onComplete={v=>void verifyPattern(v)} onInvalid={()=>setMessage('الگو باید حداقل ۴ نقطه داشته باشد.')}/>:method==='biometric'&&!usePinFallback?<MagicPressable onPress={()=>void biometric()} style={styles.securityGateBiometric}><Image source={CONTROL_ART.authBiometric} resizeMode="contain" style={styles.securityGateBioArt}/><Text style={styles.securityGateBiometricText}>بازکردن با بیومتریک</Text></MagicPressable>:<><TextInput value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={8} secureTextEntry placeholder={method!=='pin'?'رمز پشتیبان ۶ تا ۸ رقم':'رمز عددی'} placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/><MagicPressable disabled={retryBlocked} onPress={()=>void verifyPin()} style={[styles.securityGatePrimaryButton,retryBlocked&&{opacity:.48}]}><Image source={CONTROL_ART.authPin} resizeMode="contain" style={styles.securityGateSmallArt}/><Text style={styles.securityGatePrimaryText}>تأیید و ادامه</Text></MagicPressable></>}
      {method!=='pin'&&!usePinFallback&&<MagicPressable onPress={()=>{setUsePinFallback(true);setMessage('')}} style={styles.securityGateSecondary}><Image source={CONTROL_ART.authPin} resizeMode="contain" style={styles.securityGateSmallArt}/><Text style={styles.securityGateSecondaryText}>ورود با رمز پشتیبان</Text></MagicPressable>}
      {method==='pin'&&biometricEnabled&&<MagicPressable onPress={()=>{setUsePinFallback(false);void biometric()}} style={styles.securityGateSecondary}><Text style={styles.securityGateSecondaryText}>استفاده از اثر انگشت/چهره</Text></MagicPressable>}
      <MagicPressable onPress={()=>{setRecovering(true);setMessage('');setPin('')}} style={styles.securityGateRecovery}><Image source={CONTROL_ART.authRecovery} resizeMode="contain" style={styles.securityGateSmallArt}/><Text style={styles.securityGateSecondaryText}>رمز را فراموش کرده‌ام · بازیابی امن</Text></MagicPressable>
    </>:<>
      {onRecoverCentral&&<><TextInput value={recoveryEmail} onChangeText={setRecoveryEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="ایمیل ثبت‌شدهٔ پدر یا مادر" placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/><MagicPressable disabled={busy} onPress={()=>void sendRecoveryEmailCode()} style={[styles.securityGateSecondary,busy&&{opacity:.5}]}><Text style={styles.securityGateSecondaryText}>{recoveryOtpSent?'ارسال دوبارهٔ کد ایمیل':'ارسال کد تأیید ایمیل والد'}</Text></MagicPressable>{recoveryOtpSent&&<TextInput value={recoveryOtp} onChangeText={setRecoveryOtp} keyboardType="number-pad" maxLength={6} placeholder="کد شش‌رقمی ایمیل" placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/>}</>}
      {!recoveryCompleteCode?<><TextInput value={recovery} onChangeText={setRecovery} autoCapitalize="characters" autoCorrect={false} placeholder="کد بازیابی ۲۰ رقمی" placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/><TextInput value={newPin} onChangeText={setNewPin} keyboardType="number-pad" maxLength={8} secureTextEntry placeholder="رمز عددی تازه" placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/><TextInput value={newPinAgain} onChangeText={setNewPinAgain} keyboardType="number-pad" maxLength={8} secureTextEntry placeholder="تکرار رمز تازه" placeholderTextColor="rgba(255,255,255,.45)" style={styles.input}/><MagicPressable disabled={busy||retryBlocked} onPress={()=>void resetFromRecovery()} style={[styles.securityGatePrimaryButton,(busy||retryBlocked)&&{opacity:.48}]}><Image source={CONTROL_ART.authRecovery} resizeMode="contain" style={styles.securityGateSmallArt}/><Text style={styles.securityGatePrimaryText}>{busy?'در حال بررسی…':'بازیابی و تغییر رمز'}</Text></MagicPressable></>:<View style={styles.recoveryReveal}><Text style={styles.recoveryTitle}>کد بازیابی تازه</Text><Text selectable style={styles.recoveryCode}>{recoveryCompleteCode}</Text><MagicPressable onPress={()=>{setRecoveryCompleteCode('');setRecovering(false);setMessage('ورود با رمز تازه ادامه پیدا می‌کند.');onUnlock();}} style={styles.recoveryAckButton}><Text style={styles.securitySaveText}>کد را یادداشت کردم و ادامه</Text></MagicPressable></View>}
      <MagicPressable onPress={()=>{setRecovering(false);setRecoveryCompleteCode('');setMessage('')}} style={styles.securityGateSecondary}><Text style={styles.securityGateSecondaryText}>بازگشت به ورود</Text></MagicPressable>
    </>}
    {!!message&&<Text style={styles.securityGateMessage}>{message}</Text>}
    {cancelable&&<MagicPressable onPress={onCancel} style={styles.securityGateCancel}><Image source={CONTROL_ART.lockApp} resizeMode="contain" style={styles.securityGateSmallArt}/><Text style={styles.securityGateCancelText}>انصراف و بازگشت</Text></MagicPressable>}
  </ScrollView>;
}

function SecretBackButton({label='بازگشت',onPress,color='#63e8ff',small=false}:{label?:string;onPress:()=>void;color?:string;small?:boolean}){
  return <MagicPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} magicColor={color} style={[styles.secretBackButton,small&&styles.secretBackSmall,{borderColor:color,shadowColor:color}]}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={{width:small?24:28,height:small?24:28}}/></MagicPressable>;
}
function SecretTabButton({label,icon,active,onPress,color}:{label:string;icon:string;active:boolean;onPress:()=>void;color:string}){
 return <MagicPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} magicColor={color} style={[styles.secretTabButton,active&&styles.secretTabButtonActive,{borderColor:active?'#fff':color,shadowColor:color}]}><Ionicons name={icon as any} size={21} color={active?'#071326':color}/><Text style={[styles.secretTabText,active&&styles.secretTabTextActive]}>{label}</Text>{active&&<View style={styles.secretTabTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>;
}
function Secret({s,setS,onSettings,onBackMusic,section,setSection}:{s:any;setS:(p:any)=>void;onSettings:()=>void;onBackMusic:()=>void;section:SecretSection;setSection:(p:SecretSection)=>void}){
 const {width,height}=useWindowDimensions();
 const frameLandscape=width>height;
 const [opening,setOpening]=useState(false);const [congrats,setCongrats]=useState(false);const frameReveal=useRef(new Animated.Value(0)).current;
 const [openChest,setOpenChest]=useState<number|null>(null);const [openAlbum,setOpenAlbum]=useState<number|null>(null);const [openingChestIndex,setOpeningChestIndex]=useState<number|null>(null);
 const doorL=useRef(new Animated.Value(0)).current;const doorR=useRef(new Animated.Value(0)).current;const doorTilt=useRef(new Animated.Value(0)).current;const doorScale=useRef(new Animated.Value(0)).current;const lockScale=useRef(new Animated.Value(1)).current;const lockGlow=useRef(new Animated.Value(0)).current;
 const photoPop=useRef(new Animated.Value(0)).current;const chestGlow=useRef(new Animated.Value(.25)).current;const albumReveal=useRef(new Animated.Value(0)).current;
 const doorAnimationRef=useRef<Animated.CompositeAnimation|null>(null);const chestOpeningRef=useRef<Animated.CompositeAnimation|null>(null);const albumOpeningRef=useRef<Animated.CompositeAnimation|null>(null);
 const chestEntry=useRef(new Animated.Value(0)).current;const albumEntry=useRef(new Animated.Value(0)).current;
 const accent=String(s.secretColor||'#63e8ff');
 useEffect(()=>{
   const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
     if(section==='frame'){setOpenAlbum(null);setSection('albums');return true;}
     if(openChest!==null){setOpenChest(null);return true;}
     if(openAlbum!==null){setOpenAlbum(null);return true;}
     if(section==='albums'){setSection('chests');return true;}
     onBackMusic();return true;
   });
   return()=>sub.remove();
 },[section,openChest,openAlbum,onBackMusic,setSection]);
 useEffect(()=>{
   doorAnimationRef.current?.stop();doorAnimationRef.current=null;chestOpeningRef.current?.stop();chestOpeningRef.current=null;albumOpeningRef.current?.stop();albumOpeningRef.current=null;
   if(section==='door'){doorL.setValue(0);doorR.setValue(0);doorTilt.setValue(0);doorScale.setValue(0);lockScale.setValue(1);lockGlow.setValue(0);setOpening(false);setCongrats(false);setOpenChest(null);setOpenAlbum(null);}
   if(section!=='frame'){chestEntry.setValue(0);albumEntry.setValue(0);}
   return()=>{doorAnimationRef.current?.stop();chestOpeningRef.current?.stop();albumOpeningRef.current?.stop();setOpeningChestIndex(null);};
 },[section,doorL,doorR,doorTilt,doorScale,lockScale,lockGlow,chestEntry,albumEntry]);
 useEffect(()=>{if(openChest===null)return;photoPop.setValue(0);chestGlow.setValue(.18);const fx=Math.max(0,Math.min(4,Number(s.secretChestEffect)||0));const glowDurations=[420,650,920,540,1150];const loop=Animated.loop(Animated.sequence([Animated.timing(chestGlow,{toValue:1,duration:glowDurations[fx],useNativeDriver:true}),Animated.timing(chestGlow,{toValue:fx===2?.12:.35,duration:glowDurations[fx]+110,useNativeDriver:true})]));loop.start();const entry=Animated.sequence([Animated.timing(chestEntry,{toValue:.82,duration:170,useNativeDriver:true}),Animated.spring(chestEntry,{toValue:1,useNativeDriver:true,speed:[14,9,8,12,6][fx],bounciness:[4,10,14,5,16][fx]})]);entry.start();return()=>{loop.stop();entry.stop();};},[openChest,photoPop,chestGlow,chestEntry,s.secretChestEffect]);
 useEffect(()=>{if(openAlbum===null)return;albumReveal.setValue(0);albumEntry.setValue(0);const fx=Math.max(0,Math.min(4,Number(s.secretAlbumEffect)||0));const entry=Animated.parallel([Animated.spring(albumReveal,{toValue:1,useNativeDriver:true,speed:[10,6,12,8,5][fx],bounciness:[8,16,7,4,18][fx]}),Animated.timing(albumEntry,{toValue:1,duration:520,easing:Easing.out(Easing.cubic),useNativeDriver:true})]);entry.start();albumOpeningRef.current=entry;return()=>entry.stop();},[openAlbum,albumReveal,albumEntry,s.secretAlbumEffect]);
 const openGate=()=>{
   if(opening||doorAnimationRef.current)return;
   setOpening(true);setCongrats(true);
   const doorFx=Math.max(0,Math.min(4,Number(s.secretDoorEffect)||0));
   const duration=[1150,1500,1750,1320,1950][doorFx];
   doorL.setValue(0);doorR.setValue(0);doorTilt.setValue(0);doorScale.setValue(0);lockScale.setValue(1);lockGlow.setValue(0);
   const sequence=Animated.sequence([
     Animated.parallel([
       Animated.timing(lockScale,{toValue:1.18,duration:180,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
       Animated.timing(lockGlow,{toValue:1,duration:240,easing:Easing.out(Easing.cubic),useNativeDriver:true})
     ]),
     Animated.timing(lockScale,{toValue:1.88,duration:260,easing:Easing.out(Easing.back(1.7)),useNativeDriver:true}),
     Animated.delay(doorFx===4?780:420),
     Animated.parallel([
       Animated.timing(doorL,{toValue:1,duration,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
       Animated.timing(doorR,{toValue:1,duration,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
       Animated.timing(doorTilt,{toValue:1,duration,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
       Animated.timing(doorScale,{toValue:1,duration,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
       Animated.timing(lockGlow,{toValue:0,duration:Math.max(650,duration*.62),easing:Easing.out(Easing.quad),useNativeDriver:true})
     ]),
     Animated.delay(140)
   ]);
   doorAnimationRef.current=sequence;
   sequence.start(({finished})=>{
     doorAnimationRef.current=null;
     if(finished){setOpening(false);setCongrats(false);setSection('chests');}
     else{setOpening(false);setCongrats(false);}
   });
 };
 const halfWidth=Math.max(1,width/2);
 const leftMove=doorL.interpolate({inputRange:[0,1],outputRange:[0,-Math.max(width*.58,halfWidth+24)]});
 const rightMove=doorR.interpolate({inputRange:[0,1],outputRange:[0,Math.max(width*.58,halfWidth+24)]});
 const backgroundKey=section==='door'?'door':section==='albums'?'albums':'chests';
 const pageBackground=(s.secretPageBackgrounds&&s.secretPageBackgrounds[backgroundKey])||DEFAULTS.secretPageBackgrounds[backgroundKey];
 const bgUri=pageBackground?.kind==='image'||pageBackground?.kind==='gif'?pageBackground.uri:null;
 const preset=SECRET_BG_PRESETS[Math.max(0,Math.min(SECRET_BG_PRESETS.length-1,Number(pageBackground?.preset)||0))];
 const bgIsGif=pageBackground?.kind==='gif'||pageBackground?.kind==='presetGif';
 const bgSource=bgUri?{uri:bgUri,isAnimated:bgIsGif}:bgIsGif?preset.gif:preset.image;
 const doorFxColor=['#ffd166','#63e8ff','#b28cff','#ff79c8','#72ffc5'][Math.max(0,Math.min(4,Number(s.secretDoorEffect)||0))];
 const doorRotateLeft=doorTilt.interpolate({inputRange:[0,1],outputRange:['0deg','-24deg']});const doorRotateRight=doorTilt.interpolate({inputRange:[0,1],outputRange:['0deg','24deg']});const doorScaleX=doorScale.interpolate({inputRange:[0,1],outputRange:[1,1.08]});
 const chestNames=Array.isArray(s.secretChestNames)?s.secretChestNames:SECRET_DEFAULT_CHEST_NAMES;
 const chestStyles=Array.isArray(s.secretChestStyle)?s.secretChestStyle:[0,1,2,3,4];
 const chestArtUris=Array.isArray(s.secretChestArtUris)?s.secretChestArtUris:[null,null,null,null,null];
 const albumNames=Array.isArray(s.secretAlbumNames)?s.secretAlbumNames:SECRET_DEFAULT_ALBUM_NAMES;
 const chestMessage=Array.isArray(s.secretChestMessages)?s.secretChestMessages:SECRET_DEFAULT_CHEST_MESSAGES;
 const albumMessage=Array.isArray(s.secretAlbumMessages)?s.secretAlbumMessages:SECRET_DEFAULT_ALBUM_MESSAGES;
 const savedChestCover=(i:number)=>s.secretChestCoverUris?.[i]||null;
 const albumPhotos=(i:number)=>Array.isArray(s.secretAlbumPhotos?.[i])&&s.secretAlbumPhotos[i].length?s.secretAlbumPhotos[i]:[0,1,2].map(j=>({fallback:secretAlbumFallbackPhoto(i,j)}));
 const photoSource=(entry:any)=>{const uri=typeof entry==='string'?entry:entry?.uri;if(uri)return {uri,isAnimated:false};return entry?.fallback||SECRET_ROOM_ASSETS.familyAlbumDefault;};
 const coverUri=(i:number)=>s.secretAlbumCoverUris?.[i]||null;
 const framePreset=Math.max(0,Math.min(2,Number(s.secretFramePreset)||0));
 useEffect(()=>{if(section!=='frame')return;frameReveal.setValue(0);const a=Animated.timing(frameReveal,{toValue:1,duration:650,easing:Easing.out(Easing.cubic),useNativeDriver:true});a.start();return()=>a.stop();},[section,framePreset,frameReveal,s.secretFramePhotoUri]);
 if(section==='frame'){
   const picture=s.secretFramePhotoUri?{uri:s.secretFramePhotoUri}:SECRET_ROOM_ASSETS.familyDefault;
   if(!frameLandscape)return <View style={styles.secretRoot}><View style={styles.secretFrameWaiting}><MagicPressable accessibilityRole="button" accessibilityLabel="بازگشت به آلبوم‌ها" onPress={()=>{setOpenAlbum(null);setSection('albums')}} magicColor={accent} style={[styles.secretFrameBack,{borderColor:accent,shadowColor:accent}]}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={{width:28,height:28}}/></MagicPressable><Animated.View style={[styles.secretFrameWaitingHalo,{opacity:frameReveal.interpolate({inputRange:[0,1],outputRange:[.35,1]}),transform:[{scale:frameReveal.interpolate({inputRange:[0,1],outputRange:[.92,1.08]})}]}]}/><Image source={SECRET_ROOM_ASSETS.frames[framePreset]} resizeMode="contain" style={styles.secretFrameWaitingImage}/><Text style={styles.secretFrameWaitingText}>قاب خانوادگی در حال افقی شدن است…</Text></View></View>;
   return <View style={styles.secretRoot}>
    <Animated.Image source={picture} resizeMode="cover" style={[StyleSheet.absoluteFillObject,{opacity:frameReveal.interpolate({inputRange:[0,1],outputRange:[.2,1]}),transform:[{scale:frameReveal.interpolate({inputRange:[0,1],outputRange:[1.035,1]})}]}]}/>
    <View style={styles.secretFrameDim}/>
    <Animated.Image source={SECRET_ROOM_ASSETS.frames[framePreset]} resizeMode="stretch" style={[styles.secretFrameOverlay,{opacity:frameReveal}]}/>
    <MagicPressable accessibilityRole="button" accessibilityLabel="بازگشت به آلبوم‌ها" onPress={()=>{setOpenAlbum(null);setSection('albums')}} magicColor={accent} style={[styles.secretFrameBack,{borderColor:accent,shadowColor:accent}]}><Image source={CONTROL_ART.backArrow} resizeMode="contain" style={{width:28,height:28}}/></MagicPressable>
   </View>;
 }
 return <View style={styles.secretRoot}>
  <ExpoImage source={bgSource as any} contentFit="cover" autoplay={bgIsGif} style={StyleSheet.absoluteFillObject}/>
  <View style={styles.secretInsideShade}/>
  {section==='door'?<>
    <View style={styles.secretDoorGardenShade}/>
    <Animated.Image source={SECRET_ROOM_ASSETS.doorLeft} resizeMode="stretch" style={[styles.secretDoorLeaf,{width:halfWidth,height,left:0,transform:[{perspective:900},{translateX:halfWidth},{rotateY:doorRotateLeft},{translateX:-halfWidth},{scaleX:doorScaleX},{translateX:leftMove}]}]}/>
    <Animated.Image source={SECRET_ROOM_ASSETS.doorRight} resizeMode="stretch" style={[styles.secretDoorLeaf,{width:halfWidth,height,right:0,transform:[{perspective:900},{translateX:-halfWidth},{rotateY:doorRotateRight},{translateX:halfWidth},{scaleX:doorScaleX},{translateX:rightMove}]}]}/>
    {!opening&&<SecretBackButton small label="بازگشت به آوای نوا" onPress={onBackMusic} color="#63e8ff"/>}
    <View pointerEvents="none" style={styles.secretDoorTitleBlock}><Text style={styles.secretDoorKicker}>KOROSH NOVA · FAMILY MEMORIES</Text><Text style={styles.secretDoorTitle}>دروازه‌ی خاطرات نوا</Text><Text style={styles.secretDoorSubtitle}>برای ورود، قفل نورانی را لمس کن</Text></View>
    <View pointerEvents="none" style={[styles.secretDoorBeam,{backgroundColor:doorFxColor,opacity:lockGlow,shadowColor:doorFxColor,transform:[{scaleY:lockGlow.interpolate({inputRange:[0,1],outputRange:[.05,1.2]})}]}]}/>
    <Animated.View pointerEvents="none" style={[styles.secretDoorSeam,{opacity:lockGlow.interpolate({inputRange:[0,.35,1],outputRange:[0,.95,0]}),backgroundColor:doorFxColor,shadowColor:doorFxColor,transform:[{scaleY:lockGlow.interpolate({inputRange:[0,1],outputRange:[.05,1.5]})}]}]}/>
    {congrats&&<Animated.View pointerEvents="none" style={[styles.secretCongrats,{opacity:lockGlow.interpolate({inputRange:[0,1],outputRange:[.35,1]}),borderColor:doorFxColor,shadowColor:doorFxColor}]}><Ionicons name="sparkles" size={23} color="#ffd166"/><Text style={styles.secretCongratsTitle}>تبریک می‌گوییم!</Text><Text style={styles.secretCongratsText}>درِ اتاق خاطرات خانواده‌ی کوروش نوا به روی شما باز می‌شود.</Text></Animated.View>}
    {!opening&&<MagicPressable accessibilityRole="button" accessibilityLabel="بازکردن قفل دروازه‌ی خاطرات" onPress={openGate} magicColor={accent} style={[styles.secretDoorLockButton,{borderColor:doorFxColor,shadowColor:doorFxColor,transform:[{scale:lockScale}]}]}><View style={[styles.secretDoorLockGem,{borderColor:accent,shadowColor:accent}]}><Ionicons name="lock-closed" size={49} color="#ffd166"/></View><Text style={styles.secretDoorLockLabel}>بازکردن درِ خاطرات</Text></MagicPressable>}
    {opening&&<Animated.View pointerEvents="none" style={[styles.secretDoorFlash,{opacity:lockGlow}]}/>}
  </>:<>
    <View style={[styles.secretInteriorHeader,{borderBottomColor:`${accent}77`}]}> 
      <View style={styles.secretInteriorTopline}>
        <SecretBackButton label="بازگشت به آوای نوا" onPress={onBackMusic} color={accent} small/>
        <View style={styles.secretPlaque}><Text style={styles.secretPlaqueEyebrow}>KOROSH NOVA</Text><Text style={styles.secretPlaqueTitle}>اتاق خاطرات خانواده</Text></View>
        <View style={{width:47}}/>
      </View>
      <View style={styles.secretTabRail}>
        <SecretTabButton label="صندوقچه‌ها" icon="gift-outline" active={section==='chests'} onPress={()=>{setOpenChest(null);setOpenAlbum(null);setSection('chests')}} color="#63e8ff"/>
        <SecretTabButton label="آلبوم‌ها" icon="images-outline" active={section==='albums'} onPress={()=>{setOpenChest(null);setOpenAlbum(null);setSection('albums')}} color="#ff79c8"/>
        <SecretTabButton label="قاب خانوادگی" icon="image-outline" active={false} onPress={()=>{setOpenChest(null);setOpenAlbum(null);setSection('frame')}} color="#ffd166"/>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.secretScrollContent} showsVerticalScrollIndicator={false}>
      {section==='chests'&&openChest===null&&<>
        <View style={styles.secretSectionIntro}><Text style={styles.secretSectionTitle}>گنج‌های به‌یادماندنی</Text><Text style={styles.secretSectionSub}>هر صندوقچه قصه‌ای جداگانه برای نگه‌داشتن خاطره‌ها دارد.</Text></View>
        <View style={styles.secretChestGrid}>{SECRET_ROOM_ASSETS.chests.map((asset:any,i:number)=>{const styleIndex=Math.max(0,Math.min(4,Number(chestStyles[i])||0));const imageUri=savedChestCover(i);return <MagicPressable key={`chest${i}`} accessibilityLabel={`بازکردن ${chestNames[i]??SECRET_DEFAULT_CHEST_NAMES[i]}`} onPress={()=>{if(openingChestIndex!==null)return;setOpeningChestIndex(i);chestEntry.setValue(0);const fx=Number(s.secretChestEffect)||0;const anim=Animated.sequence([Animated.timing(chestEntry,{toValue:1,duration:180,easing:Easing.out(Easing.cubic),useNativeDriver:true}),Animated.delay(150),Animated.timing(chestEntry,{toValue:0,duration:170,easing:Easing.in(Easing.cubic),useNativeDriver:true})]);chestOpeningRef.current=anim;anim.start(({finished})=>{chestOpeningRef.current=null;if(finished){setOpenChest(i);setOpeningChestIndex(null);}})}} magicColor={accent} style={[styles.secretChestCard,{borderColor:`${accent}aa`,shadowColor:accent,transform:[{scale:openingChestIndex===i?chestEntry.interpolate({inputRange:[0,1],outputRange:[1,1.045]}):1}],opacity:openingChestIndex===i?chestEntry.interpolate({inputRange:[0,.55,1],outputRange:[1,1,.78]}):1}]}><View style={styles.secretChestImageStage}><ExpoImage source={chestArtUris[i]?{uri:chestArtUris[i],isAnimated:String(chestArtUris[i]).toLowerCase().split('?')[0].endsWith('.gif')}:SECRET_ROOM_ASSETS.chests[styleIndex]} contentFit="contain" autoplay={!!chestArtUris[i]&&String(chestArtUris[i]).toLowerCase().split('?')[0].endsWith('.gif')} style={styles.secretChestImage}/>{imageUri&&<View style={styles.secretChestPhotoBadge}><ExpoImage source={{uri:imageUri,isAnimated:String(imageUri).toLowerCase().split('?')[0].endsWith('.gif')}} contentFit="cover" autoplay={String(imageUri).toLowerCase().split('?')[0].endsWith('.gif')} style={styles.secretChestPhotoThumb}/></View>}</View><View style={[styles.secretNamePlaque,{borderColor:accent}]}><Text numberOfLines={2} style={styles.secretChestName}>{chestNames[i]??SECRET_DEFAULT_CHEST_NAMES[i]}</Text></View><View style={styles.secretChestOpenLine}><Ionicons name="lock-open-outline" size={14} color={accent}/><Text style={[styles.secretChestOpenText,{color:accent}]}>گشودن خاطره</Text></View></MagicPressable>})}</View>
        <MagicPressable accessibilityRole="button" accessibilityLabel="گشودن صندوقچه‌ی تنظیمات" onPress={onSettings} magicColor="#ffd166" style={[styles.secretChestCard,styles.secretSettingsChestCard]}><View style={styles.secretChestImageStage}><Image source={SECRET_ROOM_ASSETS.settingsChest} resizeMode="contain" style={styles.secretSettingsChestCardImage}/></View><View style={[styles.secretNamePlaque,{borderColor:'#ffd166'}]}><Text numberOfLines={1} style={styles.secretChestName}>تنظیمات</Text></View><Text style={styles.secretSettingsChestDesc}>نام · عکس · نوشته · قاب</Text></MagicPressable>
      </>}
      {section==='chests'&&openChest!==null&&<View style={styles.secretDetailWrap}>
        <SecretBackButton small label="بازگشت به صندوقچه‌ها" onPress={()=>setOpenChest(null)} color={accent}/>
        <Text style={styles.secretSectionTitle}>{chestNames[openChest]??SECRET_DEFAULT_CHEST_NAMES[openChest]}</Text>
        <View style={styles.secretChestRevealStage}><Animated.View style={[styles.secretChestLight,{backgroundColor:accent,opacity:chestGlow,shadowColor:accent}]}/><Animated.Image source={SECRET_ROOM_ASSETS.openChest} resizeMode="contain" style={[styles.secretOpenChestArt,{transform:[{scale:photoPop.interpolate({inputRange:[0,1],outputRange:[.84,1]})},{translateY:photoPop.interpolate({inputRange:[0,1],outputRange:[24,0]})}]}]}/><Animated.View style={[styles.secretFloatingMemory,{opacity:photoPop,transform:[{translateY:photoPop.interpolate({inputRange:[0,1],outputRange:[68,-55]})},{scale:photoPop.interpolate({inputRange:[0,1],outputRange:[.48,1]})}]}]}><ExpoImage source={savedChestCover(openChest)?{uri:savedChestCover(openChest)}:secretAlbumFallbackPhoto(openChest,0)} contentFit="cover" style={styles.secretFloatingMemoryImage}/><View style={styles.secretFloatingMemoryGloss}/></Animated.View></View>
        <View style={[styles.secretMemoryMessage,{borderColor:accent,shadowColor:accent}]}><View style={styles.secretMemoryMessageHeading}><Ionicons name="heart" size={20} color="#ff79c8"/><Text style={styles.secretMemoryLabel}>یادگاری خانواده</Text><Ionicons name="heart" size={20} color="#ff79c8"/></View><Text style={styles.secretMemoryText}>{chestMessage[openChest]??SECRET_DEFAULT_CHEST_MESSAGES[openChest]}</Text></View>
      </View>}
      {section==='albums'&&openAlbum===null&&<>
        <View style={styles.secretSectionIntro}><Text style={styles.secretSectionTitle}>آلبوم‌های خانوادگی</Text><Text style={styles.secretSectionSub}>هفت آلبوم برای عکس‌ها و نوشته‌های شخصی؛ هر کدام در تنظیمات قابل تغییر است.</Text></View>
        <View style={styles.secretAlbumGrid}>{SECRET_DEFAULT_ALBUM_NAMES.map((fallbackName:string,i:number)=>{const selectedCover=coverUri(i);const cover=selectedCover?{uri:selectedCover}:secretAlbumFallbackPhoto(i,0);const pics=albumPhotos(i);return <MagicPressable key={`album${i}`} accessibilityLabel={`بازکردن آلبوم ${albumNames[i]??fallbackName}`} onPress={()=>setOpenAlbum(i)} magicColor={i%2?'#ff79c8':'#63e8ff'} style={[styles.secretAlbumCard,{borderColor:i%2?'#ff79c8':'#63e8ff'}]}><View style={styles.secretAlbumCoverStage}><ExpoImage source={typeof cover==='object'&&cover?.uri?{...cover,isAnimated:false}:cover as any} contentFit="cover" autoplay={false} style={styles.secretAlbumCover}/><View style={styles.secretAlbumCornerRibbon}><Ionicons name="images" size={15} color="#071326"/></View></View><View style={styles.secretAlbumPhotoStrip}>{pics.slice(0,3).map((entry:any,j:number)=><ExpoImage key={j} source={photoSource(entry) as any} contentFit="cover" style={styles.secretAlbumMiniPhoto}/>)}</View><View style={[styles.secretNamePlaque,{borderColor:i%2?'#ff79c8':'#63e8ff'}]}><Text numberOfLines={2} style={styles.secretChestName}>{albumNames[i]??fallbackName}</Text></View><Text style={styles.secretAlbumOpenText}>دیدن عکس‌ها  ›</Text></MagicPressable>})}</View>
      </>}
      {section==='albums'&&openAlbum!==null&&<View style={styles.secretDetailWrap}><SecretBackButton small label="بازگشت به آلبوم‌ها" onPress={()=>setOpenAlbum(null)} color="#ff79c8"/><Text style={styles.secretSectionTitle}>{albumNames[openAlbum]??SECRET_DEFAULT_ALBUM_NAMES[openAlbum]}</Text><View style={styles.secretAlbumDetailGrid}>{albumPhotos(openAlbum).map((entry:any,i:number)=><Animated.View key={i} style={[styles.secretAlbumDetailPhotoFrame,{opacity:albumReveal,transform:[{translateY:albumReveal.interpolate({inputRange:[0,1],outputRange:[35+(Number(s.secretAlbumEffect||0)%3)*10,0]})},{scale:albumReveal.interpolate({inputRange:[0,1],outputRange:[.72,1]})}]}]}><ExpoImage source={photoSource(entry) as any} contentFit="cover" autoplay={false} style={styles.secretAlbumDetailPhoto}/><View style={styles.secretPhotoNumberPlaque}><Text style={styles.secretPhotoNumberText}>{String(i+1).padStart(2,'0')}</Text></View></Animated.View>)}</View><View style={[styles.secretMemoryMessage,{borderColor:'#ff79c8',shadowColor:'#ff79c8'}]}><Text style={styles.secretMemoryLabel}>نوشته‌ی این آلبوم</Text><Text style={styles.secretMemoryText}>{albumMessage[openAlbum]??SECRET_DEFAULT_ALBUM_MESSAGES[openAlbum]}</Text></View></View>}
    </ScrollView>
  </>}
 </View>;
}

function SecretEffectPreview({kind,color}:{kind:number;color:string}){
 const rays=Array.from({length:8},(_,i)=>i);
 return <View style={[styles.secretEffectPreview,{borderColor:`${color}99`}]}>
   {kind===0&&<><View style={[styles.secretEffectCore,{backgroundColor:color,shadowColor:color}]}/><View style={[styles.secretEffectHalo,{borderColor:color,transform:[{scale:1.34}]}]}/><View style={[styles.secretEffectHalo,{borderColor:'#fff',transform:[{scale:1.7}]}]}/></>}
   {kind===1&&[0,1,2].map((i)=><View key={i} style={[styles.secretEffectHalo,{borderColor:i===1?'#fff':color,width:24+i*15,height:24+i*15,borderRadius:30+i*8}]}/>)}
   {kind===2&&<><View style={[styles.secretEffectOrbitVisual,{borderColor:color,transform:[{rotate:'-34deg'}]}]}/><View style={[styles.secretEffectOrbitVisual,{borderColor:'#fff',transform:[{rotate:'42deg'},{scale:.76}]}]}/><View style={[styles.secretEffectCore,{backgroundColor:color,shadowColor:color}]}/></>}
   {kind===3&&<>{rays.map(i=><View key={i} style={[styles.secretEffectRayVisual,{backgroundColor:i%2?'#fff':color,transform:[{rotate:`${i*45}deg`}]}]}/>)}</>}
   {kind===4&&<><View style={[styles.secretEffectCore,{backgroundColor:'#ffd166',shadowColor:color,width:14,height:14}]}/><View style={[styles.secretEffectHalo,{borderColor:color,width:50,height:50}]}/><View style={[styles.secretEffectHalo,{borderColor:'#fff',width:34,height:34}]}/><View style={[styles.secretEffectPetal,{top:4,left:24,backgroundColor:'#ff79c8'}]}/><View style={[styles.secretEffectPetal,{top:23,left:43,backgroundColor:'#72ffc5'}]}/><View style={[styles.secretEffectPetal,{top:42,left:24,backgroundColor:'#ffd166'}]}/><View style={[styles.secretEffectPetal,{top:23,left:5,backgroundColor:'#b28cff'}]}/></>}
 </View>;
}
function SecretSettings({s,setS,onBack}:{s:any;setS:(p:any)=>void;onBack:()=>void}){
 const [modal,setModal]=useState<null|'background'|'frame'|'chestStyle'|'tapEffect'|'doorEffect'|'chestEffect'|'albumEffect'>(null);
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(modal){setModal(null);return true;}onBack();return true;});return()=>sub.remove();},[modal,onBack]);
 const [selectedChest,setSelectedChest]=useState(0);
 const [backgroundTarget,setBackgroundTarget]=useState<'door'|'chests'|'albums'>('door');
 const [saving,setSaving]=useState(false);
 const chestNames=Array.isArray(s.secretChestNames)?s.secretChestNames:SECRET_DEFAULT_CHEST_NAMES;
 const chestStyle=Array.isArray(s.secretChestStyle)?s.secretChestStyle:[0,1,2,3,4];
 const chestArtUris=Array.isArray(s.secretChestArtUris)?s.secretChestArtUris:[null,null,null,null,null];
 const chestCoverUris=Array.isArray(s.secretChestCoverUris)?s.secretChestCoverUris:[null,null,null,null,null];
 const chestMessages=Array.isArray(s.secretChestMessages)?s.secretChestMessages:SECRET_DEFAULT_CHEST_MESSAGES;
 const albumNames=Array.isArray(s.secretAlbumNames)?s.secretAlbumNames:SECRET_DEFAULT_ALBUM_NAMES;
 const albumCoverUris=normalizeSecretAlbumArray(s.secretAlbumCoverUris,[null,null,null,null,null,null,null]);
 const albumPhotos=normalizeSecretAlbumArray(s.secretAlbumPhotos,[[],[],[],[],[],[],[]]);
 const albumMessages=Array.isArray(s.secretAlbumMessages)?s.secretAlbumMessages:SECRET_DEFAULT_ALBUM_MESSAGES;
 const updateArray=(key:string,index:number,value:any,base:any[])=>{const old=Array.isArray(s[key])?[...s[key]]:[...base];while(old.length<base.length)old.push(base[old.length]);old[index]=value;setS({[key]:old});};
 const pageBgs={...DEFAULTS.secretPageBackgrounds,...(s.secretPageBackgrounds||{})};const updatePageBg=(target:'door'|'chests'|'albums',patch:any)=>setS({secretPageBackgrounds:{...pageBgs,[target]:{...(pageBgs[target]||{kind:'preset',preset:0,uri:null}),...patch}}});const bgLabel=(target:'door'|'chests'|'albums')=>{const b=pageBgs[target];return b?.kind==='image'||b?.kind==='gif'?(b.uri?'از گالری انتخاب شده':'از گالری'): `${SECRET_BG_PRESETS[Math.max(0,Math.min(5,Number(b?.preset)||0))].name}${b?.kind==='presetGif'?' · GIF':''}`;};const bgPreview=(target:'door'|'chests'|'albums')=>{const b=pageBgs[target];if((b?.kind==='image'||b?.kind==='gif')&&b.uri)return {uri:b.uri};const v=SECRET_BG_PRESETS[Math.max(0,Math.min(5,Number(b?.preset)||0))];return b?.kind==='presetGif'?v.gif:v.image;};
 const pickImage=async(prefix:string,onPicked:(uri:string,asset:any)=>void,kind:'image'|'gif'='image',multiple=false,staticOnly=false,selectionLimit=4)=>{
   setSaving(true);
   try{
    const limit=Math.max(1,Math.min(4,Math.trunc(selectionLimit)||1));
    const res=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1,allowsMultipleSelection:multiple,selectionLimit:multiple?limit:1});
    if(res.canceled||!res.assets?.length)return;
    if(kind==='gif'&&!isGifAsset(res.assets[0])){Alert.alert('فایل GIF لازم است','برای این انتخاب، یک فایل GIF متحرک از گالری انتخاب کن.');return;}
    if(staticOnly&&res.assets.some(isGifAsset)){Alert.alert('تصویر ثابت لازم است','این بخش فقط تصویر ثابت می‌پذیرد. برای حرکت، از گزینه‌ی GIF پس‌زمینه استفاده کن.');return;}
    if(multiple){
      const saved:string[]=[];
      for(let i=0;i<Math.min(limit,res.assets.length);i++){const asset=res.assets[i];saved.push(await persistSecretGalleryUri(asset.uri,`${prefix}_${i}`,asset.fileName||undefined,asset.mimeType||undefined));}
      onPicked(JSON.stringify(saved),res.assets[0]);
    }else{
      const asset=res.assets[0];
      const saved=await persistSecretGalleryUri(asset.uri,prefix,asset.fileName||undefined,asset.mimeType||undefined);
      onPicked(saved,asset);
    }
   }catch(error){
    console.warn('[KoroshNova Secret Room] Gallery selection/save failed',error);
    Alert.alert('ذخیره‌ی تصویر انجام نشد','فایل انتخاب‌شده در حافظه‌ی برنامه ذخیره نشد. دوباره انتخابش کن و مجوز گالری را بررسی کن.');
   }finally{setSaving(false)}
 };
 const effectData:any={tap:[['پالس انفجاری','pulse-outline'],['حلقه‌های چندگانه','radio-outline'],['مدار چرخان','sync-outline'],['رگبار نور','flash-outline'],['انفجار پنج‌مرحله‌ای','sparkles']],door:[['شکافتن نور','flash-outline'],['شکوفه‌های جادویی','flower-outline'],['موج انرژی','water-outline'],['شراره‌های ستاره‌ای','sparkles'],['درخشش طلایی','sunny-outline']],chest:[['طلوع طلایی','sunny-outline'],['شفق فیروزه‌ای','color-palette-outline'],['ذرات خاطره','sparkles'],['حلقه‌های آرام','radio-outline'],['باران گلبرگ','flower-outline']],album:[['پیدایش تصویر','images-outline'],['برگ‌های خاطره','leaf-outline'],['موج صورتی','water-outline'],['نور نرم','sunny-outline'],['ستاره‌های آلبوم','sparkles']]};
 const safeEffectIndex=(value:any)=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(4,Math.trunc(n))):0;};
 const currentEffect=modal==='tapEffect'?safeEffectIndex(s.secretTapEffect):modal==='doorEffect'?safeEffectIndex(s.secretDoorEffect):modal==='chestEffect'?safeEffectIndex(s.secretChestEffect):safeEffectIndex(s.secretAlbumEffect);
 const setEffect=(v:number)=>{const key=modal==='tapEffect'?'secretTapEffect':modal==='doorEffect'?'secretDoorEffect':modal==='chestEffect'?'secretChestEffect':'secretAlbumEffect';setS({[key]:v});setModal(null)};
 const labelState=(yes:boolean)=>yes?'انتخاب شده':'تصویر پیش‌فرض';
 return <SafeAreaView style={styles.safe}><View style={styles.secretSettingsRoot}><Header page="تنظیمات اتاق مخفی" onBack={onBack} onSettings={()=>{}} s={s}/><ScrollView contentContainerStyle={styles.secretSettingsContent} showsVerticalScrollIndicator={false}>
   <View style={styles.secretSettingsIntro}><Image source={SECRET_ROOM_ASSETS.settingsChest} style={styles.secretSettingsIntroImage} resizeMode="contain"/><View style={{flex:1}}><Text style={styles.secretSettingsTitle}>کارگاه شخصی‌سازی خاطرات</Text><Text style={styles.secretSettingsSub}>هر نام، عکس و نوشته را خانواده خودش انتخاب می‌کند؛ تغییرها به‌طور خودکار ذخیره می‌شوند.</Text></View></View>
   <View style={styles.secretSettingsGroup}><Text style={styles.secretSettingsGroupTitle}>پس‌زمینه‌ی مستقل هر صفحه</Text><Text style={styles.secretSettingsHint}>برای دروازه، صفحه‌ی صندوقچه‌ها و صفحه‌ی آلبوم‌ها جداگانه تصویر ثابت یا GIF انتخاب کن.</Text>
    {([['door','دروازه‌ی خاطرات','دروازه‌ی بسته از این تصویر عبور می‌کند'],['chests','صفحه‌ی صندوقچه‌ها','پس‌زمینه‌ی پشت صندوقچه‌های خاطره'],['albums','صفحه‌ی آلبوم‌ها','پس‌زمینه‌ی پشت آلبوم‌های عکس']] as any[]).map(([target,label,sub])=><View key={target} style={styles.secretBgEditor}><SecretSettingAction label={label} subtitle={bgLabel(target)} image={bgPreview(target)} onPress={()=>{setBackgroundTarget(target);setModal('background')}} active color={target==='door'?'#63e8ff':target==='chests'?'#ffd166':'#ff79c8'}/><View style={styles.secretSettingsButtonRow}><SecretSettingAction label="عکس ثابت از گالری" subtitle={pageBgs[target]?.kind==='image'?'انتخاب شده':'انتخاب تصویر'} image={pageBgs[target]?.kind==='image'&&pageBgs[target]?.uri?{uri:pageBgs[target].uri}:SECRET_BG_PRESETS[0].image} onPress={()=>void pickImage(`secret_${target}_bg`,uri=>updatePageBg(target,{kind:'image',uri}),'image',false,true)} active={pageBgs[target]?.kind==='image'} color="#ffd166"/><SecretSettingAction label="GIF متحرک از گالری" subtitle={pageBgs[target]?.kind==='gif'?'انتخاب شده':'GIF با حرکت واقعی'} image={pageBgs[target]?.kind==='gif'&&pageBgs[target]?.uri?{uri:pageBgs[target].uri}:SECRET_BG_PRESETS[0].gif} onPress={()=>void pickImage(`secret_${target}_gif`,uri=>updatePageBg(target,{kind:'gif',uri}),'gif')} active={pageBgs[target]?.kind==='gif'} color="#ff79c8"/></View></View>)}
    <View style={styles.secretSettingsButtonRow}><SecretSettingAction label="افکت لمس‌های پنج‌گانه" subtitle={effectData.tap[safeEffectIndex(s.secretTapEffect)][0]} image={SECRET_ROOM_ASSETS.doorFull} onPress={()=>setModal('tapEffect')} active color="#b28cff"/><SecretSettingAction label="افکت بازشدن در" subtitle={effectData.door[safeEffectIndex(s.secretDoorEffect)][0]} image={SECRET_ROOM_ASSETS.doorLeft} onPress={()=>setModal('doorEffect')} active color="#63e8ff"/></View>
    <View style={styles.secretSettingsButtonRow}><SecretSettingAction label="افکت نور صندوقچه" subtitle={effectData.chest[safeEffectIndex(s.secretChestEffect)][0]} image={SECRET_ROOM_ASSETS.openChest} onPress={()=>setModal('chestEffect')} active color="#ffd166"/><SecretSettingAction label="افکت بازشدن آلبوم" subtitle={effectData.album[safeEffectIndex(s.secretAlbumEffect)][0]} image={SECRET_ROOM_ASSETS.familyAlbumDefault} onPress={()=>setModal('albumEffect')} active color="#ff79c8"/></View>
   </View>
   <View style={styles.secretSettingsGroup}><Text style={styles.secretSettingsGroupTitle}>پنج صندوقچه‌ی خاطره</Text><Text style={styles.secretSettingsHint}>هر صندوقچه می‌تواند طرح، نام، تصویر خاطره و نوشته‌ی مخصوص خودش را داشته باشد.</Text>
    {SECRET_DEFAULT_CHEST_NAMES.map((fallbackName:string,i:number)=><View key={`chestsetting${i}`} style={styles.secretEditorCard}>
      <View style={styles.secretEditorCardHeader}><Image source={SECRET_ROOM_ASSETS.chests[Math.max(0,Math.min(4,Number(chestStyle[i])||0))]} style={styles.secretEditorChestImage} resizeMode="contain"/><View style={{flex:1}}><Text style={styles.secretEditorTitle}>صندوقچه‌ی {i+1}</Text><Text style={styles.secretSettingsHint}>{chestCoverUris[i]? 'تصویر داخل صندوقچه انتخاب شده':'تصویر پیش‌فرض آماده است'}</Text></View><View style={styles.secretIndexBadge}><Text style={styles.secretIndexBadgeText}>{i+1}</Text></View></View>
      <Text style={styles.secretFieldLabel}>نام روی پلاک</Text><TextInput value={String(chestNames[i]??fallbackName)} onChangeText={v=>updateArray('secretChestNames',i,v,SECRET_DEFAULT_CHEST_NAMES)} style={styles.secretTextInput} placeholder="نام صندوقچه" placeholderTextColor="rgba(255,255,255,.45)"/>
      <SecretSettingAction label="تغییر تصویر خود صندوقچه" subtitle={chestArtUris[i]?'تصویر اختصاصی از گالری':'طرح اختصاصی پیش‌فرض'} image={chestArtUris[i]?{uri:chestArtUris[i]}:SECRET_ROOM_ASSETS.chests[Math.max(0,Math.min(4,Number(chestStyle[i])||0))]} onPress={()=>void pickImage(`secret_chest_${i}_art`,uri=>updateArray('secretChestArtUris',i,uri,[null,null,null,null,null]))} active={!!chestArtUris[i]} color="#63e8ff"/>
      <View style={styles.secretSettingsButtonRow}><SecretSettingAction label="طرح و رنگ صندوقچه" subtitle={`طرح ${Number(chestStyle[i]||0)+1} از ۵`} image={SECRET_ROOM_ASSETS.chests[Math.max(0,Math.min(4,Number(chestStyle[i])||0))]} onPress={()=>{setSelectedChest(i);setModal('chestStyle')}} active color="#63e8ff"/><SecretSettingAction label="بازگشت به طرح پیش‌فرض" subtitle={chestArtUris[i]?'استفاده از طرح رنگی انتخاب‌شده':'طرح پیش‌فرض فعال است'} image={SECRET_ROOM_ASSETS.chests[Math.max(0,Math.min(4,Number(chestStyle[i])||0))]} onPress={()=>updateArray('secretChestArtUris',i,null,[null,null,null,null,null])} active={!chestArtUris[i]} color="#ffd166"/></View>
      <SecretSettingAction label="تغییر عکس داخل صندوقچه" subtitle={labelState(!!chestCoverUris[i])} image={chestCoverUris[i]?{uri:chestCoverUris[i]}:secretAlbumFallbackPhoto(i,0)} onPress={()=>void pickImage(`secret_chest_${i}_photo`,uri=>updateArray('secretChestCoverUris',i,uri,[null,null,null,null,null]),'image',false,true)} active={!!chestCoverUris[i]} color="#ff79c8"/>
      <SecretSettingAction label="بازگشت عکس داخل صندوقچه به پیش‌فرض" subtitle={chestCoverUris[i]?'عکس اختصاصی فعال است':'تصویر پیش‌فرض فعال است'} image={secretAlbumFallbackPhoto(i,0)} onPress={()=>updateArray('secretChestCoverUris',i,null,[null,null,null,null,null])} active={!chestCoverUris[i]} color="#ffd166"/>
      <Text style={styles.secretFieldLabel}>نوشته‌ی خاطره‌ی داخل صندوقچه</Text><TextInput value={String(chestMessages[i]??SECRET_DEFAULT_CHEST_MESSAGES[i])} onChangeText={v=>updateArray('secretChestMessages',i,v,SECRET_DEFAULT_CHEST_MESSAGES)} multiline style={[styles.secretTextInput,styles.secretTextArea]} placeholder="متن یادگاری خانواده" placeholderTextColor="rgba(255,255,255,.45)"/>
    </View>)}
   </View>
   <View style={styles.secretSettingsGroup}><Text style={styles.secretSettingsGroupTitle}>هفت آلبوم خانوادگی</Text><Text style={styles.secretSettingsHint}>برای هر آلبوم عکس روی پلاک، تا چهار عکس داخل آلبوم و یک نوشته‌ی اختصاصی انتخاب کنید.</Text>
    {SECRET_DEFAULT_ALBUM_NAMES.map((fallbackName:string,i:number)=><View key={`albumsetting${i}`} style={styles.secretEditorCard}>
      <View style={styles.secretEditorCardHeader}><Image source={albumCoverUris[i]?{uri:albumCoverUris[i]}:secretAlbumFallbackPhoto(i,0)} style={styles.secretEditorChestImage} resizeMode="cover"/><View style={{flex:1}}><Text style={styles.secretEditorTitle}>آلبوم {i===6?'خانوادگی':albumNames[i]??fallbackName}</Text><Text style={styles.secretSettingsHint}>{Array.isArray(albumPhotos[i])&&albumPhotos[i].length?`${albumPhotos[i].length} عکس از گالری`:'پیش‌نمایش‌های اختصاصی آماده است'}</Text></View><View style={styles.secretIndexBadge}><Text style={styles.secretIndexBadgeText}>{i+1}</Text></View></View>
      <Text style={styles.secretFieldLabel}>نام روی پلاک آلبوم</Text><TextInput value={String(albumNames[i]??fallbackName)} onChangeText={v=>updateArray('secretAlbumNames',i,v,SECRET_DEFAULT_ALBUM_NAMES)} style={styles.secretTextInput} placeholder="نام آلبوم" placeholderTextColor="rgba(255,255,255,.45)"/>
      <View style={styles.secretSettingsButtonRow}><SecretSettingAction label="عکس روی پلاک" subtitle={labelState(!!albumCoverUris[i])} image={albumCoverUris[i]?{uri:albumCoverUris[i]}:secretAlbumFallbackPhoto(i,0)} onPress={()=>void pickImage(`secret_album_${i}_cover`,uri=>updateArray('secretAlbumCoverUris',i,uri,[null,null,null,null,null,null,null]),'image',false,true)} active={!!albumCoverUris[i]} color="#63e8ff"/><SecretSettingAction label="جایگزینی عکس‌ها" subtitle={`${Array.isArray(albumPhotos[i])?albumPhotos[i].length:0} عکس فعلی · حداکثر ۴`} image={SECRET_ROOM_ASSETS.familyAlbumDefault} onPress={()=>void pickImage(`secret_album_${i}_photos`,json=>updateArray('secretAlbumPhotos',i,JSON.parse(json),[[],[],[],[],[],[],[]]),'image',true,true,4)} active={Array.isArray(albumPhotos[i])&&albumPhotos[i].length>0} color="#ff79c8"/></View>
      <SecretSettingAction label="افزودن عکس به آلبوم" subtitle={`${Math.max(0,4-(Array.isArray(s.secretAlbumPhotos?.[i])?s.secretAlbumPhotos[i].length:0))} جای خالی از ۴`} image={secretAlbumFallbackPhoto(i,1)} onPress={()=>{const existing=Array.isArray(s.secretAlbumPhotos?.[i])?s.secretAlbumPhotos[i]:[];const remaining=4-existing.length;if(remaining<=0){Alert.alert('آلبوم پر است','برای افزودن عکس تازه، ابتدا عکس‌ها را جایگزین کن یا به پیش‌فرض برگرد.');return;}void pickImage(`secret_album_${i}_append`,json=>{let additions:string[]=[];try{additions=JSON.parse(json);}catch{}updateArray('secretAlbumPhotos',i,[...existing,...additions].slice(0,4),[[],[],[],[],[],[],[]]);},'image',true,true,remaining)}} active={Array.isArray(s.secretAlbumPhotos?.[i])&&s.secretAlbumPhotos[i].length>0} color="#72ffc5"/>
      <SecretSettingAction label="بازگشت تصاویر آلبوم به پیش‌فرض" subtitle={(albumCoverUris[i]||Array.isArray(albumPhotos[i])&&albumPhotos[i].length)?'تصاویر اختصاصی فعال‌اند':'تصاویر پیش‌فرض فعال‌اند'} image={secretAlbumFallbackPhoto(i,0)} onPress={()=>{updateArray('secretAlbumCoverUris',i,null,[null,null,null,null,null,null,null]);updateArray('secretAlbumPhotos',i,[],[[],[],[],[],[],[],[]]);}} active={!albumCoverUris[i]&&!(Array.isArray(albumPhotos[i])&&albumPhotos[i].length)} color="#ffd166"/>
      <Text style={styles.secretFieldLabel}>نوشته‌ی این آلبوم</Text><TextInput value={String(albumMessages[i]??SECRET_DEFAULT_ALBUM_MESSAGES[i])} onChangeText={v=>updateArray('secretAlbumMessages',i,v,SECRET_DEFAULT_ALBUM_MESSAGES)} multiline style={[styles.secretTextInput,styles.secretTextArea]} placeholder="نوشته‌ی خاطره" placeholderTextColor="rgba(255,255,255,.45)"/>
    </View>)}
   </View>
   <View style={styles.secretSettingsGroup}><Text style={styles.secretSettingsGroupTitle}>قاب خانوادگی افقی</Text><Text style={styles.secretSettingsHint}>وقتی قاب را باز می‌کنید، صفحه افقی می‌شود. قاب، عکس و جهت صفحه از هم جدا هستند.</Text>
    <View style={styles.secretFramePresetRow}>{SECRET_ROOM_ASSETS.frames.map((src:any,i:number)=>{const active=Number(s.secretFramePreset||0)===i;return <MagicPressable key={i} accessibilityRole="button" accessibilityLabel={`انتخاب قاب ${SECRET_FRAME_NAMES[i]}`} onPress={()=>setS({secretFramePreset:i})} magicColor="#ffd166" style={[styles.secretFramePresetCard,active&&styles.secretFramePresetActive,{borderColor:active?'#72ffc5':'rgba(255,209,102,.4)'}]}><Image source={src} resizeMode="stretch" style={styles.secretFramePresetThumb}/><Text style={styles.secretFramePresetName}>{SECRET_FRAME_NAMES[i]}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>
    <SecretSettingAction label="انتخاب عکس داخل قاب خانوادگی" subtitle={s.secretFramePhotoUri?'عکس انتخاب شده':'تصویر پیش‌فرض خانوادگی آماده است'} image={s.secretFramePhotoUri?{uri:s.secretFramePhotoUri}:SECRET_ROOM_ASSETS.familyDefault} onPress={()=>void pickImage('secret_family_frame_photo',uri=>setS({secretFramePhotoUri:uri}),'image',false,true)} active={!!s.secretFramePhotoUri} color="#ffd166"/>
    <SecretSettingAction label="بازگشت قاب به تصویر پیش‌فرض" subtitle={s.secretFramePhotoUri?'عکس اختصاصی انتخاب شده':'تصویر پیش‌فرض خانوادگی فعال است'} image={SECRET_ROOM_ASSETS.familyDefault} onPress={()=>setS({secretFramePhotoUri:null})} active={!s.secretFramePhotoUri} color="#63e8ff"/>
    <SecretSettingAction label="افکت ورود به آلبوم‌ها" subtitle={effectData.album[safeEffectIndex(s.secretAlbumEffect)][0]} image={SECRET_ROOM_ASSETS.familyAlbumDefault} onPress={()=>setModal('albumEffect')} active color="#b28cff"/>
   </View>
   {saving&&<Text style={styles.secretSettingsSaving}>در حال ذخیره‌ی تصویرها…</Text>}
   <SecretBackButton small label="بازگشت به اتاق خاطرات" onPress={onBack} color="#72ffc5"/>
 </ScrollView>
 {modal&&<SelectionModal title={modal==='background'?'پس‌زمینه‌های ثابت و متحرک':modal==='frame'?'قاب خانوادگی':modal==='chestStyle'?'انتخاب طرح صندوقچه':modal==='tapEffect'?'افکت لمس‌های پنج‌گانه':modal==='doorEffect'?'افکت بازشدن در':modal==='chestEffect'?'افکت نور صندوقچه':'افکت نمایش آلبوم'} onClose={()=>setModal(null)}>
   {modal==='background'&&<>
    <Text style={styles.secretSettingsGroupTitle}>{backgroundTarget==='door'?'پس‌زمینه‌ی دروازه':backgroundTarget==='chests'?'پس‌زمینه‌ی صندوقچه‌ها':'پس‌زمینه‌ی آلبوم‌ها'} · تصویر ثابت</Text><View style={styles.bgGrid}>{SECRET_BG_PRESETS.map((v:any,i:number)=>{const active=pageBgs[backgroundTarget]?.kind==='preset'&&Number(pageBgs[backgroundTarget]?.preset||0)===i;return <MagicPressable key={`sb${i}`} onPress={()=>{updatePageBg(backgroundTarget,{kind:'preset',preset:i,uri:null});setModal(null)}} style={[styles.bgChoice,active&&styles.bgChoiceSelected]}><Image source={v.image} resizeMode="cover" style={styles.bgFullImage}/><View style={styles.bgChoiceShade}/><Text style={styles.bgName}>{v.name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>
    <Text style={styles.secretSettingsGroupTitle}>GIF متحرک پیش‌فرض</Text><View style={styles.bgGrid}>{SECRET_BG_PRESETS.map((v:any,i:number)=>{const active=pageBgs[backgroundTarget]?.kind==='presetGif'&&Number(pageBgs[backgroundTarget]?.preset||0)===i;return <MagicPressable key={`sg${i}`} onPress={()=>{updatePageBg(backgroundTarget,{kind:'presetGif',preset:i,uri:null});setModal(null)}} style={[styles.bgChoice,active&&styles.bgChoiceSelected]}><ExpoImage source={v.gif} contentFit="cover" autoplay style={styles.bgFullImage}/><View style={styles.bgChoiceShade}/><Text style={styles.bgName}>{v.name} · GIF</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>
   </>}
   {modal==='chestStyle'&&<View style={styles.secretChestStyleGrid}>{SECRET_ROOM_ASSETS.chests.map((src:any,i:number)=>{const active=Number(chestStyle[selectedChest]||0)===i;return <MagicPressable key={i} onPress={()=>{updateArray('secretChestStyle',selectedChest,i,[0,1,2,3,4]);setModal(null)}} style={[styles.secretChestStyleChoice,active&&styles.secretChestStyleChoiceActive]}><Image source={src} resizeMode="contain" style={styles.secretChestStyleImage}/><Text style={styles.modalCardText}>{['فیروزه‌ای سلطنتی','گل‌نشان صورتی','کیهانی بنفش','جنگلی زمردی','قلب یاقوتی'][i]}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>}
   {(modal==='tapEffect'||modal==='doorEffect'||modal==='chestEffect'||modal==='albumEffect')&&<View style={styles.secretEffectGrid}>{(modal==='tapEffect'?effectData.tap:modal==='doorEffect'?effectData.door:modal==='chestEffect'?effectData.chest:effectData.album).map(([name]:any,i:number)=>{const active=currentEffect===i;return <MagicPressable key={name} onPress={()=>setEffect(i)} magicColor={active?'#72ffc5':String(s.secretColor||'#63e8ff')} style={[styles.secretEffectChoice,active&&styles.secretEffectChoiceActive]}><SecretEffectPreview kind={i} color={active?'#72ffc5':String(s.secretColor||'#63e8ff')}/><Text style={styles.modalCardText}>{name}</Text>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}</MagicPressable>})}</View>}
 </SelectionModal>}
 </View></SafeAreaView>;
}
function SecretSettingAction({label,subtitle,image,onPress,active=false,color='#63e8ff'}:{label:string;subtitle:string;image:any;onPress:()=>void;active?:boolean;color?:string}){
 return <MagicPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} magicColor={color} style={[styles.secretSettingAction,{borderColor:active?'#72ffc5':`${color}8f`,shadowColor:color},active&&styles.secretSettingActionActive]}><View style={[styles.secretSettingActionImageWrap,{borderColor:color}]}><ExpoImage source={typeof image==='number'?image:(image as any)?.uri?{...(image as any),isAnimated:String((image as any).uri).toLowerCase().split('?')[0].endsWith('.gif')}:image} contentFit="cover" autoplay={String((image as any)?.uri||'').toLowerCase().split('?')[0].endsWith('.gif')} style={styles.secretSettingActionImage}/></View><View style={{flex:1}}><Text style={styles.secretSettingActionLabel}>{label}</Text><Text style={styles.secretSettingActionSub}>{subtitle}</Text></View>{active&&<View style={styles.selectionTick}><Ionicons name="checkmark" size={12} color="#06111a"/></View>}<Ionicons name="chevron-forward" size={17} color={color}/></MagicPressable>;
}

function reportedTelemetryBit(source:any,paths:string[]):boolean|undefined{
  const truthy=new Set(['true','1','connected','online','ready','working','ok','on','present','وصل','متصل','فعال','آماده','سالم']);
  const falsy=new Set(['false','0','disconnected','offline','cut','off','missing','قطع','جدا','غیرفعال','خاموش','ناپایدار']);
  for(const path of paths){
    let value=source;
    for(const part of path.split('.')){if(!value||typeof value!=='object'||!(part in value)){value=undefined;break;}value=value[part];}
    if(typeof value==='boolean')return value;
    if(typeof value==='number'&&(value===0||value===1))return value===1;
    if(typeof value==='string'){
      const v=value.trim().toLowerCase();if(truthy.has(v))return true;if(falsy.has(v))return false;
      if(['fault','error','failed','خراب','خطا','خطا گزارش شد'].includes(v))return /fault|error/i.test(path);
    }
    if(value&&typeof value==='object'){
      for(const candidate of ['connected','isConnected','present','ready','working','ok','enabled','active','on','isOn','low'])if(typeof value[candidate]==='boolean')return value[candidate];
      for(const field of ['status','state'])if(typeof value[field]==='string'){const v=value[field].trim().toLowerCase();if(truthy.has(v))return true;if(falsy.has(v))return false;if(['fault','error','failed','خراب','خطا'].includes(v)&&/fault|error/i.test(path))return true;}
    }
  }
  return undefined;
}

function matchesNovaAudioRoute(deviceName:string,expectedName:string):boolean{
  const name=String(deviceName||'').trim().toLowerCase();
  const expected=String(expectedName||'').trim().toLowerCase();
  if(!name||!expected)return false;
  if(name.includes(expected))return true;
  if(expected==='nova')return name.includes('korosh')||name.includes('kouroosh')||name.includes('koroosh');
  return false;
}

export default function App(){
 const [page,setPage]=useState<PageId>('bluetooth');
 const [secretSection,setSecretSection]=useState<SecretSection>('door');
 const [settingsPage,setSettingsPage]=useState<PageId|'secret'|null>(null);
 const orientationQueue=useRef<Promise<void>>(Promise.resolve());
 useEffect(()=>{
   let cancelled=false;
   const wantsLandscape=page==='equalizer'||(page==='secret'&&secretSection==='frame');
   orientationQueue.current=orientationQueue.current.catch(()=>{}).then(async()=>{
     if(cancelled)return;
     try{
       if(wantsLandscape){const supported=await ScreenOrientation.supportsOrientationLockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);if(!cancelled&&supported)await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);}
       else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
     }catch{}
   });
   return()=>{cancelled=true;};
 },[page,secretSection]);
 useEffect(()=>{if(Platform.OS!=='android')return;const hide=()=>void LotusBle.hideSystemNavigationBar();hide();const sub=AppState.addEventListener('change',st=>{if(st==='active')hide()});return()=>sub.remove()},[page]);
 const [settings,setSettings]=useState<Record<string,Bg>>({});const [s,setState]=useState<any>(DEFAULTS);const [boot,setBoot]=useState(true);const [storageLoaded,setStorageLoaded]=useState(false);const [secureGateRequest,setSecureGateRequest]=useState<any>(null);const [authorizedTargets,setAuthorizedTargets]=useState<Record<string,boolean>>({});const [appGateArmed,setAppGateArmed]=useState(false);const [appGateUnlocked,setAppGateUnlocked]=useState(false);const pendingSecureActionRef=useRef<null|(()=>void)>(null);useWindowDimensions();
 useEffect(()=>{AsyncStorage.getItem(STORE).then(async v=>{if(v){const d=JSON.parse(v);const saved=d.state||{};const familyDeviceToken=await getFamilyDeviceToken().catch(()=>null);const trustedFamilyCache=FAMILY_SECURITY_CONFIGURED&&!!familyDeviceToken&&Number(saved.familySecurityVersion)>0;const cachedFamilyOptions=trustedFamilyCache?{...DEFAULTS.securityOptions,...(saved.securityOptions||{})}:{...DEFAULTS.securityOptions};void SecureStore.deleteItemAsync('korosh_nova_shared_security_pin').catch(()=>{});setState({...DEFAULTS,...saved,securityEnabled:false,securityPinSet:trustedFamilyCache&&!!saved.securityPinSet,securityOwnerSetup:trustedFamilyCache&&!!saved.securityOwnerSetup,securityOwnerRole:trustedFamilyCache?(saved.securityOwnerRole||''):'',securityOwnerName:trustedFamilyCache?(saved.securityOwnerName||''):'',securityMethod:trustedFamilyCache&&['pin','pattern','biometric'].includes(saved.securityMethod)?saved.securityMethod:'pin',securityBiometric:trustedFamilyCache&&!!saved.securityOwnerSetup&&!!saved.securityBiometric,securityOptions:cachedFamilyOptions,familySecurityVersion:trustedFamilyCache?Number(saved.familySecurityVersion):undefined,familySecurityServiceConnected:false,familySecurityEnrollment:familyDeviceToken?'pending_sync':'not_enrolled',speakerAlerts:Object.fromEntries(SPEAKER_ALERT_EVENTS.map((event:any)=>[event.key,{...DEFAULT_SPEAKER_ALERTS[event.key],...(saved.speakerAlerts?.[event.key]||{})}])),networkOnline:null,bluetoothSpeakerConnected:null,devicePowerStatus:null,deviceUsbConnected:null,deviceReady:null,deviceFault:false,deviceBatteryLow:null,childLockDeviceConfirmed:null,childLockDeviceMayBeLocked:!!saved.childLockDeviceMayBeLocked||saved.childLockDeviceConfirmed===true,secretPageBackgrounds:{...DEFAULTS.secretPageBackgrounds,...saved.secretPageBackgrounds},secretChestNames:Array.isArray(saved.secretChestNames)&&saved.secretChestNames.length===5?saved.secretChestNames:DEFAULTS.secretChestNames,secretChestStyle:Array.isArray(saved.secretChestStyle)&&saved.secretChestStyle.length===5?saved.secretChestStyle:DEFAULTS.secretChestStyle,secretChestArtUris:Array.isArray(saved.secretChestArtUris)&&saved.secretChestArtUris.length===5?saved.secretChestArtUris:DEFAULTS.secretChestArtUris,secretChestCoverUris:Array.isArray(saved.secretChestCoverUris)&&saved.secretChestCoverUris.length===5?saved.secretChestCoverUris:DEFAULTS.secretChestCoverUris,secretChestMessages:Array.isArray(saved.secretChestMessages)&&saved.secretChestMessages.length===5?saved.secretChestMessages:DEFAULTS.secretChestMessages,secretAlbumNames:normalizeSecretAlbumArray(saved.secretAlbumNames,DEFAULTS.secretAlbumNames),secretAlbumCoverUris:normalizeSecretAlbumArray(saved.secretAlbumCoverUris,DEFAULTS.secretAlbumCoverUris),secretAlbumPhotos:normalizeSecretAlbumArray(saved.secretAlbumPhotos,DEFAULTS.secretAlbumPhotos),secretAlbumMessages:normalizeSecretAlbumArray(saved.secretAlbumMessages,DEFAULTS.secretAlbumMessages),navIconPreset:{...DEFAULTS.navIconPreset,...saved.navIconPreset},navIconColor:{...DEFAULTS.navIconColor,...saved.navIconColor},navIconGallery:{...DEFAULTS.navIconGallery,...saved.navIconGallery},navIconGalleryKind:{...DEFAULTS.navIconGalleryKind,...saved.navIconGalleryKind},navIconGifPreset:{...DEFAULTS.navIconGifPreset,...saved.navIconGifPreset},navIconSourceKind:{...DEFAULTS.navIconSourceKind,...saved.navIconSourceKind},pageIconPreset:{...DEFAULTS.pageIconPreset,...saved.pageIconPreset},pageIconColor:{...DEFAULTS.pageIconColor,...saved.pageIconColor},pageIconEffect:{...DEFAULTS.pageIconEffect,...saved.pageIconEffect},pageIconGallery:{...DEFAULTS.pageIconGallery,...saved.pageIconGallery},pageIconGalleryKind:{...DEFAULTS.pageIconGalleryKind,...saved.pageIconGalleryKind},pageFramePreset:{...DEFAULTS.pageFramePreset,...saved.pageFramePreset}});setSettings(d.settings||{});setAppGateArmed(trustedFamilyCache&&!!saved.securityOwnerSetup&&!!cachedFamilyOptions.appStart);setAppGateUnlocked(false)}else{setAppGateArmed(false);setAppGateUnlocked(false)}}).catch(()=>{}).finally(()=>setStorageLoaded(true));const t=setTimeout(()=>setBoot(false),5000);return()=>clearTimeout(t)},[]);
 const setS=(p:any)=>setState((x:any)=>({...x,...p}));
 const updatePendingRef=useRef(false);
 useEffect(()=>{if(!storageLoaded||!Updates.isEnabled)return;let active=true;const check=async()=>{try{const r=await Updates.checkForUpdateAsync();if(!active||!r.isAvailable)return;const f=await Updates.fetchUpdateAsync();if(!active||!(f as any).isNew)return;updatePendingRef.current=true;if(!s.playing&&!s.emergencyCameraTrigger){updatePendingRef.current=false;await Updates.reloadAsync();}}catch{}};void check();const sub=AppState.addEventListener('change',st=>{if(st==='active')void check();});return()=>{active=false;sub.remove();};},[storageLoaded]);
 useEffect(()=>{if(!storageLoaded||!Updates.isEnabled||s.playing||s.emergencyCameraTrigger||!updatePendingRef.current)return;updatePendingRef.current=false;void Updates.reloadAsync().catch(()=>{updatePendingRef.current=true;});},[storageLoaded,s.playing,s.emergencyCameraTrigger]);
 useEffect(()=>{
   if(!storageLoaded)return;
   if(s.securityOwnerSetup&&s.securityOptions?.appStart){setAppGateArmed(true);setAppGateUnlocked(false);}
   else if(!s.securityOptions?.appStart){setAppGateArmed(false);setAppGateUnlocked(true);}
 },[storageLoaded,s.securityOwnerSetup,s.securityOptions?.appStart]);
 useEffect(()=>{
   if(!storageLoaded||!FAMILY_SECURITY_CONFIGURED)return;
   let active=true;let firstSync=true;
   const syncFamilyPolicy=async()=>{
     const deviceToken=await getFamilyDeviceToken().catch(()=>null);
     if(!deviceToken){if(active)setState((old:any)=>({...old,familySecurityServiceConnected:false,familySecurityEnrollment:'not_enrolled'}));return;}
     try{
       const [fresh,localBio]=await Promise.all([fetchFamilyDevicePolicy(deviceToken),SecureStore.getItemAsync('korosh_nova_local_biometric_enabled_v1').catch(()=>null)]);
       if(!active)return;
       const deviceMethod:FamilyAuthMethod=fresh.authMethod==='biometric'&&localBio!=='true'?'pin':fresh.authMethod;
       setState((old:any)=>({...old,securityOwnerSetup:!!fresh.hasCredential,securityPinSet:!!fresh.hasCredential,securityOwnerRole:fresh.primaryOwnerRole||'',securityOwnerName:'',securityMethod:deviceMethod,securityBiometric:!!fresh.biometricAllowed&&localBio==='true',securityOptions:{...DEFAULTS.securityOptions,...fresh.options},familySecurityVersion:fresh.policyVersion,familySecurityServiceConnected:true,familySecuritySyncedAt:Date.now(),familySecurityEnrollment:'enrolled'}));
       if(firstSync){setAppGateArmed(!!fresh.hasCredential&&!!fresh.options?.appStart);setAppGateUnlocked(false);firstSync=false;}
     }catch(error:any){
       if(!active)return;
       if(error?.status===401){await clearFamilyDeviceToken();setState((old:any)=>({...old,securityOwnerSetup:false,securityPinSet:false,securityBiometric:false,securityOptions:{...DEFAULTS.securityOptions},familySecurityServiceConnected:false,familySecurityEnrollment:'revoked'}));setAppGateArmed(false);}
       else setState((old:any)=>({...old,familySecurityServiceConnected:false,familySecurityEnrollment:'offline'}));
       firstSync=false;
     }
   };
   void syncFamilyPolicy();
   const interval=setInterval(()=>void syncFamilyPolicy(),60000);
   const sub=AppState.addEventListener('change',status=>{if(status==='active')void syncFamilyPolicy();});
   return()=>{active=false;clearInterval(interval);sub.remove();};
 },[storageLoaded]);
 const alertPlayerRef=useRef<any>(null);const alertPlayerSubRef=useRef<any>(null);const alertStateRef=useRef<any>(null);
 const stopSpeakerAudio=useCallback(()=>{
   try{alertPlayerSubRef.current?.remove?.();}catch{}
   alertPlayerSubRef.current=null;
   try{alertPlayerRef.current?.pause?.();}catch{}
   try{alertPlayerRef.current?.remove?.();}catch{}
   alertPlayerRef.current=null;
 },[]);
 const playSpeakerAudio=useCallback(async(eventKey:string,sourceOverride?:any,preview=false)=>{
   let source=sourceOverride;
   if(!source){
     if(s.speakerAlertsEnabled===false)return;
     const conf=(s.speakerAlerts||DEFAULT_SPEAKER_ALERTS)[eventKey]||DEFAULT_SPEAKER_ALERTS[eventKey];
     if(!conf||conf.mode==='off')return;
     if(conf.mode==='file'&&conf.fileUri)source={uri:conf.fileUri};
     else source=SPEAKER_ALERT_CLIPS[eventKey]?.[Math.max(0,Math.min(4,Number(conf.presetId)||0))];
   }
   if(!source)return;
   stopSpeakerAudio();
   try{
     await setAudioModeAsync({playsInSilentMode:true,interruptionMode:'duckOthers'} as any);
     const player=createAudioPlayer(source);
     alertPlayerRef.current=player;
     try{player.volume=Math.max(.05,Math.min(1,Number(s.speakerAlertVolume??70)/100));}catch{}
     let subscription:any=null;
     subscription=player.addListener('playbackStatusUpdate',(status:any)=>{
       if(status?.didJustFinish){
         try{subscription?.remove?.();}catch{}
         if(alertPlayerSubRef.current===subscription)alertPlayerSubRef.current=null;
         try{player.remove?.();}catch{}
         if(alertPlayerRef.current===player)alertPlayerRef.current=null;
       }
     });
     alertPlayerSubRef.current=subscription;
     player.play();
   }catch{
     if(preview)Alert.alert('پخش نمونه انجام نشد','این فایل در خروجی صوتی فعلی قابل پخش نبود. فرمت MP3، WAV، M4A یا AAC را امتحان کن.');
   }
 },[s.speakerAlertsEnabled,s.speakerAlerts,s.speakerAlertVolume,stopSpeakerAudio]);
 useEffect(()=>()=>stopSpeakerAudio(),[stopSpeakerAudio]);
 const requestSecureAction=(target:string,title:string,action:()=>void)=>{
   if(target==='securityAdmin'||target==='securitySettings'){action();return;}
   if(s.securityOptions?.childLock&&['speakerPower','lighting','musicLibrary','nora','liveMic'].includes(target)){
     Alert.alert('قفل کودک فعال است','کنترل‌های اسپیکر قفل‌اند. برای آزادسازی، والد مسئول باید از «رمز مشترک» وارد شود و قفل کودک را خاموش کند.');return;
   }
   const required=target==='securityAdmin'?!!s.securityOwnerSetup:target==='securitySettings'?!!s.securityOwnerSetup:!!s.securityOptions?.[target];
   if(!required||(target!=='securityAdmin'&&target!=='securitySettings'&&!!authorizedTargets[target])){action();return;}
   if((target==='securityAdmin'||target==='securitySettings')&&!s.securityOwnerSetup){action();return;}
   pendingSecureActionRef.current=action;setSecureGateRequest({target,title,cancelable:true});
 };
 const routeLock:any={ai:'nora',control:'commandRoom',rgb:'lighting',galaxy:'lighting',music:'musicLibrary',usb:'musicLibrary',equalizer:'musicLibrary'};
 const routeTitle:any={ai:'تأیید برای ورود به نورا',control:'تأیید برای ورود به اتاق فرمان',rgb:'تأیید برای کنترل RGB و نئون',galaxy:'تأیید برای کنترل کهکشانی',music:'تأیید برای ورود به آوای نوا',usb:'تأیید برای ورود به گنجینهٔ USB',equalizer:'تأیید برای ورود به اکولایزر و میکس'};
 const secureTitle=(target:string)=>target==='securityAdmin'?'رمز مشترک · فقط والد مسئول':target==='securitySettings'?'رمز مشترک':SECURITY_TARGETS.find(item=>item.key===target)?.label||'تأیید هویت';
 const navigatePage=(next:PageId)=>{const target=routeLock[next];if(target)requestSecureAction(target,routeTitle[next]||'تأیید هویت',()=>setPage(next));else setPage(next);};
 const finishSecureGate=()=>{const request=secureGateRequest;const target=request?.target;if(target)setAuthorizedTargets(previous=>({...previous,[target]:true}));const queue:string[]=Array.isArray(request?.remainingTargets)?request.remainingTargets:[];if(queue.length){const next=queue[0];setSecureGateRequest({target:next,title:`تأیید دسترسی · ${secureTitle(next)}`,remainingTargets:queue.slice(1),cancelable:false});return;}setSecureGateRequest(null);const action=pendingSecureActionRef.current;pendingSecureActionRef.current=null;if(action)action();};
 const cancelSecureGate=()=>{pendingSecureActionRef.current=null;setSecureGateRequest(null);};
 const resetCredentialSettings=(result?:{policyVersion?:number})=>setS({securityMethod:'pin',securityBiometric:false,securityPinSet:true,securityEnabled:false,familySecurityVersion:result?.policyVersion||s.familySecurityVersion,familySecurityServiceConnected:true,familySecuritySyncedAt:Date.now()});
 useEffect(()=>{if(!storageLoaded)return;AsyncStorage.setItem(STORE,JSON.stringify({state:s,settings})).catch(()=>{})},[s,settings,storageLoaded]);
 useEffect(()=>{
   if(!storageLoaded)return;
   let active=true;
   const apply=(state:any)=>{
     if(!active||!state)return;
     let online:boolean|null=null;
     if(state.isConnected===false||state.isInternetReachable===false)online=false;
     else if(state.isConnected===true&&state.isInternetReachable===true)online=true;
     setState((prev:any)=>prev.networkOnline===online?prev:{...prev,networkOnline:online});
   };
   void Network.getNetworkStateAsync().then(apply).catch(()=>{});
   const subscription=Network.addNetworkStateListener(apply);
   return()=>{active=false;subscription.remove();};
 },[storageLoaded]);
 useEffect(()=>{
   if(!storageLoaded)return;
   let active=true;let busy=false;
   const checkRoute=async()=>{
     if(busy)return;busy=true;
     try{
       const response:any=await AudioRoute.getBluetoothAudioDevices();
       if(!active)return;
       if(!response?.supported){setState((prev:any)=>prev.bluetoothSpeakerConnected===null?prev:{...prev,bluetoothSpeakerConnected:null});return;}
       const expected=String(s.speakerBluetoothName||'Nova');
       const devices=Array.isArray(response.devices)?response.devices:[];
       const match=devices.some((device:any)=>matchesNovaAudioRoute(String(device?.name||''),expected));
       setState((prev:any)=>prev.bluetoothSpeakerConnected===match?prev:{...prev,bluetoothSpeakerConnected:match});
     }catch{if(active)setState((prev:any)=>prev.bluetoothSpeakerConnected===null?prev:{...prev,bluetoothSpeakerConnected:null});}
     finally{busy=false;}
   };
   void checkRoute();const timer=setInterval(()=>void checkRoute(),7000);
   const appStateSub=AppState.addEventListener('change',state=>{if(state==='active')void checkRoute();});
   return()=>{active=false;clearInterval(timer);appStateSub.remove();};
 },[storageLoaded,s.speakerBluetoothName]);
 useEffect(()=>{
   if(!storageLoaded||!s.wifiEsp32||!s.wifiBaseUrl)return;
   let active=true;let busy=false;
   const poll=async()=>{
     if(busy)return;busy=true;
     try{
       const result:any=await WifiEsp32.readStatus(String(s.wifiBaseUrl||''));
       const raw=result?.raw;
       if(active&&raw&&typeof raw==='object'){
         const powerStatus=reportedTelemetryBit(raw,['speakerPower','speaker.power','speaker.isOn','amplifierPower','amp.power','power.speaker']);
         const usb=reportedTelemetryBit(raw,['usbConnected','usb.connected','usb.present','usb.isConnected','usb.status','storage.usbConnected','storage.usb.connected']);
         const ready=reportedTelemetryBit(raw,['deviceReady','ready','system.ready','controller.ready','device.status','system.status']);
         const fault=reportedTelemetryBit(raw,['deviceFault','fault','error','system.fault','controller.fault','health.fault']);
         const batteryLow=reportedTelemetryBit(raw,['batteryLow','battery.low','battery.isLow','power.low','supply.low']);
         setState((prev:any)=>{
           const patch:any={};
           if(powerStatus!==undefined&&prev.devicePowerStatus!==powerStatus)patch.devicePowerStatus=powerStatus;
           if(usb!==undefined&&prev.deviceUsbConnected!==usb)patch.deviceUsbConnected=usb;
           if(ready!==undefined&&prev.deviceReady!==ready)patch.deviceReady=ready;
           if(fault!==undefined&&prev.deviceFault!==fault)patch.deviceFault=fault;
           if(batteryLow!==undefined&&prev.deviceBatteryLow!==batteryLow)patch.deviceBatteryLow=batteryLow;
           return Object.keys(patch).length?{...prev,...patch}:prev;
         });
       }
     }catch{}finally{busy=false;}
   };
   void poll();const timer=setInterval(()=>void poll(),12000);
   return()=>{active=false;clearInterval(timer);};
 },[storageLoaded,s.wifiEsp32,s.wifiBaseUrl]);
 useEffect(()=>{
   if(!storageLoaded)return;
   const current={power:s.devicePowerStatus,wifi:!!s.wifiEsp32,bluetooth:s.bluetoothSpeakerConnected,online:s.networkOnline,usb:s.deviceUsbConnected,ready:s.deviceReady,fault:!!s.deviceFault,batteryLow:s.deviceBatteryLow,childLock:!!s.securityOptions?.childLock};
   const previous=alertStateRef.current;
   alertStateRef.current=current;
   // The initial state is a baseline; never announce stale state during app boot.
   if(!previous)return;
   if(typeof previous.power==='boolean'&&typeof current.power==='boolean'&&previous.power!==current.power)void playSpeakerAudio(current.power?'powerOn':'powerOff');
   if(previous.wifi!==current.wifi)void playSpeakerAudio(current.wifi?'wifiConnected':'wifiDisconnected');
   if(typeof previous.bluetooth==='boolean'&&typeof current.bluetooth==='boolean'&&previous.bluetooth!==current.bluetooth)void playSpeakerAudio(current.bluetooth?'bluetoothConnected':'bluetoothDisconnected');
   if(typeof previous.online==='boolean'&&typeof current.online==='boolean'&&previous.online!==current.online)void playSpeakerAudio(current.online?'online':'offline');
   if(typeof previous.usb==='boolean'&&typeof current.usb==='boolean'&&previous.usb!==current.usb)void playSpeakerAudio(current.usb?'usbConnected':'usbDisconnected');
   if(previous.ready!==true&&current.ready===true)void playSpeakerAudio('deviceReady');
   if(previous.fault!==true&&current.fault===true)void playSpeakerAudio('deviceFault');
   if(previous.batteryLow===false&&current.batteryLow===true)void playSpeakerAudio('batteryLow');
   if(previous.childLock!==current.childLock)void playSpeakerAudio(current.childLock?'childLockOn':'childLockOff');
 },[storageLoaded,s.power,s.wifiEsp32,s.bluetoothSpeakerConnected,s.networkOnline,s.deviceUsbConnected,s.deviceReady,s.deviceFault,s.deviceBatteryLow,s.securityOptions?.childLock,playSpeakerAudio]);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state==='background'){setAuthorizedTargets({});if(s.securityOwnerSetup&&s.securityOptions?.appStart){pendingSecureActionRef.current=null;setSecureGateRequest(null);setAppGateArmed(true);setAppGateUnlocked(false);return;}const needed:string[]=[];if(settingsPage&&s.securityOptions?.imageSettings)needed.push('imageSettings');const pageTarget=routeLock[page];if(pageTarget&&s.securityOptions?.[pageTarget])needed.push(pageTarget);if(page==='control'){const categoryTarget:any={security:'securityAdmin',fuses:'fuses',contacts:'contacts',diagnostics:'diagnostics',lights:'lighting',music:'musicLibrary',equalizer:'musicLibrary',ai:'nora',aiProfile:'nora',sound:'speakerPower',liveMic:'liveMic',cameras:'camera',batteries:'hardwareCore',hardwareCore:'hardwareCore'};const current=categoryTarget[s.controlCategory];if(current&&(current==='securityAdmin'||current==='securitySettings'?!!s.securityOwnerSetup:!!s.securityOptions?.[current]))needed.push(current);}const unique=Array.from(new Set(needed));if(unique.length){pendingSecureActionRef.current=()=>{};const first=unique[0];setSecureGateRequest({target:first,title:`تأیید دسترسی · ${secureTitle(first)}`,remainingTargets:unique.slice(1),cancelable:false});}}});return()=>sub.remove()},[s.securityOwnerSetup,s.securityOptions,s.controlCategory,page,settingsPage]);
 const openSecret=()=>{setSecretSection('door');setPage('secret');};
 if(boot)return <SafeAreaView style={styles.safe}><StartSplash/></SafeAreaView>;
 if(appGateArmed&&s.securityOwnerSetup&&s.securityOptions?.appStart&&!appGateUnlocked)return <SafeAreaView style={styles.safe}><StatusBar style="light" backgroundColor="#070b1c" translucent={false}/><View style={styles.root}><BgView bg={settings.bluetooth} page="bluetooth"/><View style={styles.shade}/><SecurityGate method={s.securityMethod} biometricEnabled={!!s.securityBiometric} title="قفل کامل کوروش نوا" image={CONTROL_ART.lockApp} onUnlock={()=>setAppGateUnlocked(true)} onCancel={()=>{}} onCredentialReset={resetCredentialSettings} onVerifyCredential={FAMILY_SECURITY_CONFIGURED?verifyFamilyCredential:undefined} onVerifyBiometric={FAMILY_SECURITY_CONFIGURED?verifyFamilyBiometricAllowed:undefined} onRequestRecoveryCode={requestFamilyEmailCode} onRecoverCentral={recoverFamilyCredential} cancelable={false}/></View></SafeAreaView>;
 if(secureGateRequest&&settingsPage)return <SafeAreaView style={styles.safe}><StatusBar style="light" backgroundColor="#070b1c" translucent={false}/><View style={styles.root}><BgView bg={settings[page]||settings.bluetooth} page={page==='secret'?'bluetooth':page}/><View style={styles.shade}/><SecurityGate method={s.securityMethod} biometricEnabled={!!s.securityBiometric} title={secureGateRequest?.title||'تأیید هویت'} image={SECURITY_TARGETS.find(x=>x.key===secureGateRequest?.target)?.image||CONTROL_ART.authFamily} onUnlock={finishSecureGate} onCancel={cancelSecureGate} onCredentialReset={resetCredentialSettings} onVerifyCredential={FAMILY_SECURITY_CONFIGURED?verifyFamilyCredential:undefined} onVerifyBiometric={FAMILY_SECURITY_CONFIGURED?verifyFamilyBiometricAllowed:undefined} onRequestRecoveryCode={requestFamilyEmailCode} onRecoverCentral={recoverFamilyCredential} cancelable={secureGateRequest?.cancelable!==false}/></View></SafeAreaView>;
 if(settingsPage)return settingsPage==='music'?<MusicSettings s={s} setS={setS} bg={settings.music} onSave={(b)=>setSettings(x=>({...x,music:b}))} onBack={()=>setSettingsPage(null)}/>:settingsPage==='secret'?<SecretSettings s={s} setS={setS} onBack={()=>setSettingsPage(null)}/>:<PageSettings page={settingsPage} bg={settings[settingsPage]} s={s} setS={setS} onBack={()=>setSettingsPage(null)} onSave={(b)=>{setSettings(x=>({...x,[settingsPage]:b}))}}/>;
 const title=page==='secret'?'اتاق خاطرات خانواده':page==='control'&&s.controlCategory?(CONTROL_CATS.find((x:any)=>x[0]===s.controlCategory)?.[1]||'اتاق فرمان'):labelFor(page);
 return <SafeAreaView style={styles.safe}><StatusBar style="light" backgroundColor="#070b1c" translucent={false}/><View style={styles.root}>
   {page!=='secret'&&<><BgView bg={settings[page]} page={page}/><View style={styles.shade}/>{page!=='equalizer'&&page!=='ai'&&<AnimatedFrame preset={Number(s.pageFramePreset?.[page]||0)}/>}</>}
   {page!=='equalizer'&&page!=='secret'&&<Header page={title} onSettings={()=>requestSecureAction('imageSettings','تأیید برای تنظیمات تصویر و گالری',()=>setSettingsPage(page))} onEqualizer={page==='music'?()=>navigatePage('equalizer'):undefined} s={s}/>}
   <View style={[styles.content,(page==='equalizer'||page==='secret')&&styles.eqFullContent]}>
    {page==='bluetooth'&&<Bluetooth s={s} setS={setS} requestSecureAction={requestSecureAction}/>}
    {page==='usb'&&<UsbPage s={s} setS={setS}/>}
    {page==='music'&&<Music s={s} setS={setS} onSecret={openSecret} onEqualizer={()=>navigatePage('equalizer')}/>}
    {page==='rgb'&&<Rgb s={s} setS={setS}/>}
    {page==='galaxy'&&<Galaxy s={s} setS={setS}/>}
    {page==='ai'&&<Nora s={s} setS={setS} requestSecureAction={requestSecureAction}/>}
    {page==='equalizer'&&<Equalizer s={s} setS={setS} onBack={()=>navigatePage('music')}/>}
    {page==='control'&&<Control s={s} setS={setS} go={navigatePage} requestSecureAction={requestSecureAction} onPreviewSound={(key,source)=>void playSpeakerAudio(key,source,true)} />}
    {page==='secret'&&<Secret s={s} setS={setS} section={secretSection} setSection={setSecretSection} onSettings={()=>requestSecureAction('imageSettings','تأیید برای تنظیمات تصویر و گالری',()=>setSettingsPage('secret'))} onBackMusic={()=>{setPage('music');setSecretSection('door')}}/>}
   </View>
   {page!=='secret'&&page!=='equalizer'&&!(page==='control'&&s.controlCategory)&&<Dock page={page} go={navigatePage} s={s} setS={setS}/>}
   {s.emergencyCameraTrigger&&<CameraPreviewOverlay mode="emergency" s={s} setS={setS} onClose={()=>setS({emergencyCameraTrigger:null})}/>}
 </View>
 <Modal visible={!!secureGateRequest} animationType="fade" transparent={false} onRequestClose={()=>{if(secureGateRequest?.cancelable!==false)cancelSecureGate()}}>
  {secureGateRequest&&<SafeAreaView style={styles.safe}><StatusBar style="light" backgroundColor="#070b1c" translucent={false}/><View style={styles.root}><BgView bg={settings[page]||settings.bluetooth} page={page==='secret'?'bluetooth':page}/><View style={styles.shade}/><SecurityGate method={s.securityMethod} biometricEnabled={!!s.securityBiometric} title={secureGateRequest?.title||'تأیید هویت'} image={SECURITY_TARGETS.find(x=>x.key===secureGateRequest?.target)?.image||CONTROL_ART.authFamily} onUnlock={finishSecureGate} onCancel={cancelSecureGate} onCredentialReset={resetCredentialSettings} onVerifyCredential={FAMILY_SECURITY_CONFIGURED?verifyFamilyCredential:undefined} onVerifyBiometric={FAMILY_SECURITY_CONFIGURED?verifyFamilyBiometricAllowed:undefined} onRequestRecoveryCode={requestFamilyEmailCode} onRecoverCentral={recoverFamilyCredential} cancelable={true}/></View></SafeAreaView>}
 </Modal>
 </SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#130f2b'},root:{flex:1,overflow:'hidden'},eqFullContent:{flex:1,zIndex:2},globalFrameLayer:{...StyleSheet.absoluteFillObject,zIndex:1,elevation:1},
modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.72)',alignItems:'center',justifyContent:'center',padding:18},modalCard:{width:'100%',maxWidth:520,maxHeight:'82%',borderRadius:24,borderWidth:1,borderColor:'rgba(99,232,255,.55)',backgroundColor:'#0c1028',shadowColor:'#63e8ff',shadowOpacity:.35,shadowRadius:24,elevation:15,overflow:'hidden'},modalCardCompact:{width:'100%',maxWidth:370,maxHeight:'38%',borderRadius:22},modalBodyCompact:{paddingVertical:12,paddingHorizontal:8,alignItems:'center',justifyContent:'center'},modalHead:{height:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.12)'},modalTitle:{color:'#fff',fontSize:15,fontWeight:'900'},modalClose:{width:38,height:38,borderRadius:19,borderWidth:1,borderColor:'rgba(255,255,255,.25)',alignItems:'center',justifyContent:'center'},modalBody:{padding:16,gap:10},modalGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},presetIconCard:{width:92,height:82,borderRadius:16,borderWidth:1,backgroundColor:'rgba(8,9,27,.75)',alignItems:'center',justifyContent:'center',gap:4},presetIconCardActive:{backgroundColor:'rgba(99,232,255,.12)',shadowOpacity:.5,shadowRadius:10},modalCardText:{color:'#fff',fontSize:8,fontWeight:'800'},colorPresetGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'},colorPreset:{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:'rgba(255,255,255,.35)'},colorPresetActive:{borderWidth:3,borderColor:'#fff',shadowColor:'#fff',shadowOpacity:.65,shadowRadius:10},galleryMiniButton:{minHeight:50,paddingHorizontal:12,borderRadius:15,borderWidth:1,borderColor:'#63e8ff',backgroundColor:'rgba(99,232,255,.08)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},galleryMiniText:{color:'#fff',fontSize:9,fontWeight:'800'},settingsHero:{alignItems:'center',justifyContent:'center',paddingVertical:14},settingsPageIcon:{width:82,height:82,borderRadius:41,borderWidth:2,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.7)',shadowOpacity:.55,shadowRadius:16},controlHeroIcon:{width:92,height:92,borderRadius:46,borderWidth:2,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.7)',shadowOpacity:.55,shadowRadius:18},detailTop:{flexDirection:'row',alignItems:'center',gap:10},detailIcon:{width:48,height:48,borderRadius:24,borderWidth:1,alignItems:'center',justifyContent:'center'},diagnosticBox:{padding:14,borderRadius:18,borderWidth:1,borderColor:'rgba(99,232,255,.25)',backgroundColor:'rgba(8,9,27,.58)'},securityRow:{minHeight:56,paddingHorizontal:13,borderRadius:18,borderWidth:1,borderColor:'rgba(255,255,255,.18)',backgroundColor:'rgba(8,9,27,.58)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},saveButton:{minHeight:52,borderRadius:17,borderWidth:1,borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.08)',alignItems:'center',justifyContent:'center'},saveButtonText:{color:'#fff',fontSize:10,fontWeight:'900'},splashFrame:{width:150,height:150,borderRadius:75,borderWidth:2,borderColor:'#63e8ff',alignItems:'center',justifyContent:'center',shadowColor:'#63e8ff',shadowOpacity:.55,shadowRadius:28},splashGlow:{position:'absolute',width:130,height:130,borderRadius:65,borderWidth:2,borderColor:'#ff79c8',shadowColor:'#ff79c8',shadowOpacity:.5,shadowRadius:22},splashLogo:{width:108,height:108,borderRadius:54,resizeMode:'contain'},
 
shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,6,20,.22)'},bgOrb:{position:'absolute',width:280,height:280,borderRadius:140,right:-110,top:80,opacity:.26},frameDot:{position:'absolute',width:11,height:11,borderRadius:6,borderWidth:2,backgroundColor:'#fff',shadowOpacity:1,shadowRadius:18,elevation:14},frameDotTrail:{position:'absolute',width:28,height:28,borderRadius:14,borderWidth:1,shadowOpacity:.75,shadowRadius:18,elevation:10},header:{height:157,paddingHorizontal:18,paddingTop:4,zIndex:10,overflow:'visible'},headerCompactAI:{height:Platform.OS==='android'?94:66,paddingTop:Platform.OS==='android'?34:6,overflow:'visible'},headerTopRow:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerLeftAction:{width:50,alignItems:'flex-start'},headerBrandBlock:{alignItems:'flex-end',paddingTop:0,minWidth:150},brand:{color:'#fff',fontSize:18,fontWeight:'900',textAlign:'right'},slogan:{color:'rgba(255,255,255,.84)',fontSize:8,lineHeight:10,textAlign:'right'},headerCenterStage:{alignItems:'center',justifyContent:'flex-start',marginTop:0},headerIconHalo:{width:68,height:68,borderRadius:34,borderWidth:2,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.66)',shadowOpacity:.72,shadowRadius:20,elevation:12},headerCustomImage:{width:56,height:56,resizeMode:'contain',borderRadius:28},pageTitlePlaque:{minWidth:126,minHeight:25,flexDirection:'row',gap:7,paddingHorizontal:14,borderRadius:13,borderWidth:1.5,backgroundColor:'rgba(8,9,27,.88)',alignItems:'center',justifyContent:'center',marginTop:3,shadowOpacity:.55,shadowRadius:12,elevation:7},plaqueIcon:{width:16,height:16,resizeMode:'contain'},pageTitle:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center'},headerHeartbeat:{width:92,height:9,marginTop:1,opacity:.98},headerPulseLine:{width:154,height:5,borderRadius:3,marginTop:6,backgroundColor:'rgba(255,255,255,.08)',overflow:'hidden'},headerPulseCore:{height:3,width:'72%',alignSelf:'center',borderRadius:3,shadowOpacity:1,shadowRadius:9,elevation:5},content:{flex:1,zIndex:2},imageTopButton:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.72)',borderWidth:1.5,borderColor:'rgba(255,255,255,.25)',shadowOpacity:.5,shadowRadius:12,elevation:8},topButtonImage:{width:26,height:26,resizeMode:'contain'},actionImage:{resizeMode:'contain'},iconButtonWrap:{alignItems:'center',justifyContent:'center',minWidth:58},iconButton:{alignItems:'center',justifyContent:'center',backgroundColor:'rgba(10,10,30,.58)',borderWidth:1,borderColor:'rgba(255,255,255,.36)',shadowColor:'#6feaff',shadowOpacity:.35,shadowRadius:12,elevation:7},iconButtonLabel:{fontSize:8,fontWeight:'900',marginTop:3,textAlign:'center'},iconActive:{backgroundColor:'rgba(123,83,225,.72)',borderColor:'#fff'},pressed:{opacity:.65,transform:[{scale:.94}]},heroCircle:{alignSelf:'center',width:190,height:190,borderRadius:95,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,12,34,.5)',borderWidth:2,borderColor:'rgba(255,255,255,.55)',shadowColor:'#58eaff',shadowOpacity:.6,shadowRadius:30,elevation:15},heroStatus:{color:'#fff',fontSize:11,marginTop:8},btPowerCluster:{height:190,alignItems:'center',justifyContent:'center',marginTop:4},btRing:{position:'absolute',borderWidth:2,shadowOpacity:.45,shadowRadius:18},btCore:{width:108,height:108,borderRadius:54,borderWidth:2,alignItems:'center',justifyContent:'center',shadowOpacity:.65,shadowRadius:28,elevation:15},btWifiStatusCard:{marginTop:14,minHeight:68,borderRadius:20,borderWidth:1,borderColor:'rgba(99,232,255,.30)',backgroundColor:'rgba(7,12,30,.72)',paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:11},btWifiStatusIcon:{width:28,height:28,resizeMode:'contain'},btCoreIcon:{width:56,height:56,resizeMode:'contain'},btDeviceIcon:{width:24,height:24,resizeMode:'contain'},btStatusLed:{width:9,height:9,borderRadius:5,shadowOpacity:.9,shadowRadius:9},btConnectionHint:{color:'rgba(255,255,255,.76)',fontSize:11,textAlign:'center',marginTop:2},actionRow:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:20,marginTop:18,marginBottom:12,flexWrap:'nowrap'},pad:{padding:16,paddingBottom:34},optionList:{gap:9,marginTop:12},option:{minHeight:66,paddingHorizontal:13,borderRadius:20,backgroundColor:'rgba(9,10,28,.58)',borderWidth:1,borderColor:'rgba(255,255,255,.20)',flexDirection:'row',alignItems:'center',gap:12},optionActive:{backgroundColor:'rgba(118,77,214,.48)',borderColor:'rgba(255,255,255,.75)'},optionCustomArt:{width:34,height:34},optionIcon:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.10)',borderWidth:1,borderColor:'rgba(255,255,255,.22)'},optionLabel:{color:'#fff',fontSize:13,fontWeight:'800'},muted:{color:'rgba(255,255,255,.62)',fontSize:10,lineHeight:17},sectionTitle:{color:'#fff',fontSize:22,fontWeight:'900',marginBottom:10},trackName:{color:'#fff',fontSize:20,fontWeight:'900',textAlign:'center',marginTop:14},musicArtwork:{width:240,height:240,borderRadius:120,alignSelf:'center',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(9,10,30,.48)',borderWidth:2,borderColor:'rgba(255,255,255,.48)',shadowColor:'#ff67cf',shadowOpacity:.7,shadowRadius:35,elevation:18},musicArtworkSpin:{width:214,height:214,borderRadius:107,overflow:'hidden'},musicArtworkImage:{width:'100%',height:'100%'},musicArtworkEffect:{position:'absolute',width:214,height:214,borderRadius:107,opacity:.28},musicArtworkCore:{position:'absolute',width:62,height:62,borderRadius:31,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(5,8,25,.72)',borderWidth:1,borderColor:'rgba(255,255,255,.55)'},framePresetGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:10,marginTop:8},framePresetCard:{width:140,minHeight:110,padding:9,borderRadius:18,borderWidth:1,backgroundColor:'rgba(8,9,27,.78)',alignItems:'center',justifyContent:'center',gap:6,position:'relative'},framePresetCardActive:{borderWidth:2,shadowColor:'#72ffc5',shadowOpacity:.45,shadowRadius:12},framePresetPreview:{width:96,height:58,borderRadius:17,borderWidth:2,backgroundColor:'rgba(5,7,20,.9)',alignItems:'center',justifyContent:'center',shadowOpacity:.45,shadowRadius:10},framePresetPreviewInner:{width:84,height:46,borderRadius:13,borderWidth:1},musicSettingsHero:{alignSelf:'center',width:190,height:190,borderRadius:95,overflow:'hidden',borderWidth:2,borderColor:'rgba(255,255,255,.45)',marginVertical:14},musicSettingsHeroImage:{width:'100%',height:'100%'},musicSettingTitle:{color:'#fff',fontSize:16,fontWeight:'900',marginTop:18,marginBottom:10},musicPresetRail:{gap:10,paddingVertical:6},musicPresetOrb:{width:82,height:82,borderRadius:41,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.22)'},musicPresetOrbActive:{borderWidth:2,borderColor:'#fff',shadowColor:'#fff',shadowOpacity:.65,shadowRadius:12},musicPresetOrbImage:{width:'100%',height:'100%'},musicEffectSettingsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:10},musicEffectSettingCard:{width:94,borderRadius:18,overflow:'hidden',backgroundColor:'rgba(8,9,27,.58)',borderWidth:1,borderColor:'rgba(255,255,255,.18)',paddingBottom:6},musicEffectSettingActive:{borderWidth:2,borderColor:'#fff',shadowColor:'#fff',shadowOpacity:.6,shadowRadius:10},musicEffectSettingImage:{width:'100%',height:72},musicEffectSettingLabel:{color:'#fff',fontSize:9,fontWeight:'800',textAlign:'center',marginTop:5},musicOrbit:{position:'absolute',width:260,height:110,borderRadius:150,borderWidth:2,borderColor:'rgba(84,231,255,.65)',transform:[{rotate:'-18deg'}]},grid:{gap:10},tabs:{height:62,flexDirection:'row',paddingHorizontal:8,gap:7,zIndex:5},tab:{flex:1,borderRadius:18,backgroundColor:'rgba(10,10,30,.48)',borderWidth:1,borderColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center',gap:3},tabActive:{backgroundColor:'rgba(115,75,218,.7)',borderColor:'#fff'},tabText:{color:'#fff',fontSize:10,fontWeight:'800'},lightHero:{height:145,borderRadius:26,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(10,10,30,.45)',borderWidth:1,borderColor:'rgba(255,255,255,.22)'},rgbPowerStage:{minHeight:164,borderRadius:28,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(7,9,27,.55)',borderWidth:1,borderColor:'rgba(255,255,255,.18)',paddingVertical:10,marginBottom:8},effectGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:11,marginTop:18},effectGridWide:{flexDirection:'row',flexWrap:'wrap',gap:7,justifyContent:'center',marginTop:14},slider:{marginTop:20,padding:14,borderRadius:18,backgroundColor:'rgba(8,9,27,.48)',borderWidth:1,borderColor:'rgba(255,255,255,.18)'},sliderHead:{flexDirection:'row',justifyContent:'space-between'},sliderTrack:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14},sliderDot:{width:8,height:8,borderRadius:4,backgroundColor:'rgba(255,255,255,.18)'},sliderDotOn:{backgroundColor:'#fff',shadowColor:'#fff',shadowOpacity:.9,shadowRadius:5},colorWheel:{width:235,height:235,borderRadius:118,borderWidth:24,alignSelf:'center',alignItems:'center',justifyContent:'center',marginTop:12,shadowColor:'#fff',shadowOpacity:.35,shadowRadius:30},colorWheelInner:{width:135,height:135,borderRadius:68,backgroundColor:'rgba(8,8,25,.82)',alignItems:'center',justifyContent:'center'},colorDot:{width:58,height:58,borderRadius:29,borderWidth:2,borderColor:'#fff'},swatches:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:11,marginTop:20},swatch:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'rgba(255,255,255,.65)'},neonHero:{height:190,borderRadius:24,overflow:'hidden',backgroundColor:'rgba(5,7,22,.55)',borderWidth:1,borderColor:'rgba(255,255,255,.24)',alignItems:'center',justifyContent:'center'},neonHeroImg:{width:'100%',height:'100%'},gifCard:{width:'18%',minWidth:55,aspectRatio:1,borderRadius:13,overflow:'hidden',backgroundColor:'rgba(5,7,22,.55)',borderWidth:1,borderColor:'rgba(255,255,255,.18)'},gifSelected:{borderWidth:2,borderColor:'#fff',shadowColor:'#fff',shadowOpacity:.8,shadowRadius:9},gifImg:{width:'100%',height:'100%'},noraOrb:{alignSelf:'center',width:170,height:170,borderRadius:85,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(121,75,220,.45)',borderWidth:2,borderColor:'rgba(255,255,255,.55)',marginBottom:20},input:{marginTop:16,minHeight:52,borderRadius:18,borderWidth:1,borderColor:'rgba(255,255,255,.24)',backgroundColor:'rgba(8,9,27,.55)',paddingHorizontal:15,color:'#fff'},eqPresetGrid:{gap:8},controlHero:{alignItems:'center',paddingVertical:8,marginBottom:8},secretHero:{alignItems:'center',paddingVertical:20},secretHeroIcon:{width:92,height:92,borderRadius:46,borderWidth:2,borderColor:'#ff79c8',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,121,200,.08)',shadowColor:'#ff79c8',shadowOpacity:.6,shadowRadius:24,elevation:12},secretSettingsButton:{marginTop:16,minHeight:54,paddingHorizontal:18,borderRadius:20,borderWidth:1,backgroundColor:'rgba(8,9,27,.58)',flexDirection:'row',alignItems:'center',gap:10,shadowOpacity:.35,shadowRadius:14},settingsPage:{flex:1,backgroundColor:'#120f29'},usbHero:{minHeight:92,padding:13,borderRadius:24,borderWidth:1,borderColor:'rgba(255,209,102,.42)',backgroundColor:'rgba(7,9,25,.68)',flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#ffd166',shadowOpacity:.18,shadowRadius:18},usbHeroIcon:{width:64,height:64,borderRadius:20,borderWidth:1.5,borderColor:'#ffd166',backgroundColor:'rgba(255,209,102,.08)',alignItems:'center',justifyContent:'center',shadowColor:'#ffd166',shadowOpacity:.55,shadowRadius:16},usbHeroTitle:{color:'#fff',fontSize:18,fontWeight:'900'},usbLed:{width:10,height:10,borderRadius:5,shadowOpacity:.9,shadowRadius:10},usbTopActions:{gap:8,marginTop:10},usbTabs:{flexDirection:'row',gap:7,marginTop:12},usbTab:{flex:1,minHeight:54,borderRadius:17,borderWidth:1,borderColor:'rgba(255,209,102,.36)',backgroundColor:'rgba(7,9,25,.64)',alignItems:'center',justifyContent:'center',gap:3},usbTabActive:{backgroundColor:'#ffd166',borderColor:'#fff',shadowColor:'#ffd166',shadowOpacity:.65,shadowRadius:12},usbTabText:{color:'#fff',fontSize:9,fontWeight:'900'},usbNowCard:{marginTop:12,padding:12,borderRadius:24,borderWidth:1.5,borderColor:'#ffd166',backgroundColor:'rgba(7,9,25,.72)',shadowColor:'#ffd166',shadowOpacity:.28,shadowRadius:20},usbNowTitle:{color:'#fff',fontSize:15,fontWeight:'900',textAlign:'center',marginBottom:7},usbWaveStage:{height:112,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3,overflow:'hidden',position:'relative',borderRadius:18,backgroundColor:'rgba(0,0,0,.22)'},usbWaveBar:{width:5,minHeight:7,borderRadius:3,shadowOpacity:.75,shadowRadius:7},usbWaveGlow:{position:'absolute',left:'10%',right:'10%',height:5,borderRadius:3,shadowOpacity:.9,shadowRadius:18},usbTransportRow:{flexDirection:'row',justifyContent:'center',gap:14,marginTop:10},usbTransportButton:{width:82,minHeight:72,borderWidth:1.5,borderRadius:22,backgroundColor:'rgba(7,9,25,.84)',alignItems:'center',justifyContent:'center',gap:3,shadowOpacity:.45,shadowRadius:12},usbTransportIcon:{width:42,height:42,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},usbTransportLabel:{fontSize:8,fontWeight:'900'},usbBackFolder:{marginTop:10,minHeight:50,borderRadius:17,borderWidth:1,borderColor:'rgba(255,209,102,.38)',backgroundColor:'rgba(7,9,25,.62)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},usbFileRow:{minHeight:70,paddingHorizontal:12,borderRadius:19,borderWidth:1,borderColor:'rgba(255,255,255,.18)',backgroundColor:'rgba(7,9,25,.62)',flexDirection:'row',alignItems:'center',gap:11},usbFileActive:{borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.10)',shadowColor:'#72ffc5',shadowOpacity:.25,shadowRadius:12},usbFileIcon:{width:46,height:46,borderRadius:15,borderWidth:1,backgroundColor:'rgba(255,255,255,.06)',alignItems:'center',justifyContent:'center'},usbEmpty:{marginTop:18,padding:26,borderRadius:24,borderWidth:1,borderColor:'rgba(255,209,102,.28)',backgroundColor:'rgba(7,9,25,.58)',alignItems:'center',justifyContent:'center',gap:8},usbEmptyTitle:{color:'#fff',fontSize:16,fontWeight:'900',textAlign:'center'},usbSettingsBox:{marginTop:12,padding:11,borderRadius:20,borderWidth:1,borderColor:'rgba(255,209,102,.35)',backgroundColor:'rgba(7,9,25,.52)'},usbSettingsTitle:{color:'#ffd166',fontSize:15,fontWeight:'900',marginBottom:8,textAlign:'center'},usbSettingsRow:{flexDirection:'row',gap:8,marginTop:8},settingsActions:{gap:9,marginTop:14},bgGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},bgChoice:{width:'31%',height:82,borderRadius:16,overflow:'hidden',padding:9,justifyContent:'flex-end',borderWidth:1,borderColor:'rgba(255,255,255,.24)'},bgFullImage:{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%'},bgChoiceShade:{position:'absolute',left:0,right:0,bottom:0,height:34,backgroundColor:'rgba(0,0,0,.34)'},selectionTick:{width:19,height:19,borderRadius:10,backgroundColor:'#72ffc5',alignItems:'center',justifyContent:'center',shadowColor:'#72ffc5',shadowOpacity:.9,shadowRadius:8},bgChoiceSelected:{borderWidth:2,borderColor:'#fff'},bgGifThumb:{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%',opacity:.82},bgChoiceGlow:{position:'absolute',width:100,height:100,borderRadius:50,right:-35,top:-30,opacity:.8},bgName:{color:'#fff',fontSize:9,fontWeight:'800'},splash:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#050713',overflow:'hidden'},splashSelectedShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(4,5,18,.10)'},splashCity:{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%'},splashCityFill:{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%',opacity:.72},splashCityFillShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(2,4,16,.28)'},splashLeftBlock:{alignItems:'flex-start'},splashRightBlock:{alignItems:'flex-end'},splashLogoStage:{position:'absolute',left:0,right:0,top:'25%',height:410,alignItems:'center',justifyContent:'center',zIndex:7},splashLogoSpinLayer:{width:350,height:350,alignItems:'center',justifyContent:'center',backfaceVisibility:'hidden'},splashLogoReal:{width:340,height:340},splashFamilyTextOverlay:{position:'absolute',left:'15%',right:'15%',bottom:'9.5%',height:'15%',alignItems:'center',justifyContent:'center',zIndex:8,paddingHorizontal:22},splashFamilyTitle:{color:'#fff',fontSize:17,fontWeight:'900',textAlign:'center',textShadowColor:'#ff79c8',textShadowRadius:12},splashFamilyText:{color:'#fff',fontSize:11,fontWeight:'700',lineHeight:20,textAlign:'center',marginTop:7,textShadowColor:'#63e8ff',textShadowRadius:8},splashFlower:{color:'#ffd166',fontSize:22,textShadowColor:'#ff79c8',textShadowRadius:10},splashFamilyCornerTL:{position:'absolute',left:7,top:5},splashFamilyCornerTR:{position:'absolute',right:7,top:5},splashFamilyCornerBL:{position:'absolute',left:7,bottom:5},splashFamilyCornerBR:{position:'absolute',right:7,bottom:5},dock:{height:68,width:'100%',paddingHorizontal:5,paddingBottom:15,transform:[{translateY:-11}],gap:4,flexDirection:'row',alignItems:'center',justifyContent:'space-between',zIndex:20},dockItem:{height:52,flex:1,minWidth:0,paddingHorizontal:2,borderRadius:20,backgroundColor:'rgba(8,9,27,.66)',borderWidth:1,borderColor:'rgba(255,255,255,.22)',alignItems:'center',justifyContent:'center'},dockItemActive:{backgroundColor:'rgba(111,73,215,.76)',borderColor:'#fff'},dockIconRing:{width:35,height:35,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center',shadowOpacity:.4,shadowRadius:8},navImage:{width:22,height:22},dockLabel:{color:'#fff',fontSize:7,fontWeight:'800',marginTop:2,textAlign:'center',includeFontPadding:false},cornerSettings:{position:'absolute',right:10,top:104,width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(10,10,30,.55)',borderWidth:1,borderColor:'rgba(255,255,255,.25)',zIndex:30},
 galaxyTopPreviewPad:{padding:12,paddingBottom:28},galaxyTopThird:{alignItems:'center',justifyContent:'center',minHeight:250,paddingBottom:8},galaxySpeakerPreview:{width:270,height:235,borderWidth:2,borderRadius:38,backgroundColor:'rgba(7,10,31,.82)',padding:12,shadowOpacity:.72,shadowRadius:26,elevation:15,overflow:'hidden'},galaxySpeakerTop:{height:30,borderBottomWidth:1,alignItems:'center',justifyContent:'center'},galaxySpeakerBrand:{flexDirection:'row',alignItems:'center',gap:6},galaxySpeakerBrandText:{color:'rgba(255,255,255,.8)',fontSize:8,fontWeight:'900',letterSpacing:1.3},galaxyFiberField:{flex:1,marginVertical:8,borderWidth:1,borderRadius:34,alignItems:'center',justifyContent:'center',overflow:'hidden'},galaxyFiberHalo:{position:'absolute',width:190,height:80,borderRadius:80,borderWidth:2,shadowOpacity:.55,shadowRadius:18},galaxySpeakerCore:{width:72,height:72,borderRadius:36,borderWidth:2,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(5,8,25,.76)',shadowOpacity:.8,shadowRadius:18},galaxySpeakerBottom:{height:24,borderTopWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},galaxyPort:{width:9,height:9,borderRadius:5,shadowOpacity:.9,shadowRadius:8},galaxyLiveBadge:{marginTop:5,flexDirection:'row',alignItems:'center',gap:7},galaxyLiveDot:{width:8,height:8,borderRadius:4,shadowOpacity:.9,shadowRadius:7},djEntryCard:{marginTop:18,marginBottom:8,borderRadius:24,borderWidth:1,borderColor:"rgba(255,209,102,.55)",backgroundColor:"rgba(12,12,30,.82)",overflow:"hidden",shadowColor:"#ffd166",shadowOpacity:.32,shadowRadius:16,elevation:8},djEntryGlow:{position:"absolute",left:0,right:0,top:0,height:2,backgroundColor:"#ffd166",opacity:.85},djHero:{alignItems:'center',paddingVertical:10},eqBandRow:{flexDirection:'row',justifyContent:'space-around',alignItems:'flex-end',marginTop:22,paddingVertical:12,borderRadius:22,backgroundColor:'rgba(8,9,27,.48)',borderWidth:1,borderColor:'rgba(255,255,255,.18)'},eqBand:{width:'22%',alignItems:'center'},eqBandValue:{color:'#fff',fontSize:11,fontWeight:'900',marginBottom:7},eqVerticalTrack:{height:150,width:34,justifyContent:'space-between',alignItems:'center',paddingVertical:4},eqTick:{width:26,height:7,borderRadius:4,backgroundColor:'rgba(255,255,255,.14)'},eqTickOn:{backgroundColor:'#64f5ff',shadowColor:'#64f5ff',shadowOpacity:.9,shadowRadius:6},eqBandLabel:{color:'rgba(255,255,255,.75)',fontSize:9,fontWeight:'800',marginTop:7},eqVisualizer:{marginTop:20,height:150,borderRadius:22,backgroundColor:'rgba(8,9,27,.55)',borderWidth:1,borderColor:'rgba(100,245,255,.25)',alignItems:'center',justifyContent:'center'},eqVisualizerBars:{height:100,flexDirection:'row',alignItems:'flex-end',gap:4},eqVisualizerBar:{width:8,borderRadius:4,backgroundColor:'#64f5ff',shadowColor:'#64f5ff',shadowOpacity:.8,shadowRadius:8},liveMicPanel:{gap:12,paddingBottom:20},liveMicHero:{alignItems:'center',padding:14,borderRadius:22,borderWidth:1,borderColor:'rgba(99,232,255,.35)',backgroundColor:'rgba(5,9,27,.9)',gap:7,shadowColor:'#63e8ff',shadowOpacity:.22,shadowRadius:16},liveMicGlow:{width:196,height:196,borderRadius:98,borderWidth:2,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,8,24,.78)',shadowOpacity:.75,shadowRadius:24,elevation:8},liveMicHeroImage:{width:185,height:185},liveMicTitle:{color:'#fff',fontSize:16,fontWeight:'900',textAlign:'center'},liveMicText:{color:'rgba(255,255,255,.68)',fontSize:9,lineHeight:15,textAlign:'center',maxWidth:420},liveMicSectionTitle:{color:'#ffd166',fontSize:12,fontWeight:'900',textAlign:'right',marginTop:2},liveMicTransportGrid:{flexDirection:'row',gap:8},liveMicTransportCard:{flex:1,minHeight:122,borderRadius:18,borderWidth:1,padding:7,alignItems:'center',justifyContent:'center',gap:5,backgroundColor:'rgba(6,9,27,.88)',shadowOpacity:.2,shadowRadius:10},liveMicTransportActive:{borderWidth:2,backgroundColor:'rgba(114,255,197,.09)',shadowOpacity:.55,shadowRadius:15},liveMicTransportImage:{width:66,height:66},liveMicTransportLabel:{color:'#fff',fontSize:9,fontWeight:'900',textAlign:'center'},liveMicMainButton:{minHeight:66,borderRadius:20,borderWidth:1.5,backgroundColor:'rgba(7,10,27,.9)',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:9,shadowOpacity:.55,shadowRadius:17,elevation:6},liveMicButtonImage:{width:52,height:52},liveMicMainText:{color:'#fff',fontSize:12,fontWeight:'900'},liveMicSettingsCard:{flexDirection:'row-reverse',alignItems:'center',gap:9,padding:10,borderRadius:18,borderWidth:1,borderColor:'rgba(99,232,255,.28)',backgroundColor:'rgba(7,10,27,.86)'},liveMicSettingsImage:{width:62,height:62},liveMicSettingsTitle:{color:'#63e8ff',fontSize:10,fontWeight:'900',textAlign:'right'},liveMicSettingsText:{color:'rgba(255,255,255,.57)',fontSize:8,lineHeight:13,textAlign:'right'},liveMicNote:{flexDirection:'row-reverse',alignItems:'center',gap:8,padding:10,borderRadius:15,borderWidth:1,borderColor:'rgba(255,209,102,.24)',backgroundColor:'rgba(255,209,102,.05)'},liveMicNoteImage:{width:54,height:54},liveMicNoteText:{flex:1,color:'rgba(255,255,255,.62)',fontSize:8,lineHeight:14,textAlign:'right'},deviceStatusList:{gap:9},deviceStatusCard:{minHeight:105,borderRadius:19,borderWidth:1,backgroundColor:'rgba(7,10,27,.88)',padding:9,flexDirection:'row-reverse',alignItems:'center',gap:11,shadowOpacity:.20,shadowRadius:10,elevation:3},deviceStatusArtFrame:{width:80,height:80,borderRadius:16,borderWidth:1,backgroundColor:'rgba(2,5,18,.92)',alignItems:'center',justifyContent:'center',shadowOpacity:.35,shadowRadius:10,flexShrink:0},deviceStatusArt:{width:75,height:75},deviceStatusTextBlock:{flex:1,minWidth:0,gap:3},deviceStatusTitle:{color:'#fff',fontSize:12,fontWeight:'900',textAlign:'right'},deviceStatusDesc:{color:'rgba(255,255,255,.62)',fontSize:9,lineHeight:14,textAlign:'right'},deviceStatusLine:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginTop:4},deviceStatusLed:{width:10,height:10,borderRadius:5,borderWidth:1,borderColor:'rgba(255,255,255,.4)',shadowOpacity:.85,shadowRadius:8},deviceStatusLabel:{fontSize:9,fontWeight:'900',textAlign:'right'},fuseStatusIntro:{flexDirection:'row-reverse',alignItems:'center',gap:10,padding:12,borderRadius:18,borderWidth:1,borderColor:'rgba(255,209,102,.3)',backgroundColor:'rgba(7,10,27,.86)'},fuseStatusIntroIcon:{width:76,height:76,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(2,5,18,.8)'},fuseStatusIntroArt:{width:68,height:68},fuseStatusIntroTitle:{color:'#ffd166',fontSize:13,fontWeight:'900',textAlign:'right',marginBottom:4},fuseStatusIntroText:{color:'rgba(255,255,255,.7)',fontSize:9,lineHeight:15,textAlign:'right'},deviceStatusHeading:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',marginTop:2},deviceStatusSectionTitle:{color:'#fff',fontSize:13,fontWeight:'900',textAlign:'right'},deviceStatusSectionHint:{color:'rgba(255,255,255,.53)',fontSize:8,fontWeight:'800'},fuseStatusFooter:{padding:11,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,.13)',backgroundColor:'rgba(7,10,27,.75)',gap:9},fuseStatusFooterText:{color:'rgba(255,255,255,.62)',fontSize:8,lineHeight:14,textAlign:'center'},fuseRefreshButton:{minHeight:43,paddingHorizontal:12,borderRadius:14,backgroundColor:'#72ffc5',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7},fuseRefreshText:{color:'#06111a',fontSize:10,fontWeight:'900'},speakerSoundPanel:{gap:11,paddingBottom:18},speakerSoundHero:{flexDirection:'row-reverse',alignItems:'center',gap:8,padding:9,borderRadius:20,borderWidth:1,borderColor:'rgba(99,232,255,.38)',backgroundColor:'rgba(5,9,27,.91)',shadowColor:'#63e8ff',shadowOpacity:.22,shadowRadius:13,elevation:4},speakerSoundHeroArt:{width:82,height:91,flexShrink:0},speakerSoundHeroTitle:{color:'#fff',fontSize:13,fontWeight:'900',textAlign:'right'},speakerSoundHeroText:{color:'rgba(255,255,255,.64)',fontSize:9,lineHeight:15,textAlign:'right'},speakerSoundHeroActions:{flexDirection:'row-reverse',flexWrap:'wrap',gap:6,marginTop:4},speakerSoundMasterButton:{minHeight:38,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:7,borderRadius:12,borderWidth:1,backgroundColor:'rgba(9,15,35,.96)',flexGrow:1},speakerSoundMiniArt:{width:26,height:26},speakerSoundMasterText:{fontSize:9,fontWeight:'900'},speakerSoundSettingsButton:{minHeight:38,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:4,paddingHorizontal:6,borderRadius:12,borderWidth:1,borderColor:'rgba(178,140,255,.52)',backgroundColor:'rgba(178,140,255,.08)'},speakerSoundSettingsText:{color:'#d2bdff',fontSize:9,fontWeight:'900'},speakerSoundSectionTitleRow:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:4},speakerSoundSectionTitle:{color:'#fff',fontSize:12,fontWeight:'900',textAlign:'right',marginVertical:7},speakerSoundHint:{color:'rgba(255,255,255,.48)',fontSize:8,fontWeight:'800'},speakerSoundEventList:{gap:8},speakerSoundEventCard:{minHeight:93,flexDirection:'row-reverse',alignItems:'center',gap:8,padding:8,borderRadius:17,borderWidth:1,backgroundColor:'rgba(5,8,25,.92)',shadowOpacity:.16,shadowRadius:9,elevation:3},speakerSoundEventArtFrame:{width:67,height:67,borderRadius:14,borderWidth:1,backgroundColor:'rgba(2,5,18,.93)',alignItems:'center',justifyContent:'center',flexShrink:0},speakerSoundEventArt:{width:63,height:63},speakerSoundEventText:{flex:1,minWidth:0,gap:3},speakerSoundEventTitle:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'right'},speakerSoundEventDesc:{color:'rgba(255,255,255,.56)',fontSize:8,lineHeight:12,textAlign:'right'},speakerSoundCurrent:{fontSize:8,fontWeight:'900',textAlign:'right',marginTop:1},speakerSoundEventRight:{width:21,alignItems:'center',justifyContent:'center',gap:7},speakerSoundFooter:{flexDirection:'row-reverse',alignItems:'center',gap:8,padding:10,borderRadius:15,borderWidth:1,borderColor:'rgba(255,209,102,.25)',backgroundColor:'rgba(255,209,102,.045)'},speakerSoundFooterArt:{width:54,height:54},speakerSoundFooterText:{flex:1,color:'rgba(255,255,255,.62)',fontSize:8,lineHeight:14,textAlign:'right'},speakerSoundModalHero:{flexDirection:'row-reverse',alignItems:'center',gap:9,padding:9,borderRadius:17,borderWidth:1,borderColor:'rgba(99,232,255,.32)',backgroundColor:'rgba(5,9,27,.82)',marginBottom:8},speakerSoundModalHeroArt:{width:73,height:73},speakerSoundModalTitle:{color:'#fff',fontSize:12,fontWeight:'900',textAlign:'right'},speakerSoundModalText:{color:'rgba(255,255,255,.62)',fontSize:8,lineHeight:13,textAlign:'right'},speakerSoundPhonePreview:{flexDirection:'row-reverse',alignItems:'center',gap:8,padding:9,minHeight:68,borderRadius:16,borderWidth:1,borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.08)',marginBottom:8},speakerSoundActionArt:{width:48,height:48,flexShrink:0},speakerSoundActionTitle:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'right'},speakerSoundActionDesc:{color:'rgba(255,255,255,.58)',fontSize:8,lineHeight:13,textAlign:'right',marginTop:2},speakerSoundPresetGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8},speakerSoundPresetCard:{width:'48.5%',minHeight:203,borderRadius:16,borderWidth:1,padding:7,alignItems:'center',justifyContent:'space-between',backgroundColor:'rgba(5,8,26,.92)',shadowOpacity:.2,shadowRadius:10,elevation:3},speakerSoundPresetCardActive:{borderWidth:2,backgroundColor:'rgba(114,255,197,.075)',shadowOpacity:.52,shadowRadius:14},speakerSoundPresetArt:{width:92,height:82},speakerSoundPresetName:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center',minHeight:24},speakerSoundPresetActions:{width:'100%',flexDirection:'row',justifyContent:'space-between',gap:5},speakerSoundPresetPreview:{flex:1,minHeight:35,borderRadius:10,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3,paddingHorizontal:4},speakerSoundPresetChoose:{flex:1,minHeight:35,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,.28)',backgroundColor:'rgba(255,255,255,.055)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3,paddingHorizontal:4},speakerSoundPresetChooseActive:{borderColor:'#72ffc5',backgroundColor:'#72ffc5'},speakerSoundPresetButtonText:{fontSize:8,fontWeight:'900'},speakerSoundFileButton:{flexDirection:'row-reverse',alignItems:'center',gap:8,minHeight:74,padding:9,borderRadius:16,borderWidth:1,borderColor:'#63e8ff',backgroundColor:'rgba(99,232,255,.06)',marginTop:10},speakerSoundMuteButton:{flexDirection:'row-reverse',alignItems:'center',gap:8,minHeight:70,padding:9,borderRadius:16,borderWidth:1,borderColor:'rgba(255,121,200,.57)',backgroundColor:'rgba(255,121,200,.065)',marginTop:8},speakerSoundVolumeGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'space-between'},speakerSoundVolumeCard:{width:'48%',minHeight:112,borderRadius:16,borderWidth:1,borderColor:'rgba(99,232,255,.45)',backgroundColor:'rgba(5,8,26,.9)',alignItems:'center',justifyContent:'center',padding:8,gap:3},speakerSoundVolumeCardActive:{borderColor:'#72ffc5',borderWidth:2,backgroundColor:'rgba(114,255,197,.09)'},speakerSoundVolumeArt:{width:48,height:42},speakerSoundVolumeName:{color:'#fff',fontSize:10,fontWeight:'900'},speakerSoundVolumePct:{color:'#72ffc5',fontSize:9,fontWeight:'900'},speakerSoundMasterEnable:{minHeight:47,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:8,padding:10,borderRadius:14,backgroundColor:'#72ffc5',marginTop:10},speakerSoundMasterEnableText:{color:'#06111a',fontSize:10,fontWeight:'900'},speakerSoundBluetoothCard:{flexDirection:'row-reverse',alignItems:'center',gap:8,padding:9,borderRadius:16,borderWidth:1,borderColor:'rgba(99,232,255,.38)',backgroundColor:'rgba(5,9,27,.86)',marginTop:10},speakerSoundBtCheck:{minHeight:49,borderRadius:13,borderWidth:1,borderColor:'#63e8ff',backgroundColor:'rgba(99,232,255,.065)',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:8,padding:8,marginTop:8},speakerSoundBluetoothHint:{color:'rgba(255,255,255,.6)',fontSize:8,lineHeight:13,textAlign:'right',paddingHorizontal:4},securityOwnerGateWrap:{minHeight:480,borderRadius:19,borderWidth:1,borderColor:'rgba(99,232,255,.32)',backgroundColor:'rgba(5,8,25,.92)',overflow:'hidden'},childLockStatusCard:{flexDirection:'row-reverse',alignItems:'center',gap:8,padding:9,borderRadius:16,borderWidth:1,borderColor:'rgba(255,209,102,.48)',backgroundColor:'rgba(255,209,102,.07)'},childLockStatusArt:{width:60,height:60},childLockStatusTitle:{color:'#ffd166',fontSize:10,fontWeight:'900',textAlign:'right',marginBottom:4},childLockRetryButton:{minHeight:49,paddingHorizontal:10,borderRadius:14,borderWidth:1,borderColor:'#ffd166',backgroundColor:'rgba(255,209,102,.07)',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7},securityPanelRoot:{gap:11,paddingBottom:18},securityGearButton:{minWidth:66,minHeight:68,paddingHorizontal:6,paddingVertical:5,borderRadius:13,borderWidth:1,borderColor:'rgba(178,140,255,.65)',backgroundColor:'rgba(178,140,255,.08)',alignItems:'center',justifyContent:'center',gap:2},securityGearArt:{width:36,height:36},securityGearText:{color:'#b28cff',fontSize:8,fontWeight:'900'},securitySettingsBack:{minHeight:46,paddingHorizontal:8,borderRadius:13,borderWidth:1,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:4},securitySettingsBackText:{color:'#b28cff',fontSize:9,fontWeight:'900'},securitySettingsForm:{gap:9,padding:12,borderRadius:18,borderWidth:1,borderColor:'rgba(99,232,255,.32)',backgroundColor:'rgba(4,8,24,.82)'},securitySettingsSecondary:{minHeight:40,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:'rgba(99,232,255,.4)',padding:8},securitySettingsSecondaryText:{color:'#63e8ff',fontSize:9,fontWeight:'900'},securityMiniAction:{minHeight:38,paddingHorizontal:10,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center'},securityMiniActionText:{fontSize:8,fontWeight:'900'},securityManagerActions:{flexDirection:'row-reverse',alignItems:'center',gap:8,padding:9,borderRadius:15,borderWidth:1,borderColor:'rgba(99,232,255,.28)',backgroundColor:'rgba(5,9,27,.78)'},securityHeroCard:{flexDirection:'row-reverse',alignItems:'center',gap:10,padding:11,borderRadius:19,borderWidth:1,borderColor:'rgba(114,255,197,.35)',backgroundColor:'rgba(7,10,27,.85)'},securityHeroArt:{width:76,height:76},securityHeroTitle:{color:'#fff',fontSize:13,fontWeight:'900',textAlign:'right'},securityHeroText:{color:'rgba(255,255,255,.66)',fontSize:9,lineHeight:15,textAlign:'right',marginTop:4},securitySectionTitle:{color:'#ffd166',fontSize:12,fontWeight:'900',textAlign:'right',marginTop:4},securitySmallText:{color:'rgba(255,255,255,.64)',fontSize:9,lineHeight:15,textAlign:'right'},ownerChoiceRow:{flexDirection:'row-reverse',gap:9},ownerChoiceCard:{width:'48%',flexGrow:1,minHeight:143,padding:8,borderRadius:17,borderWidth:1,backgroundColor:'rgba(7,10,27,.85)',alignItems:'center',justifyContent:'center',gap:3,shadowOpacity:.16,shadowRadius:8},ownerChoiceActive:{borderWidth:2,backgroundColor:'rgba(114,255,197,.08)',shadowOpacity:.45,shadowRadius:12},ownerChoiceArt:{width:'100%',height:97},ownerChoiceLabel:{color:'#fff',fontSize:11,fontWeight:'900'},ownerLockedCard:{flexDirection:'row-reverse',alignItems:'center',gap:9,padding:10,borderRadius:17,borderWidth:1,borderColor:'rgba(114,255,197,.45)',backgroundColor:'rgba(114,255,197,.07)'},ownerLockedArt:{width:71,height:71},ownerLockedLabel:{color:'#72ffc5',fontSize:10,fontWeight:'900',textAlign:'right'},ownerLockedName:{color:'#fff',fontSize:12,fontWeight:'900',textAlign:'right',marginVertical:3},securityMethodsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8},securityMethodCard:{width:'48.5%',minWidth:128,minHeight:142,borderRadius:16,borderWidth:1,padding:8,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(7,10,27,.86)',gap:4,shadowOpacity:.18,shadowRadius:8},securityMethodCardActive:{borderWidth:2,backgroundColor:'rgba(114,255,197,.08)',shadowOpacity:.48,shadowRadius:12},securityMethodArt:{width:76,height:72},securityMethodTitle:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center'},securityMethodDesc:{color:'rgba(255,255,255,.56)',fontSize:8,lineHeight:12,textAlign:'center',minHeight:24},securityTargetsList:{gap:9},securityTickBox:{width:25,height:25,borderRadius:7,borderWidth:1.4,borderColor:'rgba(255,255,255,.4)',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(1,4,15,.52)'},securityTickBoxActive:{borderColor:'#72ffc5',backgroundColor:'#72ffc5',shadowColor:'#72ffc5',shadowOpacity:.8,shadowRadius:8},securityFieldLabel:{color:'#63e8ff',fontSize:10,fontWeight:'900',textAlign:'right',marginTop:4},securityTargetCard:{minHeight:96,flexDirection:'row-reverse',alignItems:'center',gap:9,padding:9,borderRadius:17,borderWidth:1,backgroundColor:'rgba(7,10,27,.87)',shadowOpacity:.13,shadowRadius:7},securityTargetCardActive:{borderWidth:2,backgroundColor:'rgba(114,255,197,.08)',shadowOpacity:.45,shadowRadius:12},securityTargetArt:{width:72,height:72,flexShrink:0},securityTargetText:{flex:1,minWidth:0,gap:4},securityTargetTitle:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'right'},securityTargetDesc:{color:'rgba(255,255,255,.58)',fontSize:8,lineHeight:13,textAlign:'right'},securityPatternSection:{alignItems:'center',gap:8,padding:10,borderRadius:17,borderWidth:1,borderColor:'rgba(178,140,255,.35)',backgroundColor:'rgba(7,10,27,.78)'},patternPadWrap:{alignItems:'center',gap:6,paddingVertical:4},patternPadLabel:{color:'#fff',fontSize:10,fontWeight:'900'},patternPad:{width:244,height:244,borderRadius:25,borderWidth:1,borderColor:'rgba(99,232,255,.4)',backgroundColor:'rgba(3,7,22,.94)',overflow:'hidden'},patternDot:{position:'absolute',width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:'rgba(99,232,255,.75)',backgroundColor:'rgba(6,15,36,.96)',alignItems:'center',justifyContent:'center'},patternDotActive:{borderColor:'#72ffc5',shadowColor:'#72ffc5',shadowOpacity:.9,shadowRadius:9},patternDotCore:{width:7,height:7,borderRadius:4,backgroundColor:'#63e8ff'},patternDotCoreActive:{width:10,height:10,borderRadius:5,backgroundColor:'#72ffc5'},patternHint:{color:'rgba(255,255,255,.55)',fontSize:8,textAlign:'center'},securityPatternStatus:{flexDirection:'row-reverse',alignItems:'center',gap:7},securityNoteCard:{flexDirection:'row-reverse',alignItems:'center',gap:9,padding:10,borderRadius:15,borderWidth:1,borderColor:'rgba(114,255,197,.25)',backgroundColor:'rgba(7,10,27,.7)'},securityNoteArt:{width:67,height:67},securitySaveButton:{minHeight:50,paddingHorizontal:12,borderRadius:16,backgroundColor:'#72ffc5',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:8},securitySaveText:{color:'#06111a',fontSize:10,fontWeight:'900'},recoveryReveal:{padding:12,borderRadius:17,borderWidth:1,borderColor:'#ffd166',backgroundColor:'rgba(255,209,102,.08)',gap:9},recoveryHeader:{flexDirection:'row-reverse',alignItems:'center',gap:9},recoveryArt:{width:65,height:65},recoveryTitle:{color:'#ffd166',fontSize:12,fontWeight:'900',textAlign:'right'},recoveryCode:{color:'#fff',fontSize:17,fontWeight:'900',letterSpacing:1.5,textAlign:'center',padding:12,borderRadius:12,borderWidth:1,borderColor:'rgba(255,209,102,.45)',backgroundColor:'rgba(2,5,18,.7)'},recoveryAckButton:{minHeight:43,paddingHorizontal:10,borderRadius:13,backgroundColor:'#72ffc5',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7},recoveryRefreshButton:{minHeight:54,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:8,padding:8,borderRadius:15,borderWidth:1,borderColor:'#ffd166',backgroundColor:'rgba(255,209,102,.08)'},recoveryRefreshArt:{width:42,height:42},recoveryRefreshText:{color:'#ffd166',fontSize:10,fontWeight:'900'},securityScopeNote:{color:'rgba(255,209,102,.82)',fontSize:8,lineHeight:14,textAlign:'right',padding:9,borderWidth:1,borderColor:'rgba(255,209,102,.24)',borderRadius:12},securityStatusText:{color:'#72ffc5',fontSize:9,lineHeight:15,textAlign:'center',padding:8},securityGate:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:18,gap:10,zIndex:20},securityGateHero:{width:105,height:105,borderRadius:24,borderWidth:1.5,borderColor:'rgba(99,232,255,.55)',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,20,28,.72)',shadowColor:'#63e8ff',shadowOpacity:.42,shadowRadius:20,elevation:8},securityGateArt:{width:94,height:94},securityGateTitle:{color:'#fff',fontSize:19,fontWeight:'900',textAlign:'center'},securityGateSubtitle:{color:'rgba(255,255,255,.68)',fontSize:10,lineHeight:16,textAlign:'center',maxWidth:360},securityGateBiometric:{width:'100%',maxWidth:350,minHeight:57,paddingHorizontal:10,borderRadius:16,borderWidth:1,borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.08)',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:10},securityGateBioArt:{width:49,height:49},securityGateBiometricText:{color:'#fff',fontSize:10,fontWeight:'900'},securityGatePrimaryButton:{width:'100%',maxWidth:350,minHeight:49,paddingHorizontal:12,borderRadius:15,backgroundColor:'#72ffc5',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7},securityGatePrimaryText:{color:'#06111a',fontSize:11,fontWeight:'900'},securityGateSecondary:{width:'100%',maxWidth:350,minHeight:44,paddingHorizontal:10,borderRadius:14,borderWidth:1,borderColor:'rgba(99,232,255,.4)',backgroundColor:'rgba(7,10,27,.8)',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7},securityGateSecondaryText:{color:'#fff',fontSize:9,fontWeight:'900'},securityGateSmallArt:{width:38,height:38},securityGateRecovery:{width:'100%',maxWidth:350,minHeight:47,paddingHorizontal:10,borderRadius:14,borderWidth:1,borderColor:'rgba(255,209,102,.5)',backgroundColor:'rgba(255,209,102,.06)',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:8},securityGateCancel:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7,padding:8},securityGateCancelText:{color:'#ff79c8',fontSize:9,fontWeight:'900'},securityGateMessage:{color:'#ffd166',fontSize:9,lineHeight:14,textAlign:'center',maxWidth:350,padding:8},
  settingsPageImage:{width:68,height:68,resizeMode:'cover'},noraPresetImage:{width:74,height:74,borderRadius:37,resizeMode:'cover',marginBottom:5},noraEffectPreview:{width:62,height:62,borderRadius:31,resizeMode:'cover',marginBottom:5},
  simCarrierCard:{minHeight:72,borderRadius:20,borderWidth:1,backgroundColor:'rgba(8,10,30,.78)',padding:12,flexDirection:'row',alignItems:'center',gap:10,shadowOpacity:.25,shadowRadius:14},simCarrierTitle:{color:'#fff',fontSize:14,fontWeight:'900',marginBottom:3},simCarrierDot:{width:9,height:9,borderRadius:5,shadowOpacity:.9,shadowRadius:9},simQueryGrid:{flexDirection:'row',gap:10},simQueryCard:{flex:1,minHeight:155,borderRadius:20,borderWidth:1,backgroundColor:'rgba(8,10,30,.78)',padding:12,alignItems:'center',justifyContent:'center',shadowOpacity:.25,shadowRadius:14},simQueryTitle:{color:'#fff',fontSize:11,fontWeight:'900',textAlign:'center',marginTop:8},simQueryValue:{color:'rgba(255,255,255,.78)',fontSize:10,lineHeight:17,textAlign:'center',marginTop:8},noraRoot:{flex:1,paddingHorizontal:14,paddingBottom:6,position:'relative'},noraFrame:{position:'absolute',left:2,right:2,top:2,bottom:2,borderRadius:28,overflow:'hidden',pointerEvents:'none'},noraFrameOuter:{position:'absolute',left:2,right:2,top:2,bottom:2,borderRadius:28,borderWidth:2,borderColor:'#63e8ff',shadowColor:'#63e8ff',shadowOpacity:.7,shadowRadius:18},noraFrameInner:{position:'absolute',left:8,right:8,top:8,bottom:8,borderRadius:23,borderWidth:1,borderColor:'#ff79c8',shadowColor:'#ff79c8',shadowOpacity:.32,shadowRadius:12},noraFrameDot:{position:'absolute',width:7,height:7,borderRadius:4,backgroundColor:'#72ffc5',shadowColor:'#72ffc5',shadowOpacity:1,shadowRadius:12},noraTopCard:{minHeight:82,borderRadius:24,borderWidth:1,borderColor:'rgba(99,232,255,.35)',backgroundColor:'rgba(8,10,30,.72)',flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:10,shadowColor:'#63e8ff',shadowOpacity:.18,shadowRadius:18},noraCharacterButtonWrap:{position:'relative'},noraFeatureButton:{height:54,minWidth:112,borderRadius:18,borderWidth:1,backgroundColor:'rgba(255,121,200,.08)',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,shadowOpacity:.35,shadowRadius:12},noraFeatureText:{color:'#fff',fontSize:12,fontWeight:'900'},noraCheckDot:{position:'absolute',right:-4,top:-5,width:19,height:19,borderRadius:10,backgroundColor:'#72ffc5',alignItems:'center',justifyContent:'center',shadowColor:'#72ffc5',shadowOpacity:.9,shadowRadius:8},noraHeroIcon:{width:68,height:68,borderRadius:34,borderWidth:2,borderColor:'#63e8ff',alignItems:'center',justifyContent:'center',shadowColor:'#63e8ff',shadowOpacity:.8,shadowRadius:18,overflow:'visible',zIndex:2},noraHeroImage:{width:58,height:58,borderRadius:29},noraPageIconBadge:{position:'absolute',right:-4,top:-4,width:25,height:25,borderRadius:13,borderWidth:1.5,borderColor:'#72ffc5',backgroundColor:'#081126',alignItems:'center',justifyContent:'center',shadowRadius:9,elevation:8,zIndex:4},noraPageIconBadgeImage:{width:19,height:19,borderRadius:10},noraTopActions:{flexDirection:'row',gap:7},noraRoundAction:{width:46,height:46,borderRadius:23,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.78)',shadowOpacity:.4,shadowRadius:10},noraStatusRow:{height:34,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},noraStatus:{color:'rgba(255,255,255,.72)',fontSize:10,fontWeight:'800'},noraStatusLed:{width:7,height:7,borderRadius:4,shadowOpacity:.9,shadowRadius:7},noraSafetyLed:{width:8,height:8,borderRadius:4,marginLeft:5,shadowOpacity:.95,shadowRadius:10,elevation:8},noraSafetyLedTop:{position:'absolute',left:'50%',top:4,width:8,height:8,borderRadius:4,marginLeft:-4,shadowOpacity:.95,shadowRadius:10,elevation:12,zIndex:9},noraMessagesBox:{flex:1,minHeight:110,borderRadius:22,borderWidth:1,borderColor:'#63e8ff',backgroundColor:'rgba(5,8,25,.68)',padding:12,shadowColor:'#63e8ff',shadowOpacity:.25,shadowRadius:16,justifyContent:'flex-end'},noraMessagesContent:{flexGrow:1,justifyContent:'flex-end',paddingBottom:2},noraEmpty:{color:'rgba(255,255,255,.48)',fontSize:12,textAlign:'center',padding:20},noraBubble:{maxWidth:'88%',paddingHorizontal:12,paddingVertical:9,borderRadius:15,marginTop:7,borderWidth:1},noraUserBubble:{alignSelf:'flex-end',borderColor:'#ff79c8',backgroundColor:'rgba(255,121,200,.10)'},noraAiBubble:{alignSelf:'flex-start',borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.08)'},noraBubbleText:{color:'#fff',fontSize:11,lineHeight:18},noraComposer:{minHeight:66,borderRadius:22,borderWidth:1,borderColor:'#b28cff',backgroundColor:'rgba(8,9,27,.76)',marginTop:9,padding:7,flexDirection:'row',alignItems:'center',shadowColor:'#b28cff',shadowOpacity:.24,shadowRadius:16},noraInput:{flex:1,color:'#fff',fontSize:13,maxHeight:90,minHeight:44,paddingHorizontal:10,paddingVertical:8,textAlign:'right',textAlignVertical:'center'},noraSend:{width:50,height:50,borderRadius:17,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(99,232,255,.08)',shadowOpacity:.5,shadowRadius:12},noraMicGlow:{position:'absolute',alignSelf:'center',bottom:91,width:112,height:112,borderRadius:56,borderWidth:3,borderColor:'#ff79c8',shadowOpacity:.9,shadowRadius:28},noraMic:{alignSelf:'center',width:116,height:116,borderRadius:58,borderWidth:2,alignItems:'center',justifyContent:'center',marginTop:6,shadowOpacity:.8,shadowRadius:24,padding:6,overflow:'visible'},noraMicIcon:{width:47,height:47,resizeMode:'contain'},noraMicBars:{height:16,marginTop:3,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3},noraMicBar:{width:3,minHeight:3,borderRadius:2},noraMicText:{color:'#fff',fontSize:9,fontWeight:'900',marginTop:5},noraQuickRow:{flexDirection:'row',gap:7,marginTop:10,justifyContent:'space-between'},noraQuick:{flex:1,minHeight:52,borderRadius:17,borderWidth:1,borderColor:'rgba(255,255,255,.22)',backgroundColor:'rgba(8,9,27,.72)',alignItems:'center',justifyContent:'center',shadowOpacity:.3,shadowRadius:8},noraQuickText:{color:'#fff',fontSize:9,fontWeight:'900',marginTop:4},noraQuickCheck:{position:'absolute',right:4,top:4,width:16,height:16,borderRadius:8,backgroundColor:'#72ffc5',alignItems:'center',justifyContent:'center',shadowColor:'#72ffc5',shadowOpacity:.9,shadowRadius:8},noraIdentity:{flex:1,alignItems:'center',paddingHorizontal:8},noraIdentityTitle:{color:'#fff',fontSize:18,fontWeight:'900'},noraIdentitySub:{color:'rgba(255,255,255,.62)',fontSize:9,marginTop:2},noraModePill:{minWidth:70,height:34,borderRadius:17,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'rgba(8,9,27,.7)'},noraModePillText:{color:'#fff',fontSize:9,fontWeight:'900'},frameBorderOuter:{position:'absolute',left:32,right:32,top:166,bottom:105,borderWidth:2,borderRadius:25,borderColor:'rgba(99,232,255,.82)',shadowColor:'#63e8ff',shadowOpacity:.82,shadowRadius:19,elevation:8},frameBorderInner:{position:'absolute',left:37,right:37,top:171,bottom:110,borderWidth:1.2,borderRadius:21,borderColor:'rgba(255,121,200,.52)',shadowColor:'#ff79c8',shadowOpacity:.55,shadowRadius:14,elevation:6},frameCornerGlow:{position:'absolute',width:14,height:14,borderRadius:4,backgroundColor:'#63e8ff',shadowColor:'#63e8ff',shadowOpacity:1,shadowRadius:18,elevation:12},frameCornerTL:{left:30,top:164},frameCornerTR:{right:30,top:164},frameCornerBL:{left:30,bottom:103},frameCornerBR:{right:30,bottom:103},magicLayer:{...StyleSheet.absoluteFillObject,zIndex:99,alignItems:'center',justifyContent:'center',overflow:'hidden'},magicFlash:{position:'absolute',width:18,height:18,borderRadius:4,shadowOpacity:.95,shadowRadius:18,elevation:12},magicCore:{position:'absolute',width:8,height:8,borderRadius:4,shadowOpacity:.95,shadowRadius:16,elevation:10},magicParticle:{position:'absolute',left:'50%',top:'50%',width:5,height:5,borderRadius:2,marginLeft:-2.5,marginTop:-2.5,shadowOpacity:.9,shadowRadius:8,elevation:8},magicRay:{position:'absolute',width:2,height:17,borderRadius:1,shadowOpacity:.9,shadowRadius:7,elevation:7},noraCharacterImage:{width:'100%',height:230,resizeMode:'contain',borderRadius:18,borderWidth:1,borderColor:'#63e8ff',backgroundColor:'#050817',shadowColor:'#63e8ff',shadowOpacity:.35,shadowRadius:18},noraCharacterSheet:{width:'100%',height:205,resizeMode:'contain',borderRadius:18,backgroundColor:'#050817',borderWidth:1,borderColor:'rgba(99,232,255,.55)'},noraCharacterGrid:{flexDirection:'row',flexWrap:'nowrap',alignItems:'center',justifyContent:'center',gap:8,width:'100%'},noraCharacterCard:{width:92,borderRadius:15,borderWidth:1,borderColor:'rgba(255,255,255,.22)',backgroundColor:'rgba(8,9,27,.72)',padding:5},noraCharacterCardActive:{borderColor:'#72ffc5',shadowColor:'#72ffc5',shadowOpacity:.8,shadowRadius:12,borderWidth:2},noraCharacterCompactCard:{width:100,padding:3,position:'relative',overflow:'hidden'},noraCharacterChoiceImage:{width:'100%',height:146,borderRadius:11,resizeMode:'contain',backgroundColor:'#050817'},noraCharacterSelectionTick:{position:'absolute',right:7,top:7,width:25,height:25,borderRadius:13,backgroundColor:'#72ffc5',borderWidth:1.5,borderColor:'#fff',alignItems:'center',justifyContent:'center',shadowColor:'#72ffc5',shadowOpacity:1,shadowRadius:10,elevation:8},noraSelectButton:{height:52,borderRadius:16,borderWidth:1,marginTop:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'rgba(114,255,197,.08)'},noraSelectText:{color:'#fff',fontSize:11,fontWeight:'900'},
  realDjStage:{minWidth:1320,padding:12,gap:12,alignItems:'stretch',backgroundColor:'rgba(2,4,15,.42)'},realDeck:{width:430,padding:12,borderRadius:28,borderWidth:1,backgroundColor:'rgba(5,8,24,.9)'},realDeckHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:58},realDeckName:{fontSize:16,fontWeight:'900',letterSpacing:2},realDeckTrack:{color:'rgba(255,255,255,.68)',fontSize:9,maxWidth:320,marginTop:3},deckLive:{width:10,height:10,borderRadius:5,shadowOpacity:.8,shadowRadius:9},djLargeWheelWrap:{height:270,alignItems:'center',justifyContent:'center',position:'relative'},djLargeWheel:{width:220,height:220,borderRadius:110,borderWidth:5,backgroundColor:'#070a19',alignItems:'center',justifyContent:'center',shadowOpacity:.75,shadowRadius:30},djLargePlatter:{width:148,height:148,borderRadius:74,borderWidth:2,backgroundColor:'#11162e',alignItems:'center',justifyContent:'center'},djLargeLabel:{width:82,height:82,borderRadius:41,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'#080b1d'},djLargeLetter:{fontSize:30,fontWeight:'900'},djLargeHint:{color:'rgba(255,255,255,.48)',fontSize:6,letterSpacing:1},djLargeTick:{position:'absolute',width:3,height:12,borderRadius:2,backgroundColor:'rgba(255,255,255,.62)'},djTouchRing:{position:'absolute',width:232,height:232,borderRadius:116,borderWidth:1,opacity:.45},deckTimeRow:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:5,marginBottom:7},deckTime:{color:'rgba(255,255,255,.7)',fontSize:9,fontWeight:'800'},deckWave:{height:62,borderRadius:12,borderWidth:1,borderColor:'rgba(255,255,255,.12)',backgroundColor:'#050713',flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:5,overflow:'hidden'},deckWaveBar:{width:7,borderRadius:3,opacity:.9},deckButtons:{flexDirection:'row',gap:7,marginTop:10},djRealButton:{flex:1,height:45,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5},djRealButtonText:{color:'#fff',fontSize:8,fontWeight:'900'},djSectionLabel:{color:'rgba(255,255,255,.6)',fontSize:8,fontWeight:'900',letterSpacing:1,marginTop:10},djPitchRow:{flexDirection:'row',gap:5,marginTop:6},djPitchButton:{flex:1,height:32,borderRadius:9,borderWidth:1,borderColor:'rgba(255,255,255,.14)',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.03)'},djPitchText:{color:'#fff',fontSize:7,fontWeight:'800'},djEqMini:{marginTop:8,padding:8,borderRadius:14,backgroundColor:'rgba(255,255,255,.035)'},djEqRow:{flexDirection:'row',justifyContent:'space-around',marginTop:5},djEqKnob:{alignItems:'center',width:100},djEqLabel:{color:'#fff',fontSize:7,fontWeight:'900',marginBottom:4},djEqDot:{width:13,height:13,borderRadius:7,backgroundColor:'rgba(255,255,255,.12)',marginVertical:2},djDeckBottomRow:{flexDirection:'row',alignItems:'center',gap:8,marginTop:8},deckVolumeMeter:{flex:1,height:10,flexDirection:'row',gap:2},deckMeterBar:{flex:1,borderRadius:2},realCenterMixer:{width:420,gap:10},colorMonitor:{height:330,borderRadius:25,borderWidth:2,borderColor:'#64f5ff',backgroundColor:'#030611',alignItems:'center',justifyContent:'center',overflow:'hidden',shadowColor:'#64f5ff',shadowOpacity:.35,shadowRadius:28},monitorGlow:{position:'absolute',width:360,height:220,borderRadius:180,backgroundColor:'rgba(100,245,255,.07)',shadowColor:'#b28cff',shadowOpacity:.7,shadowRadius:60},monitorBrand:{color:'#fff',fontSize:15,fontWeight:'900',letterSpacing:3},monitorMode:{color:'rgba(255,255,255,.55)',fontSize:7,letterSpacing:1.5,marginTop:3},monitorWave:{height:115,width:'88%',flexDirection:'row',alignItems:'center',justifyContent:'space-around',marginTop:13},monitorBar:{width:5,borderRadius:3},monitorReadout:{flexDirection:'row',alignItems:'baseline',gap:5},monitorBig:{color:'#64f5ff',fontSize:35,fontWeight:'900'},monitorUnit:{color:'#b28cff',fontSize:9,fontWeight:'900'},monitorKey:{color:'#ff79c8',fontSize:9,fontWeight:'900',marginLeft:12},monitorTracks:{width:'88%',flexDirection:'row',justifyContent:'space-between',marginTop:7},monitorTrackText:{color:'rgba(255,255,255,.55)',fontSize:7},mixerRealPanel:{flex:1,minHeight:280,borderRadius:25,borderWidth:1,borderColor:'#b28cff',backgroundColor:'rgba(7,9,25,.86)',padding:13},realMixerTitle:{color:'#fff',fontSize:14,fontWeight:'900',letterSpacing:2,textAlign:'center'},masterMeter:{height:15,flexDirection:'row',gap:3,marginTop:8},masterBar:{flex:1,borderRadius:3},crossBig:{height:34,marginTop:7,borderRadius:17,borderWidth:1,borderColor:'rgba(255,255,255,.2)',backgroundColor:'rgba(255,255,255,.04)',position:'relative'},crossBigKnob:{position:'absolute',top:5,width:25,height:22,borderRadius:11,backgroundColor:'#fff',shadowColor:'#64f5ff',shadowOpacity:.9,shadowRadius:9},masterButtons:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',marginTop:10},masterBtn:{height:35,minWidth:48,paddingHorizontal:9,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},masterBtnText:{color:'#fff',fontSize:7,fontWeight:'900'},masterValue:{color:'#ffd166',fontSize:13,fontWeight:'900'},hotCueRow:{flexDirection:'row',gap:5,marginTop:12},hotCue:{flex:1,height:36,borderRadius:9,borderWidth:1,alignItems:'center',justifyContent:'center'},hotCueText:{color:'#fff',fontSize:6,fontWeight:'900'},realMonitorPage:{flex:1,padding:14,gap:10},fullColorMonitor:{flex:1,borderRadius:28,borderWidth:2,borderColor:'#64f5ff',backgroundColor:'#02040f',alignItems:'center',justifyContent:'center',overflow:'hidden'},fullWave:{width:'92%',height:'52%',flexDirection:'row',alignItems:'center',justifyContent:'space-around',marginTop:16},fullWaveBar:{width:7,borderRadius:4,shadowOpacity:.8,shadowRadius:8},monitorBigReadout:{alignItems:'center'},monitorHuge:{color:'#fff',fontSize:54,fontWeight:'900'},monitorControlStrip:{height:62,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap'},monitorCtrl:{width:42,height:42,borderRadius:12,borderWidth:1,borderColor:'#64f5ff',alignItems:'center',justifyContent:'center'},monitorCtrlText:{color:'#fff',fontSize:10,fontWeight:'900'},keyChip:{height:35,minWidth:45,paddingHorizontal:9,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},keyChipActive:{borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.12)'},keyChipText:{color:'#fff',fontSize:8,fontWeight:'900'},djSettingsPage:{padding:18,gap:12,minWidth:900},djSettingsGrid:{flexDirection:'row',gap:10,flexWrap:'wrap'},djSettingCard:{width:180,minHeight:100,borderRadius:18,borderWidth:1,borderColor:'rgba(100,245,255,.25)',backgroundColor:'rgba(8,9,27,.7)',padding:12},djSettingValue:{color:'#fff',fontSize:23,fontWeight:'900',marginTop:8},  eqLandscapeRoot:{flex:1,backgroundColor:'rgba(5,7,20,.35)'},eqTopBar:{height:62,flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.14)'},eqBrandBlock:{width:270,flexDirection:'row',alignItems:'center',gap:8},eqBackButton:{width:36,height:36,borderRadius:12,borderWidth:1,borderColor:'rgba(100,245,255,.45)',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(100,245,255,.07)'},eqBrand:{color:'#fff',fontSize:15,fontWeight:'900'},eqTrack:{color:'rgba(255,255,255,.55)',fontSize:8,marginTop:2},eqTabRail:{flex:1,flexDirection:'row',justifyContent:'center',gap:8},eqTopTab:{height:42,minWidth:125,paddingHorizontal:15,borderRadius:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:'rgba(255,255,255,.14)',backgroundColor:'rgba(8,9,27,.62)'},eqTopTabActive:{borderColor:'#64f5ff',backgroundColor:'rgba(100,245,255,.13)',shadowColor:'#64f5ff',shadowOpacity:.45,shadowRadius:12},eqTopTabText:{color:'#fff',fontSize:10,fontWeight:'900'},eqSettingsButton:{width:44,height:44,borderRadius:15,borderWidth:1,borderColor:'#ffd166',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.72)'},eqLandscapePage:{flex:1,flexDirection:'row',padding:14,gap:14},songSettingsCard:{flex:1.25,flexDirection:'row',padding:14,borderRadius:22,backgroundColor:'rgba(8,9,27,.62)',borderWidth:1,borderColor:'rgba(100,245,255,.28)',shadowColor:'#64f5ff',shadowOpacity:.18,shadowRadius:20},songArt:{width:145,height:145,borderRadius:24,borderWidth:2,borderColor:'#ff79c8',backgroundColor:'rgba(255,121,200,.10)',alignItems:'center',justifyContent:'center',shadowColor:'#ff79c8',shadowOpacity:.45,shadowRadius:18,marginRight:14},eqBigTitle:{color:'#fff',fontSize:24,fontWeight:'900',marginBottom:6},eqSub:{color:'rgba(255,255,255,.64)',fontSize:10,lineHeight:17,maxWidth:480},neonAction:{height:48,borderRadius:15,borderWidth:1,borderColor:'#64f5ff',backgroundColor:'rgba(100,245,255,.08)',flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:14,marginTop:14,shadowColor:'#64f5ff',shadowOpacity:.25,shadowRadius:10},neonActionText:{color:'#fff',fontSize:11,fontWeight:'900',flex:1},songMetaRow:{flexDirection:'row',gap:25,marginTop:14},eqValue:{color:'#ffd166',fontSize:10,fontWeight:'900'},miniControlRow:{flexDirection:'row',gap:10,marginTop:13},roundControl:{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:'#64f5ff',backgroundColor:'rgba(8,9,27,.75)',alignItems:'center',justifyContent:'center'},eqSettingsColumns:{flex:.9,gap:12},songControlPanel:{flex:1,padding:13,borderRadius:20,backgroundColor:'rgba(8,9,27,.58)',borderWidth:1,borderColor:'rgba(255,255,255,.14)'},panelTitle:{color:'rgba(255,255,255,.72)',fontSize:9,fontWeight:'900',letterSpacing:.7},hSlider:{height:52,marginTop:8,flexDirection:'row',alignItems:'center',justifyContent:'space-around',borderRadius:15,backgroundColor:'rgba(255,255,255,.04)',position:'relative'},hSliderFill:{position:'absolute',left:0,height:6,borderRadius:3,backgroundColor:'#64f5ff',shadowColor:'#64f5ff',shadowOpacity:.8,shadowRadius:7},hSliderDot:{minWidth:30,alignItems:'center'},hSliderLabel:{color:'#fff',fontSize:8},presetStrip:{flexDirection:'row',gap:7,marginTop:8,flexWrap:'wrap'},smallPreset:{minWidth:95,height:42,paddingHorizontal:9,borderRadius:12,borderWidth:1,borderColor:'rgba(178,140,255,.55)',backgroundColor:'rgba(178,140,255,.08)',flexDirection:'row',alignItems:'center',gap:6},smallPresetText:{color:'#fff',fontSize:8,fontWeight:'800'},djPage:{minWidth:910,flexGrow:1,padding:7,gap:8,alignItems:'stretch'},deckColumn:{width:275,padding:7,borderRadius:22,backgroundColor:'rgba(7,9,25,.68)',borderWidth:1,borderColor:'rgba(100,245,255,.22)'},deckLabel:{color:'#fff',fontSize:10,fontWeight:'900',letterSpacing:2,textAlign:'center',marginBottom:3},djWheelWrap:{alignItems:'center',justifyContent:'center',height:118},djWheel:{width:108,height:108,borderRadius:54,borderWidth:4,backgroundColor:'#090b1b',alignItems:'center',justifyContent:'center',shadowOpacity:.65,shadowRadius:24},djWheelInner:{width:66,height:66,borderRadius:34,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'#12152d'},djWheelLetter:{fontSize:24,fontWeight:'900'},djWheelHint:{color:'rgba(255,255,255,.45)',fontSize:6,marginTop:4},djWheelTicks:{position:'absolute',width:103,height:103,alignItems:'center',justifyContent:'center'},djWheelTick:{position:'absolute',width:2,height:9,borderRadius:2,backgroundColor:'rgba(255,255,255,.55)'},djLed:{width:7,height:7,borderRadius:4,backgroundColor:'#5b1520',marginLeft:5},padRow:{flexDirection:'row',gap:7,justifyContent:'center',marginTop:8},djPad:{minWidth:62,height:38,paddingHorizontal:8,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(7,9,25,.85)',shadowOpacity:.35,shadowRadius:8},djPadLabel:{color:'#fff',fontSize:7,fontWeight:'900',marginTop:3},pitchTrack:{height:55,width:38,alignSelf:'center',marginTop:9,borderRadius:15,borderWidth:1,borderColor:'rgba(255,255,255,.15)',backgroundColor:'rgba(255,255,255,.03)',justifyContent:'flex-end',alignItems:'center',overflow:'hidden'},pitchFill:{width:10,borderRadius:5,backgroundColor:'#64f5ff',shadowColor:'#64f5ff',shadowOpacity:.75,shadowRadius:9},pitchMark:{position:'absolute',left:4,right:4,alignItems:'flex-start'},pitchText:{color:'rgba(255,255,255,.45)',fontSize:6},mixerColumn:{width:325,padding:7,borderRadius:22,backgroundColor:'rgba(7,9,25,.68)'},mixerNeonFrame:{flex:1,minHeight:258,borderRadius:22,borderWidth:2,borderColor:'#b28cff',shadowColor:'#b28cff',shadowOpacity:.45,shadowRadius:24,padding:12},mixerTitle:{color:'#fff',fontSize:14,fontWeight:'900',textAlign:'center',letterSpacing:2},knobRow:{flexDirection:'row',justifyContent:'space-around',marginTop:12},djKnobWrap:{alignItems:'center',width:78},djKnob:{width:60,height:60,borderRadius:30,borderWidth:2,backgroundColor:'#0c0f25',alignItems:'center',justifyContent:'center',shadowOpacity:.45,shadowRadius:12},djKnobRotator:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'flex-start'},djKnobMark:{position:'absolute',width:3,height:13,borderRadius:2,top:6},djKnobCenter:{width:9,height:9,borderRadius:5,backgroundColor:'#fff'},djControlLabel:{color:'#fff',fontSize:7,fontWeight:'900',marginTop:5},djControlValue:{fontSize:7,fontWeight:'900',marginTop:2},crossRow:{marginTop:14},crossTrack:{height:28,marginTop:8,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,.16)',backgroundColor:'rgba(255,255,255,.04)',flexDirection:'row',alignItems:'center',justifyContent:'space-around'},crossDot:{width:13,height:13,borderRadius:7,backgroundColor:'#4b1520'},crossDotOn:{backgroundColor:'#42ff7a',shadowColor:'#42ff7a',shadowOpacity:.8,shadowRadius:7},ledStrip:{flexDirection:'row',justifyContent:'center',gap:5,marginTop:13},djDeckBottom:{marginTop:16,padding:10,borderRadius:14,backgroundColor:'rgba(255,255,255,.04)',gap:7},djSmall:{color:'rgba(255,255,255,.55)',fontSize:8,textAlign:'center'},visualLeft:{flex:.85,padding:16,borderRadius:22,backgroundColor:'rgba(8,9,27,.62)',borderWidth:1,borderColor:'rgba(100,245,255,.25)'},visualModeRow:{flexDirection:'row',gap:8,marginTop:18,flexWrap:'wrap'},visualMode:{height:42,minWidth:100,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:'rgba(255,255,255,.16)',backgroundColor:'rgba(255,255,255,.04)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},visualModeActive:{borderColor:'#64f5ff',backgroundColor:'rgba(100,245,255,.12)'},visualModeText:{color:'#fff',fontSize:9,fontWeight:'800'},djVisualizerStage:{flex:1,minWidth:480,borderRadius:24,borderWidth:2,borderColor:'#64f5ff',backgroundColor:'rgba(3,5,18,.86)',alignItems:'center',justifyContent:'center',overflow:'hidden',shadowColor:'#64f5ff',shadowOpacity:.3,shadowRadius:30},djVisualizerGlow:{position:'absolute',width:400,height:180,borderRadius:200,backgroundColor:'rgba(100,245,255,.10)',shadowColor:'#64f5ff',shadowOpacity:.8,shadowRadius:60},djBars:{height:220,width:'88%',flexDirection:'row',alignItems:'flex-end',justifyContent:'center',gap:6},djBar:{width:9,borderRadius:5,shadowOpacity:.7,shadowRadius:10,minHeight:5},djVisualizerCaption:{position:'absolute',bottom:16,color:'rgba(255,255,255,.65)',fontSize:9,fontWeight:'900',letterSpacing:1.2}
,eqSettingsOverlay:{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:50,justifyContent:'flex-end'},eqSettingsScrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.62)'},eqSettingsSheet:{margin:16,padding:16,borderRadius:24,borderWidth:1,borderColor:'#ffd166',backgroundColor:'#11142d',shadowColor:'#ffd166',shadowOpacity:.3,shadowRadius:20},eqSettingsSheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},eqClose:{width:38,height:38,borderRadius:19,borderWidth:1,borderColor:'rgba(255,255,255,.25)',alignItems:'center',justifyContent:'center'},eqResetButton:{height:48,marginTop:10,borderRadius:15,borderWidth:1,borderColor:'#ffd166',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'rgba(255,209,102,.08)'},
 /* AVAYE NOVA five-tap discovery feedback */
 secretTapFxLayer:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',zIndex:8,overflow:'hidden'},secretTapBlast:{position:'absolute',width:170,height:170,borderRadius:90,borderWidth:3,shadowOpacity:1,shadowRadius:24},secretTapRing:{position:'absolute',width:176,height:176,borderRadius:90,borderWidth:3,shadowOpacity:.9,shadowRadius:18},secretTapOrbit:{position:'absolute',width:196,height:76,borderRadius:100,borderWidth:2,shadowOpacity:1,shadowRadius:20},secretTapRay:{position:'absolute',width:4,height:95,borderRadius:3,shadowOpacity:1,shadowRadius:14},secretLockHint:{position:'absolute',right:-9,bottom:-9,width:36,height:36,borderRadius:18,backgroundColor:'#10152b',borderWidth:2,borderColor:'#ffd166',alignItems:'center',justifyContent:'center'},secretTapProgress:{marginTop:8,minWidth:215,maxWidth:'96%',paddingVertical:7,paddingHorizontal:14,borderRadius:18,borderWidth:1,backgroundColor:'rgba(7,9,25,.88)',alignItems:'center',gap:5,shadowOpacity:.5,shadowRadius:13},secretTapProgressText:{color:'#fff',fontSize:9,fontWeight:'900',textAlign:'center'},secretTapProgressDots:{flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center'},secretTapProgressDot:{width:7,height:7,borderRadius:4,shadowOpacity:.8,shadowRadius:8},
 /* Full-screen secret door and three-page memory room */
 secretRoot:{flex:1,backgroundColor:'#070b1d',overflow:'hidden'},secretDoorLeaf:{position:'absolute',top:0,zIndex:4},secretDoorGardenShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,8,24,.12)',zIndex:1},secretDoorTitleBlock:{position:'absolute',left:18,right:18,top:'10%',alignItems:'center',zIndex:7},secretDoorKicker:{color:'#ffd166',fontSize:8,fontWeight:'900',letterSpacing:2,textAlign:'center',textShadowColor:'#000',textShadowRadius:10},secretDoorTitle:{color:'#fff',fontSize:25,fontWeight:'900',textAlign:'center',marginTop:8,textShadowColor:'#63e8ff',textShadowRadius:16},secretDoorSubtitle:{color:'#fff',fontSize:11,fontWeight:'800',textAlign:'center',marginTop:6,textShadowColor:'#000',textShadowRadius:8},secretDoorLockButton:{position:'absolute',top:'47%',left:'50%',marginLeft:-77,width:154,minHeight:122,alignItems:'center',justifyContent:'center',gap:4,zIndex:12,borderWidth:1.5,borderRadius:28,backgroundColor:'rgba(7,10,25,.52)',shadowOpacity:.7,shadowRadius:23,elevation:12},secretDoorLockGem:{width:76,height:76,borderRadius:38,borderWidth:2,backgroundColor:'rgba(6,11,26,.9)',alignItems:'center',justifyContent:'center',shadowOpacity:1,shadowRadius:20,elevation:8},secretDoorLockLabel:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center',textShadowColor:'#000',textShadowRadius:8},secretDoorBeam:{position:'absolute',width:7,height:'72%',top:'14%',left:'49.5%',zIndex:6,shadowOpacity:1,shadowRadius:26,elevation:15},secretDoorSeam:{position:'absolute',width:3,height:'78%',top:'11%',left:'49.85%',zIndex:6,shadowOpacity:1,shadowRadius:30,elevation:16},secretCongrats:{position:'absolute',top:'29%',left:25,right:25,zIndex:15,borderWidth:1.5,borderRadius:23,padding:14,backgroundColor:'rgba(7,11,29,.93)',alignItems:'center',shadowOpacity:1,shadowRadius:24,gap:5},secretCongratsTitle:{color:'#ffd166',fontSize:19,fontWeight:'900',textAlign:'center'},secretCongratsText:{color:'#fff',fontSize:12,fontWeight:'800',lineHeight:20,textAlign:'center'},secretDoorFlash:{...StyleSheet.absoluteFillObject,zIndex:20,backgroundColor:'rgba(255,255,255,.62)'},secretBackButton:{minHeight:43,paddingHorizontal:12,borderRadius:15,borderWidth:1,backgroundColor:'rgba(7,10,27,.87)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,alignSelf:'flex-start',shadowOpacity:.55,shadowRadius:11,elevation:5},secretBackSmall:{position:'absolute',top:13,left:12,zIndex:40,width:47,height:47,minHeight:47,paddingHorizontal:0,borderRadius:24,backgroundColor:'rgba(4,8,22,.88)'},secretBackText:{color:'#fff',fontSize:9,fontWeight:'900'},secretInsideShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(3,6,20,.48)'},secretInteriorHeader:{paddingHorizontal:10,paddingTop:10,paddingBottom:8,borderBottomWidth:1.2,backgroundColor:'rgba(6,9,26,.91)',zIndex:5},secretInteriorTopline:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7},secretPlaque:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:5},secretPlaqueEyebrow:{color:'#ffd166',fontSize:7,fontWeight:'900',letterSpacing:2},secretPlaqueTitle:{color:'#fff',fontSize:15,fontWeight:'900',textAlign:'center',marginTop:2},secretSettingsChestButton:{width:59,height:55,borderWidth:1.5,borderRadius:15,backgroundColor:'rgba(12,15,35,.88)',alignItems:'center',justifyContent:'center',shadowOpacity:.55,shadowRadius:12},secretSettingsChestMini:{width:49,height:37},secretTabRail:{flexDirection:'row',gap:6,marginTop:7},secretTabButton:{flex:1,minWidth:0,minHeight:57,borderRadius:15,borderWidth:1,backgroundColor:'rgba(7,10,28,.82)',alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:2,shadowOpacity:.2,shadowRadius:9,position:'relative'},secretTabButtonActive:{backgroundColor:'#d8faff',shadowOpacity:.75,shadowRadius:13,elevation:4},secretTabText:{color:'#fff',fontSize:9,fontWeight:'900',textAlign:'center'},secretTabTextActive:{color:'#071326'},secretTabTick:{position:'absolute',top:3,right:4,width:16,height:16,borderRadius:9,backgroundColor:'#72ffc5',alignItems:'center',justifyContent:'center'},secretScrollContent:{paddingHorizontal:12,paddingTop:10,paddingBottom:42,gap:11},secretSectionIntro:{alignItems:'center',paddingVertical:6,gap:4},secretSectionTitle:{color:'#fff',fontSize:20,fontWeight:'900',textAlign:'center',textShadowColor:'#63e8ff',textShadowRadius:12},secretSectionSub:{color:'rgba(255,255,255,.76)',fontSize:10,lineHeight:16,textAlign:'center',paddingHorizontal:12},secretChestGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:12,columnGap:8},secretChestCard:{width:'48.5%',minHeight:212,borderWidth:1.3,borderRadius:22,backgroundColor:'rgba(5,9,25,.91)',padding:6,alignItems:'center',justifyContent:'flex-start',overflow:'hidden',shadowOpacity:.35,shadowRadius:15,elevation:4},secretChestImageStage:{width:'100%',height:134,alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'},secretChestImage:{width:'100%',height:'100%'},secretChestPhotoBadge:{position:'absolute',top:7,right:7,width:38,height:32,borderRadius:8,borderWidth:1.5,borderColor:'#ffd166',overflow:'hidden',backgroundColor:'#0b1027'},secretChestPhotoThumb:{width:'100%',height:'100%'},secretNamePlaque:{minHeight:34,maxWidth:'97%',paddingHorizontal:12,paddingVertical:6,borderRadius:10,borderWidth:1.3,backgroundColor:'#131a31',alignItems:'center',justifyContent:'center',shadowColor:'#ffd166',shadowOpacity:.3,shadowRadius:8},secretChestName:{color:'#fff',fontSize:11,fontWeight:'900',textAlign:'center'},secretChestOpenLine:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,marginTop:6},secretChestOpenText:{fontSize:9,fontWeight:'900'},secretSettingsChestCard:{borderColor:'#ffd166',shadowColor:'#ffd166',shadowOpacity:.43,backgroundColor:'rgba(8,10,27,.96)'},secretSettingsChestCardImage:{width:'85%',height:128},secretSettingsChestDesc:{color:'#ffd166',fontSize:8,lineHeight:12,marginTop:5,textAlign:'center'},secretDetailWrap:{gap:12,paddingTop:58,paddingBottom:22},secretChestRevealStage:{height:300,alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'},secretChestLight:{position:'absolute',width:240,height:200,borderRadius:120,opacity:.3,shadowOpacity:1,shadowRadius:48,elevation:14},secretOpenChestArt:{width:'96%',height:'100%',position:'absolute',bottom:-8},secretFloatingMemory:{position:'absolute',top:30,width:146,height:104,borderRadius:13,borderWidth:3,borderColor:'#ffd166',overflow:'hidden',backgroundColor:'#091126',shadowColor:'#ffd166',shadowOpacity:1,shadowRadius:20,elevation:12},secretFloatingMemoryImage:{width:'100%',height:'100%'},secretFloatingMemoryGloss:{...StyleSheet.absoluteFillObject,borderWidth:1,borderColor:'rgba(255,255,255,.55)',borderRadius:10,backgroundColor:'rgba(255,255,255,.035)'},secretMemoryMessage:{marginHorizontal:4,padding:16,borderRadius:21,borderWidth:1.3,backgroundColor:'rgba(5,8,24,.91)',alignItems:'center',gap:8,shadowOpacity:.4,shadowRadius:18},secretMemoryMessageHeading:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:11},secretMemoryLabel:{color:'#ffd166',fontSize:12,fontWeight:'900',textAlign:'center'},secretMemoryText:{color:'#fff',fontSize:13,fontWeight:'700',lineHeight:24,textAlign:'center'},secretAlbumGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:10},secretAlbumCard:{width:'48.5%',minHeight:221,borderRadius:21,borderWidth:1.4,backgroundColor:'rgba(5,9,25,.91)',padding:7,alignItems:'center',overflow:'hidden',shadowOpacity:.27,shadowRadius:13,elevation:3},secretAlbumCoverStage:{width:'100%',height:121,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,.4)',overflow:'hidden',position:'relative'},secretAlbumCover:{width:'100%',height:'100%'},secretAlbumCornerRibbon:{position:'absolute',top:6,right:6,width:28,height:28,borderRadius:9,backgroundColor:'#ffd166',alignItems:'center',justifyContent:'center'},secretAlbumPhotoStrip:{flexDirection:'row',gap:3,marginVertical:6,width:'100%',height:33},secretAlbumMiniPhoto:{flex:1,height:33,borderRadius:5,borderWidth:1,borderColor:'rgba(255,255,255,.35)'},secretAlbumOpenText:{color:'#ff9bdd',fontSize:9,fontWeight:'900',marginTop:5},secretAlbumDetailGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:10},secretAlbumDetailPhotoFrame:{width:'48.5%',height:146,borderRadius:17,borderWidth:1.4,borderColor:'#ff79c8',padding:4,backgroundColor:'rgba(8,10,27,.91)',position:'relative',shadowColor:'#ff79c8',shadowOpacity:.35,shadowRadius:12},secretAlbumDetailPhoto:{width:'100%',height:'100%',borderRadius:12},secretPhotoNumberPlaque:{position:'absolute',bottom:7,right:7,paddingHorizontal:8,paddingVertical:4,borderRadius:8,borderWidth:1,borderColor:'#ffd166',backgroundColor:'rgba(6,9,24,.9)'},secretPhotoNumberText:{color:'#ffd166',fontSize:9,fontWeight:'900'},

 /* Equalizer V3.3.23 — three independent landscape audio screens */
 eqHeaderLauncher:{position:'absolute',top:48,left:4,width:36,height:36,borderRadius:18,borderWidth:1.3,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.88)',shadowOpacity:.55,shadowRadius:10,elevation:8},eqHeaderLauncherImage:{width:30,height:30,resizeMode:'contain'},
 eqBackgroundShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(4,6,19,.66)'},eqOrientationWait:{flex:1,alignItems:'center',justifyContent:'center',gap:12,padding:26,backgroundColor:'rgba(4,6,19,.92)'},
 eqSoundPage:{flex:1,flexDirection:'row',padding:8,gap:8,minHeight:0},eqSoundMain:{flex:1.05,minWidth:245,gap:8},eqCurrentSong:{flexDirection:'row',alignItems:'center',gap:10,padding:11,minHeight:74,borderRadius:18,borderWidth:1,backgroundColor:'rgba(7,10,28,.82)',shadowOpacity:.24,shadowRadius:13},eqSoundDisc:{width:50,height:50,borderRadius:25,borderWidth:1.5,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.9)',shadowOpacity:.5,shadowRadius:10},eqNowPlayingLabel:{color:'rgba(255,255,255,.68)',fontSize:9,fontWeight:'800'},eqNowPlayingTitle:{color:'#fff',fontSize:12,fontWeight:'900',marginTop:3},eqNowPlayingArtist:{color:'rgba(255,255,255,.6)',fontSize:9,marginTop:2},eqNowPlayingState:{color:'#72ffc5',fontSize:8,marginTop:5},eqSoundTransport:{flexDirection:'row',gap:6},eqSoundAction:{flex:1,minHeight:42,paddingHorizontal:6,borderRadius:13,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,backgroundColor:'rgba(8,9,27,.75)'},eqSoundActionText:{color:'#fff',fontSize:8,fontWeight:'900'},eqGlobalControlRow:{gap:8},eqGlobalControl:{padding:8,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,.13)',backgroundColor:'rgba(8,9,27,.64)'},eqControlValueRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5,marginTop:7},eqSmallKnob:{width:27,height:27,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,.23)',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,9,27,.9)'},eqGainMeter:{flex:1,minWidth:35,height:8,flexDirection:'row',gap:2,alignItems:'center'},eqGainSegment:{flex:1,height:7,borderRadius:3},eqRateChip:{minWidth:34,height:26,paddingHorizontal:4,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center'},eqRateChipText:{fontSize:8,fontWeight:'900'},eqBandsPanel:{flex:1.45,minWidth:300,borderWidth:1,borderRadius:18,padding:10,backgroundColor:'rgba(6,8,25,.82)'},eqPanelTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},eqMainTitle:{color:'#fff',fontSize:17,fontWeight:'900'},eqStatusPill:{height:23,paddingHorizontal:8,borderRadius:12,borderWidth:1,flexDirection:'row',alignItems:'center',gap:5},eqStatusDot:{width:7,height:7,borderRadius:4,backgroundColor:'#72ffc5'},eqStatusText:{color:'rgba(255,255,255,.82)',fontSize:8,fontWeight:'800'},eqBandGrid:{flex:1,flexDirection:'row',justifyContent:'space-around',alignItems:'stretch',gap:4,paddingTop:9},eqBandControl:{flex:1,minWidth:42,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:'rgba(255,255,255,.1)',backgroundColor:'rgba(255,255,255,.025)',paddingVertical:7},eqBandName:{color:'rgba(255,255,255,.8)',fontSize:8,fontWeight:'900'},eqBandMeter:{height:78,justifyContent:'center',gap:4,marginVertical:5},eqBandSegment:{width:26,height:4,borderRadius:3},eqBandAdjust:{flexDirection:'row',gap:6},eqBandButton:{width:27,height:27,borderRadius:9,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(5,8,22,.92)'},eqPresetRow:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:8},eqPresetButton:{flex:1,minWidth:56,height:31,paddingHorizontal:4,borderRadius:10,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3},eqPresetText:{fontSize:8,fontWeight:'900'},eqBassRow:{marginTop:7,paddingTop:7,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.12)',flexDirection:'row',alignItems:'center',gap:8},eqPowerPill:{height:33,minWidth:82,paddingHorizontal:10,borderRadius:12,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},eqSongLibrary:{width:235,minWidth:195,borderWidth:1,borderRadius:17,padding:8,backgroundColor:'rgba(6,8,25,.82)'},eqLibraryTitle:{color:'#fff',fontSize:11,fontWeight:'900'},eqTinyAction:{width:28,height:28,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},eqLibraryHint:{color:'rgba(255,255,255,.62)',fontSize:9,lineHeight:15,marginVertical:5},eqSongRow:{minHeight:38,paddingHorizontal:7,paddingVertical:4,borderRadius:10,borderWidth:1,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(255,255,255,.025)'},eqSongRowTitle:{color:'#fff',fontSize:9,fontWeight:'800'},eqSongRowArtist:{color:'rgba(255,255,255,.52)',fontSize:8,marginTop:2},
 eqDjPage:{flex:1,minHeight:0},eqDjToolbar:{minHeight:39,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.1)'},eqDjStatusText:{color:'#fff',fontSize:9,fontWeight:'900'},eqPowerButton:{height:31,minWidth:78,paddingHorizontal:10,borderRadius:12,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,shadowOpacity:.4,shadowRadius:10},eqPowerButtonText:{fontSize:9,fontWeight:'900'},eqDjStage:{padding:8,gap:8,alignItems:'stretch',flexGrow:1},eqDeckPanel:{width:310,padding:8,borderRadius:20,borderWidth:1,backgroundColor:'rgba(5,8,24,.92)',shadowRadius:18,elevation:6},eqDeckTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5,minHeight:38},eqDeckName:{fontSize:14,fontWeight:'900',letterSpacing:1.5},eqDeckSong:{maxWidth:246,color:'rgba(255,255,255,.76)',fontSize:8,marginTop:2},eqDeckState:{width:9,height:9,borderRadius:5,shadowOpacity:.8,shadowRadius:8},eqPlatterWrap:{height:174,alignItems:'center',justifyContent:'center',position:'relative'},eqPlatterOuter:{width:158,height:158,borderRadius:79,borderWidth:4,backgroundColor:'#070a19',alignItems:'center',justifyContent:'center',shadowRadius:22,elevation:8},eqPlatterRing:{position:'absolute',width:148,height:148,borderRadius:74,borderWidth:2,borderColor:'rgba(255,255,255,.12)'},eqPlatterTicks:{position:'absolute',width:150,height:150,borderRadius:75,alignItems:'center',justifyContent:'center'},eqPlatterTick:{position:'absolute',width:2,height:8,borderRadius:2,backgroundColor:'rgba(230,238,255,.8)'},eqPlatterGroove:{position:'absolute',borderWidth:1,borderRadius:120,opacity:.75},eqPlatterInner:{width:89,height:89,borderRadius:45,borderWidth:1.5,alignItems:'center',justifyContent:'center',backgroundColor:'#0f1430'},eqPlatterCore:{width:48,height:48,borderRadius:24,borderWidth:1,alignItems:'center',justifyContent:'center'},eqPlatterLabel:{fontSize:15,fontWeight:'900',marginTop:2},eqPlatterSub:{color:'rgba(255,255,255,.5)',fontSize:6,letterSpacing:1.1,marginTop:2},eqPlatterPowerRing:{position:'absolute',width:166,height:166,borderRadius:83,borderWidth:1.5,shadowRadius:15},eqPlatterHint:{position:'absolute',bottom:0,fontSize:7,fontWeight:'800'},eqDeckTime:{flexDirection:'row',justifyContent:'space-between',gap:5,marginVertical:3},eqDeckTimeText:{color:'rgba(255,255,255,.66)',fontSize:8,fontWeight:'800'},eqDeckWave:{height:31,flexDirection:'row',alignItems:'center',gap:3,justifyContent:'center',paddingHorizontal:6,marginVertical:3,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)'},eqDeckWaveBar:{flex:1,minHeight:3,borderRadius:3},eqDeckTransport:{flexDirection:'row',gap:4,justifyContent:'space-between',marginTop:5},eqDeckButton:{flex:1,minWidth:0,minHeight:31,paddingHorizontal:4,borderRadius:10,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,backgroundColor:'rgba(255,255,255,.035)'},eqDeckButtonText:{color:'#fff',fontSize:7,fontWeight:'900'},eqDeckRotaryRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',gap:8,marginTop:6,paddingVertical:5,borderTopWidth:1,borderBottomWidth:1,borderColor:'rgba(255,255,255,.09)'},eqDeckRotaryReadout:{alignItems:'center',justifyContent:'center',minWidth:62,gap:6},eqRotaryLevelMeter:{width:52,height:7,flexDirection:'row',gap:2,marginTop:4},eqDeckControlLine:{minHeight:31,flexDirection:'row',alignItems:'center',gap:5,marginTop:3,paddingHorizontal:3},eqDeckControlTitle:{color:'rgba(255,255,255,.72)',fontSize:8,fontWeight:'900'},eqDeckControlValue:{fontSize:9,fontWeight:'900',minWidth:28,textAlign:'center'},eqDeckEqPanel:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,marginTop:6,padding:6,borderWidth:1,borderColor:'rgba(255,255,255,.1)',borderRadius:10},eqDeckEqCol:{alignItems:'center',gap:4},eqDeckEqLabel:{color:'rgba(255,255,255,.65)',fontSize:6,fontWeight:'900'},eqDeckEqButtons:{flexDirection:'row',gap:3},eqDeckEqDot:{width:9,height:9,borderRadius:5,borderWidth:1,borderColor:'rgba(255,255,255,.16)',backgroundColor:'rgba(255,255,255,.05)'},eqCrossArea:{marginTop:7,padding:7,borderRadius:12,borderWidth:1,borderColor:'rgba(178,140,255,.32)',backgroundColor:'rgba(178,140,255,.05)'},eqCrossTrack:{height:25,marginVertical:7,borderRadius:13,borderWidth:1,borderColor:'rgba(255,255,255,.2)',backgroundColor:'rgba(255,255,255,.035)',flexDirection:'row',alignItems:'center',justifyContent:'space-around',position:'relative',paddingHorizontal:7},eqCrossTick:{width:2,height:7,borderRadius:2},eqCrossKnob:{position:'absolute',top:1,width:20,height:20,borderRadius:10,borderWidth:2,backgroundColor:'#17152d',shadowColor:'#b28cff',shadowOpacity:.65,shadowRadius:8,elevation:3},eqCrossButtons:{flexDirection:'row',justifyContent:'space-between',gap:5},eqMixButton:{flex:1,height:25,borderRadius:8,borderWidth:1,borderColor:'rgba(178,140,255,.4)',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:3},eqMixButtonText:{color:'#fff',fontSize:8,fontWeight:'900'},eqMasterLine:{marginTop:6,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:4},eqMixerTitle:{color:'#fff',fontSize:12,fontWeight:'900',letterSpacing:1.8,textAlign:'center',marginTop:5},eqCenterMixer:{width:245,padding:7,borderRadius:18,borderWidth:1,backgroundColor:'rgba(8,9,28,.93)',shadowRadius:22,elevation:6},eqTouchMonitor:{height:263,borderRadius:12,borderWidth:1.5,backgroundColor:'#050817',padding:7,shadowRadius:15},eqMonitorTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5},eqMonitorBrand:{fontSize:8,fontWeight:'900',letterSpacing:.7},eqMonitorSub:{color:'rgba(255,255,255,.5)',fontSize:6,marginTop:2},eqMonitorLed:{width:7,height:7,borderRadius:4},eqMonitorWave:{height:48,marginTop:7,paddingHorizontal:2,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2,borderRadius:7,backgroundColor:'rgba(100,245,255,.06)'},eqMonitorBar:{flex:1,minHeight:3,borderRadius:2},eqMonitorNow:{paddingVertical:5,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.12)'},eqMonitorTransportRow:{flexDirection:'row',justifyContent:'center',gap:5,marginTop:4},eqMonitorTransport:{width:31,height:25,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.035)'},eqMonitorTransportText:{color:'#fff',fontSize:7,fontWeight:'900'},eqDeckTargetRow:{flexDirection:'row',gap:4,marginTop:5},eqDeckTarget:{flex:1,height:24,borderRadius:7,borderWidth:1,alignItems:'center',justifyContent:'center'},eqDeckTargetText:{fontSize:7,fontWeight:'900'},eqMonitorSongList:{flex:1,marginTop:3},eqMonitorSongRow:{minHeight:20,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:3,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.055)'},eqMonitorSongText:{color:'rgba(255,255,255,.85)',fontSize:7,flex:1},eqMixSaveNote:{color:'rgba(255,255,255,.55)',fontSize:8,lineHeight:13,textAlign:'center',paddingHorizontal:8},eqSaveMixRow:{flexDirection:'row',gap:4,marginTop:7},eqSaveMixSlot:{flex:1,alignItems:'center',padding:4,borderRadius:9,borderWidth:1,borderColor:'rgba(255,209,102,.17)',backgroundColor:'rgba(255,255,255,.02)',gap:3},eqSaveMixLabel:{color:'rgba(255,255,255,.58)',fontSize:6},eqSaveMixButton:{width:'100%',minHeight:25,borderRadius:7,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3},eqSaveMixButtonText:{color:'#fff',fontSize:7,fontWeight:'800'},
 eqLightsPage:{flex:1,padding:10,gap:9,minHeight:0},eqVisualHeader:{minHeight:55,paddingHorizontal:12,paddingVertical:8,borderRadius:16,borderWidth:1,backgroundColor:'rgba(7,9,25,.7)',flexDirection:'row',alignItems:'center',gap:10},eqLightsSub:{color:'rgba(255,255,255,.64)',fontSize:9,lineHeight:14,maxWidth:650,marginTop:3},eqSignalChip:{height:26,paddingHorizontal:9,borderRadius:13,borderWidth:1,flexDirection:'row',alignItems:'center',gap:5},eqVisualBody:{flex:1,flexDirection:'row',gap:10,minHeight:0},eqVisualControlPanel:{width:238,padding:12,borderRadius:18,borderWidth:1,backgroundColor:'rgba(6,8,25,.84)'},eqVisualModes:{gap:6,marginTop:7},eqVisualModeButton:{minHeight:35,paddingHorizontal:8,borderRadius:11,borderWidth:1,flexDirection:'row',alignItems:'center',gap:8},eqSensitivityRow:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:8},eqVisualStageBorder:{flex:1,minWidth:300,borderWidth:1.5,borderRadius:22,padding:4,backgroundColor:'rgba(4,6,19,.85)',shadowRadius:24},
 eqCustomizationOverlay:{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:50,justifyContent:'center',alignItems:'center'},eqCustomizationScrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.72)'},eqCustomizationSheet:{width:'92%',maxWidth:680,maxHeight:'94%',margin:8,padding:13,borderRadius:20,borderWidth:1.5,backgroundColor:'#10132b',shadowOpacity:.35,shadowRadius:20},eqCustomizationSheetHead:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},eqCustomizationClose:{width:38,height:38,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center'},eqColorChoices:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:8},eqColorChoice:{width:31,height:31,borderRadius:16,borderWidth:2,alignItems:'center',justifyContent:'center'},eqBackgroundChoices:{flexDirection:'row',gap:6,marginTop:7},eqBackgroundButton:{flex:1,minHeight:40,paddingHorizontal:5,borderRadius:12,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},eqCustomBgPreview:{height:66,marginTop:8,borderRadius:10,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.2)'},eqCustomBgBadge:{position:'absolute',left:7,bottom:6,height:23,paddingHorizontal:8,borderRadius:11,backgroundColor:'rgba(4,6,19,.8)',flexDirection:'row',alignItems:'center',gap:5},eqCustomBgBadgeText:{color:'#fff',fontSize:8,fontWeight:'900'},eqCustomizationResetButton:{height:40,marginTop:9,borderRadius:12,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
 /* Personalization console */
 secretSettingsRoot:{flex:1,backgroundColor:'#080b20',overflow:'hidden'},secretSettingsContent:{paddingHorizontal:12,paddingTop:62,paddingBottom:35,gap:12},secretSettingsIntro:{flexDirection:'row',alignItems:'center',gap:9,padding:12,borderRadius:20,borderWidth:1,borderColor:'rgba(99,232,255,.3)',backgroundColor:'rgba(9,13,34,.86)'},secretSettingsIntroImage:{width:86,height:70},secretSettingsTitle:{color:'#fff',fontSize:14,fontWeight:'900'},secretSettingsSub:{color:'rgba(255,255,255,.68)',fontSize:9,lineHeight:15,marginTop:5},secretSettingsGroup:{padding:11,borderRadius:21,borderWidth:1,borderColor:'rgba(99,232,255,.24)',backgroundColor:'rgba(10,13,32,.88)',gap:9},secretBgEditor:{gap:7,padding:8,borderRadius:15,borderWidth:1,borderColor:'rgba(255,255,255,.12)',backgroundColor:'rgba(4,7,20,.5)'},secretSettingsGroupTitle:{color:'#ffd166',fontSize:15,fontWeight:'900',textAlign:'center',marginBottom:3},secretSettingsHint:{color:'rgba(255,255,255,.66)',fontSize:9,lineHeight:15},secretSettingsButtonRow:{flexDirection:'row',gap:8,justifyContent:'space-between'},secretSettingAction:{minHeight:65,flex:1,padding:7,borderRadius:15,borderWidth:1,backgroundColor:'rgba(6,9,26,.9)',flexDirection:'row',alignItems:'center',gap:7,shadowOpacity:.18,shadowRadius:8},secretSettingActionActive:{borderWidth:2,borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.10)',shadowOpacity:.45},secretSettingActionImageWrap:{width:45,height:45,borderRadius:11,borderWidth:1,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.04)'},secretSettingActionImage:{width:'100%',height:'100%'},secretSettingActionLabel:{color:'#fff',fontSize:9,fontWeight:'900',lineHeight:14},secretSettingActionSub:{color:'rgba(255,255,255,.58)',fontSize:7,lineHeight:11,marginTop:3},secretEditorCard:{padding:10,borderRadius:17,borderWidth:1,borderColor:'rgba(255,255,255,.15)',backgroundColor:'rgba(3,6,21,.6)',gap:8},secretEditorCardHeader:{flexDirection:'row',alignItems:'center',gap:9},secretEditorChestImage:{width:84,height:66,borderRadius:10},secretEditorTitle:{color:'#fff',fontSize:11,fontWeight:'900'},secretIndexBadge:{width:28,height:28,borderRadius:14,borderWidth:1,borderColor:'#ffd166',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,209,102,.1)'},secretIndexBadgeText:{color:'#ffd166',fontSize:10,fontWeight:'900'},secretFieldLabel:{color:'#63e8ff',fontSize:9,fontWeight:'900',marginTop:3},secretTextInput:{minHeight:42,borderRadius:12,borderWidth:1,borderColor:'rgba(99,232,255,.32)',backgroundColor:'rgba(3,7,22,.9)',paddingHorizontal:11,paddingVertical:8,color:'#fff',fontSize:10,textAlign:'right'},secretTextArea:{minHeight:71,textAlignVertical:'top',lineHeight:19},secretSettingsSaving:{color:'#72ffc5',fontSize:10,fontWeight:'900',textAlign:'center'},secretChestStyleGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8},secretChestStyleChoice:{width:'47%',minHeight:147,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,.2)',backgroundColor:'rgba(6,9,25,.9)',alignItems:'center',justifyContent:'center',padding:6,gap:3},secretChestStyleChoiceActive:{borderWidth:2,borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.10)'},secretChestStyleImage:{width:'100%',height:102},secretEffectGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8},secretEffectChoice:{width:'47%',minHeight:112,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,.18)',backgroundColor:'rgba(6,9,25,.88)',alignItems:'center',justifyContent:'center',padding:8,gap:6},secretEffectChoiceActive:{borderColor:'#72ffc5',borderWidth:2,backgroundColor:'rgba(114,255,197,.1)',shadowColor:'#72ffc5',shadowOpacity:.45,shadowRadius:10},secretEffectPreview:{width:54,height:54,borderRadius:27,borderWidth:1,borderColor:'rgba(255,255,255,.22)',backgroundColor:'rgba(99,232,255,.06)',alignItems:'center',justifyContent:'center'},secretEffectCore:{position:'absolute',width:12,height:12,borderRadius:8,shadowOpacity:1,shadowRadius:14,elevation:6},secretEffectHalo:{position:'absolute',width:37,height:37,borderRadius:22,borderWidth:1.5,shadowOpacity:.9,shadowRadius:8},secretEffectOrbitVisual:{position:'absolute',width:50,height:23,borderRadius:25,borderWidth:2,shadowOpacity:.9,shadowRadius:8},secretEffectRayVisual:{position:'absolute',width:3,height:20,borderRadius:3,shadowColor:'#63e8ff',shadowOpacity:.8,shadowRadius:8,elevation:4},secretEffectPetal:{position:'absolute',width:7,height:7,borderRadius:5,shadowColor:'#fff',shadowOpacity:.9,shadowRadius:7,elevation:4},secretFramePresetRow:{flexDirection:'row',gap:7},secretFramePresetCard:{flex:1,minWidth:0,height:112,padding:5,borderWidth:1,borderRadius:14,backgroundColor:'rgba(4,7,20,.88)',alignItems:'center',justifyContent:'center',gap:5,position:'relative'},secretFramePresetActive:{borderWidth:2,backgroundColor:'rgba(114,255,197,.09)',shadowColor:'#72ffc5',shadowOpacity:.32,shadowRadius:10},secretFramePresetThumb:{width:'100%',height:67},secretFramePresetName:{color:'#fff',fontSize:7,fontWeight:'900',textAlign:'center'},secretFrameOverlay:{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%',zIndex:3},secretFrameDim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(3,6,18,.12)'},secretFrameBack:{position:'absolute',top:10,left:10,zIndex:10,width:47,height:47,minHeight:47,paddingHorizontal:0,borderRadius:24,borderWidth:1,backgroundColor:'rgba(5,9,24,.9)',alignItems:'center',justifyContent:'center',shadowOpacity:.65,shadowRadius:12,elevation:5},secretFrameBackText:{color:'#fff',fontSize:9,fontWeight:'900'},secretFrameWaiting:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#050817',padding:20},secretFrameWaitingHalo:{position:'absolute',width:220,height:140,borderRadius:70,borderWidth:2,borderColor:'#63e8ff',shadowColor:'#63e8ff',shadowOpacity:.7,shadowRadius:28},secretFrameWaitingImage:{width:'72%',height:'38%',maxWidth:620},secretFrameWaitingText:{marginTop:18,color:'#fff',fontSize:12,fontWeight:'900',textAlign:'center'},
  optionSubLabel:{color:'rgba(255,255,255,.58)',fontSize:9,lineHeight:15,marginTop:4},detailBackButton:{width:46,height:46,borderRadius:23,borderWidth:1,backgroundColor:'rgba(7,9,25,.82)',alignItems:'center',justifyContent:'center',shadowOpacity:.45,shadowRadius:12},detailBackImage:{width:28,height:28},detailIconImage:{width:42,height:42},cameraOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.94)',alignItems:'center',justifyContent:'center'},cameraPermissionCard:{width:'88%',maxWidth:430,borderRadius:28,borderWidth:1,borderColor:'#ff6b8a',backgroundColor:'#0b1028',padding:22,alignItems:'center',gap:10,shadowColor:'#ff6b8a',shadowOpacity:.45,shadowRadius:24},cameraOverlayIcon:{width:78,height:78},cameraOverlayTitle:{color:'#fff',fontSize:17,fontWeight:'900',textAlign:'center'},cameraOverlayText:{color:'rgba(255,255,255,.68)',fontSize:10,lineHeight:17,textAlign:'center'},cameraSecondaryButton:{width:48,height:48,borderRadius:24,borderWidth:1,borderColor:'#63e8ff',alignItems:'center',justifyContent:'center'},cameraStage:{width:'94%',height:'84%',maxWidth:720,borderRadius:28,overflow:'hidden',borderWidth:1.5,borderColor:'#63e8ff',backgroundColor:'#050817',shadowColor:'#63e8ff',shadowOpacity:.35,shadowRadius:22},cameraHud:{position:'absolute',left:14,right:14,top:14,minHeight:48,borderRadius:18,borderWidth:1,borderColor:'rgba(255,255,255,.24)',backgroundColor:'rgba(4,7,20,.65)',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},cameraLiveLed:{width:9,height:9,borderRadius:5,shadowOpacity:.9,shadowRadius:8},cameraHudText:{flex:1,color:'#fff',fontSize:11,fontWeight:'900'},cameraHudTimer:{color:'#fff',fontSize:12,fontWeight:'900'},cameraBottomBar:{position:'absolute',left:0,right:0,bottom:0,minHeight:82,paddingHorizontal:18,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'rgba(4,7,20,.66)'},cameraActionButton:{width:58,height:58,borderRadius:29,borderWidth:1.5,borderColor:'#fff',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,.36)'},cameraActionImage:{width:34,height:34},cameraEmergencyBadge:{minHeight:54,paddingHorizontal:14,borderRadius:18,borderWidth:1,borderColor:'#ff6b8a',backgroundColor:'rgba(255,107,138,.12)',flexDirection:'row',alignItems:'center',gap:8},cameraEmergencyBadgeText:{color:'#fff',fontSize:9,fontWeight:'900'},cameraSavedBadge:{position:'absolute',left:20,right:20,bottom:20,minHeight:48,borderRadius:17,borderWidth:1,borderColor:'#72ffc5',backgroundColor:'rgba(4,10,25,.92)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},cameraSavedText:{color:'#72ffc5',fontSize:10,fontWeight:'900'},cameraContactSummary:{minHeight:72,padding:10,borderRadius:20,borderWidth:1,borderColor:'rgba(255,121,200,.35)',backgroundColor:'rgba(7,9,25,.65)',flexDirection:'row',alignItems:'center',gap:10},cameraSummaryArt:{width:48,height:48},cameraSummaryTitle:{color:'#fff',fontSize:11,fontWeight:'900'},cameraSummaryText:{color:'rgba(255,255,255,.58)',fontSize:9,marginTop:4},contactSelectCard:{minHeight:68,paddingHorizontal:10,borderRadius:18,borderWidth:1,borderColor:'rgba(255,121,200,.28)',backgroundColor:'rgba(7,9,25,.66)',flexDirection:'row',alignItems:'center',gap:10},contactSelectCardActive:{borderWidth:2,borderColor:'#72ffc5',backgroundColor:'rgba(114,255,197,.08)',shadowColor:'#72ffc5',shadowOpacity:.35,shadowRadius:12},contactSelectArt:{width:42,height:42},contactSelectName:{color:'#fff',fontSize:11,fontWeight:'900'},contactSelectNumber:{color:'rgba(255,255,255,.58)',fontSize:9,marginTop:3},emergencyActionRow:{flexDirection:'row',gap:10,marginTop:8},emergencyAction:{flex:1,minHeight:58,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,backgroundColor:'rgba(8,10,30,.78)'},emergencyActionArt:{width:32,height:32},emergencyActionText:{color:'#fff',fontSize:9,fontWeight:'900'},batteryCard:{minHeight:92,padding:12,borderRadius:22,borderWidth:1,borderColor:'rgba(99,232,255,.28)',backgroundColor:'rgba(7,9,25,.68)',flexDirection:'row',alignItems:'center',gap:11},batteryArt:{width:64,height:64},batteryTitle:{color:'#fff',fontSize:12,fontWeight:'900'},batteryLevel:{color:'#fff',fontSize:22,fontWeight:'900',marginTop:3},batteryState:{fontSize:9,fontWeight:'800',marginTop:2}

});
