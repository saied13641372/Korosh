import * as FileSystem from 'expo-file-system/legacy';

const DEFAULT_TIMEOUT=1800;
function base(url:string){return String(url||'').trim().replace(/\/+$/,'');}
async function request(url:string, init:RequestInit={}, timeout=DEFAULT_TIMEOUT){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{...init,signal:controller.signal,headers:{Accept:'application/json',...(init.headers||{})}});
    if(!response.ok)return null;
    const text=await response.text();
    if(!text)return {ok:true};
    try{return JSON.parse(text)}catch{return {ok:true,raw:text}};
  }finally{clearTimeout(timer)}
}
export const WifiEsp32={
  ping:async(url:string)=>{
    const root=base(url); if(!root)return false;
    try{const d:any=await request(`${root}/api/health`,{},1200);return d?.ok===true&&(d?.device==='korosh-nova'||d?.protocol===1||d?.service==='korosh-nova');}catch{return false;}
  },
  command:async(url:string,command:string,args:Record<string,any>={})=>{
    const root=base(url); if(!root)return false;
    try{const d:any=await request(`${root}/api/command`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocol:1,command,args})});return d?.ok===true;}catch{return false;}
  },

  readStatus:async(url:string)=>{
    const root=base(url);if(!root)return null;
    try{
      const alive=await WifiEsp32.ping(root);if(!alive)return null;
      const d:any=await request(`${root}/api/status`,{},2200);
      if(!d||typeof d!=='object')return null;
      const payload:any=(d.status&&typeof d.status==='object')?d.status:(d.data&&typeof d.data==='object')?d.data:d;
      const fuses=payload.fuses||payload.fuseStates||payload.fuseStatus;
      const touchButtons=payload.touchButtons||payload.touch_buttons||payload.touch||payload.buttons;
      const batteries=payload.batteries||((payload.battery1||payload.battery2)?{battery1:payload.battery1||null,battery2:payload.battery2||null}:payload.battery||null);
      const usableFuses=!!fuses&&typeof fuses==='object';
      const usableTouches=!!touchButtons&&typeof touchButtons==='object';
      const hasDeviceEvents=['usb','usbConnected','deviceReady','ready','deviceFault','fault','error','system','controller','health','battery','batteryLow','power','speakerPower','amplifierPower','childLock','child_lock','touchLock','security','battery1','battery2','batteries'].some(key=>Object.prototype.hasOwnProperty.call(payload,key));
      if(!usableFuses&&!usableTouches&&!hasDeviceEvents)return null;
      return {fuses:usableFuses?fuses:null,touchButtons:usableTouches?touchButtons:null,batteries:batteries&&typeof batteries==='object'?batteries:null,raw:payload,receivedAt:Date.now()};
    }catch{return null;}
  },
  uploadAndPlay:async(url:string,fileUri:string,title:string,artist:string)=>{
    const root=base(url); if(!root||!fileUri)return false;
    try{
      const endpoint=`${root}/api/music/upload?title=${encodeURIComponent(title||'')}&artist=${encodeURIComponent(artist||'')}`;
      const result=await FileSystem.uploadAsync(endpoint,fileUri,{httpMethod:'POST',uploadType:FileSystem.FileSystemUploadType.BINARY_CONTENT,headers:{'Content-Type':'application/octet-stream','X-Korosh-Protocol':'1'}});
      if(result.status<200||result.status>=300)return false;
      const d:any=JSON.parse(result.body||'{}');
      if(d?.ok!==true)return false;
      if(d?.trackId)return WifiEsp32.command(root,'music.play',{trackId:d.trackId,title:title||'',artist:artist||''});
      return true;
    }catch{return false;}
  },
  playback:async(url:string,action:'play'|'pause'|'resume'|'stop',args:Record<string,any>={})=>WifiEsp32.command(url,`music.${action}`,args),
};
