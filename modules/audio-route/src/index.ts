import {Platform} from 'react-native';
import {requireNativeModule} from 'expo-modules-core';

type BluetoothAudioDevice = {name:string;type:number;id:number};
type AudioRouteNative = {getBluetoothAudioDevices:()=>Promise<{supported:boolean;devices:BluetoothAudioDevice[];error?:string;message?:string}>};

let native:AudioRouteNative|null=null;
try{native=Platform.OS==='android'?requireNativeModule<AudioRouteNative>('AudioRouteModule'):null;}catch{native=null;}

export const AudioRoute = {
  available: Platform.OS==='android' && !!native,
  getBluetoothAudioDevices: (): Promise<{supported:boolean;devices:BluetoothAudioDevice[];error?:string;message?:string}> =>
    native?.getBluetoothAudioDevices?.() ?? Promise.resolve({supported:false,devices:[],error:'NATIVE_MODULE_UNAVAILABLE'}),
};
