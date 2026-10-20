import {NativeModules, Platform} from 'react-native';
const Native = NativeModules.NoraVoiceModule;
export const NoraVoice = {
  available: Platform.OS==='android' && !!Native,
  start: (preferOffline:boolean=false): Promise<boolean> => Native?.start?.(preferOffline) ?? Promise.resolve(false),
  stop: (): Promise<boolean> => Native?.stop?.() ?? Promise.resolve(false),
  speak: (text:string): Promise<boolean> => Native?.speak?.(text) ?? Promise.resolve(false),
  setSpeaker: (speaker:boolean): Promise<boolean> => Native?.setSpeaker?.(speaker) ?? Promise.resolve(false),
  online: (): Promise<boolean> => Native?.online?.() ?? Promise.resolve(false),
};
