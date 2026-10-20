import {NativeModules, Platform} from 'react-native';

const Native = NativeModules.LotusBleModule;

export const LotusBle = {
  available: Platform.OS === 'android' && !!Native,
  scan: (): Promise<any[]> => Native?.scan?.() ?? Promise.resolve([]),
  connect: (address: string): Promise<boolean> => Native?.connect?.(address) ?? Promise.resolve(false),
  disconnect: (): Promise<boolean> => Native?.disconnect?.() ?? Promise.resolve(false),
  power: (on: boolean): Promise<boolean> => Native?.power?.(on) ?? Promise.resolve(false),
  brightness: (value: number): Promise<boolean> => Native?.brightness?.(value) ?? Promise.resolve(false),
  speed: (value: number): Promise<boolean> => Native?.speed?.(value) ?? Promise.resolve(false),
  color: (r:number,g:number,b:number): Promise<boolean> => Native?.color?.(r,g,b) ?? Promise.resolve(false),
  mode: (id:number): Promise<boolean> => Native?.mode?.(id) ?? Promise.resolve(false),
  scene: (id:number): Promise<boolean> => Native?.scene?.(id) ?? Promise.resolve(false),
  mic: (on:boolean): Promise<boolean> => Native?.mic?.(on) ?? Promise.resolve(false),
  isConnected: (): Promise<boolean> => Native?.isConnected?.() ?? Promise.resolve(false),
  isEnabled: (): Promise<boolean> => Native?.isEnabled?.() ?? Promise.resolve(false),
  requestEnable: (): Promise<boolean> => Native?.requestEnable?.() ?? Promise.resolve(false),
  openBluetoothSettings: (): Promise<boolean> => Native?.openBluetoothSettings?.() ?? Promise.resolve(false),
  openWifiPanel: (): Promise<boolean> => Native?.openWifiPanel?.() ?? Promise.resolve(false),
  hideSystemNavigationBar: (): Promise<boolean> => Native?.hideSystemNavigationBar?.() ?? Promise.resolve(false),
};
