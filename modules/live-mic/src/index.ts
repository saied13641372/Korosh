import {Platform} from 'react-native';
import {requireNativeModule} from 'expo-modules-core';

type LiveMicNative={start:(options:{transport:'bluetooth'|'wifi'|'dual';host?:string;port?:number})=>Promise<{started:boolean;transport:string;sampleRate:number;packetFormat:string;error?:string}>;stop:()=>Promise<void>;isRunning:()=>Promise<boolean>};
let native:LiveMicNative|null=null;
try{native=Platform.OS==='android'?requireNativeModule<LiveMicNative>('LiveMicModule'):null;}catch{native=null;}
export const LiveMic={
  available:Platform.OS==='android'&&!!native,
  start:(options:{transport:'bluetooth'|'wifi'|'dual';host?:string;port?:number})=>native?.start(options)??Promise.resolve({started:false,transport:options.transport,sampleRate:16000,packetFormat:'KNLM-PCM16',error:'NATIVE_MODULE_UNAVAILABLE'}),
  stop:()=>native?.stop()??Promise.resolve(),
  isRunning:()=>native?.isRunning()??Promise.resolve(false),
};
