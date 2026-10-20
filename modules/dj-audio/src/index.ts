import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

const Native = NativeModules.KoroshDjAudioModule;
const emitter = Platform.OS === 'android' && Native ? new NativeEventEmitter(Native) : null;

export type MusicLibraryTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  uri: string;
};

export type MusicPlaybackStatus = {
  playing: boolean;
  loading?: boolean;
  uri: string;
  title: string;
  artist: string;
};

export const DjAudio = {
  available: Platform.OS === 'android' && !!Native,
  load: (uri:string): Promise<boolean> => Native?.load?.(uri) ?? Promise.resolve(false),
  loadDeck: (deck:number, uri:string): Promise<boolean> => Native?.loadDeck?.(deck,uri) ?? Promise.resolve(false),
  playDeck: (deck:number): Promise<boolean> => Native?.playDeck?.(deck) ?? Promise.resolve(false),
  pauseDeck: (deck:number): Promise<boolean> => Native?.pauseDeck?.(deck) ?? Promise.resolve(false),
  stopDeck: (deck:number): Promise<boolean> => Native?.stopDeck?.(deck) ?? Promise.resolve(false),
  cueDeck: (deck:number): Promise<boolean> => Native?.cueDeck?.(deck) ?? Promise.resolve(false),
  seekDeck: (deck:number, seconds:number): Promise<boolean> => Native?.seekDeck?.(deck,seconds) ?? Promise.resolve(false),
  setDeckVolume: (deck:number, value:number): Promise<boolean> => Native?.setDeckVolume?.(deck,value) ?? Promise.resolve(false),
  setDeckRate: (deck:number, value:number): Promise<boolean> => Native?.setDeckRate?.(deck,value) ?? Promise.resolve(false),
  setDeckEqBand: (deck:number, band:number, value:number): Promise<boolean> => Native?.setDeckEqBand?.(deck,band,value) ?? Promise.resolve(false),
  setDeckBassBoost: (deck:number, enabled:boolean): Promise<boolean> => Native?.setDeckBassBoost?.(deck,enabled) ?? Promise.resolve(false),
  getDeckStatus: (deck:number): Promise<any> => Native?.getDeckStatus?.(deck) ?? Promise.resolve({loaded:false,playing:false,positionMs:0,durationMs:0,uri:''}),
  play: (): Promise<boolean> => Native?.play?.() ?? Promise.resolve(false),
  pause: (): Promise<boolean> => Native?.pause?.() ?? Promise.resolve(false),
  stop: (): Promise<boolean> => Native?.stop?.() ?? Promise.resolve(false),
  seek: (seconds:number): Promise<boolean> => Native?.seek?.(seconds) ?? Promise.resolve(false),
  setVolume: (value:number): Promise<boolean> => Native?.setVolume?.(value) ?? Promise.resolve(false),
  setRate: (value:number): Promise<boolean> => Native?.setRate?.(value) ?? Promise.resolve(false),
  setEqBand: (band:number, value:number): Promise<boolean> => Native?.setEqBand?.(band,value) ?? Promise.resolve(false),
  setBassBoost: (enabled:boolean): Promise<boolean> => Native?.setBassBoost?.(enabled) ?? Promise.resolve(false),
  setEqPreset: (preset:number): Promise<boolean> => Native?.setEqPreset?.(preset) ?? Promise.resolve(false),
  cue: (): Promise<boolean> => Native?.cue?.() ?? Promise.resolve(false),
  sync: (): Promise<boolean> => Native?.sync?.() ?? Promise.resolve(false),
  listTracks: (): Promise<MusicLibraryTrack[]> => Native?.listTracks?.() ?? Promise.resolve([]),
  setMusicQueue: (items:MusicLibraryTrack[]): Promise<boolean> => Native?.setMusicQueue?.(items) ?? Promise.resolve(false),
  playMusicTrack: (uri:string, title:string, artist:string): Promise<boolean> => Native?.playMusicTrack?.(uri,title,artist) ?? Promise.resolve(false),
  pauseMusic: (): Promise<boolean> => Native?.pauseMusic?.() ?? Promise.resolve(false),
  resumeMusic: (): Promise<boolean> => Native?.resumeMusic?.() ?? Promise.resolve(false),
  stopMusic: (): Promise<boolean> => Native?.stopMusic?.() ?? Promise.resolve(false),
  getMusicStatus: (): Promise<MusicPlaybackStatus> => Native?.getMusicStatus?.() ?? Promise.resolve({playing:false,loading:false,uri:'',title:'',artist:''}),
  subscribe: (listener:(bars:number[])=>void) => emitter?.addListener('onAudioFrame',(e:any)=>listener(Array.isArray(e?.bars)?e.bars:[])) ?? {remove:()=>{}},
};
