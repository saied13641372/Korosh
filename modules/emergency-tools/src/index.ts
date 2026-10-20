import {NativeModules, Platform} from 'react-native';
const Native:any=NativeModules.EmergencyToolsModule;
export const EmergencyTools={
  available:Platform.OS==='android'&&!!Native,
  sendSms:(numbers:string[],body:string)=>Native?.sendSms?.(numbers,body)??Promise.resolve({ok:false,error:'UNAVAILABLE'}),
  callPhone:(number:string)=>Native?.callPhone?.(number)??Promise.resolve({ok:false,error:'UNAVAILABLE'}),
  startCameraStream:(port:number=8787,durationSeconds:number=600)=>Native?.startCameraStream?.(port,durationSeconds)??Promise.resolve({started:false,error:'UNAVAILABLE'}),
  stopCameraStream:()=>Native?.stopCameraStream?.()??Promise.resolve(false),
  getCameraStreamInfo:()=>Native?.getCameraStreamInfo?.()??Promise.resolve({running:false,url:null}),
};
