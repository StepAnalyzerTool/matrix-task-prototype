/* Standard Bluetooth Heart Rate Measurement; RR units are 1/1024 second. */
(function(root){
'use strict';
function decode(view){
 if(view.byteLength<2)throw Error('Short heart-rate packet');
 let i=1;const flags=view.getUint8(0);
 const read16=()=>{if(i+2>view.byteLength)throw Error('Short heart-rate packet');const n=view.getUint16(i,true);i+=2;return n;};
 const bpm=flags&1?read16():view.getUint8(i++);
 const energy=flags&8?read16():null,rr=[];
 if(flags&16){while(i<view.byteLength)rr.push(read16());if(!rr.length)throw Error('Missing RR intervals');}
 if(i!==view.byteLength)throw Error('Unexpected heart-rate bytes');
 return {bpm,contact_supported:!!(flags&4),contact_detected:flags&4?!!(flags&2):null,energy_kj:energy,rr_ticks:rr,rr_ms:rr.map(n=>n*1000/1024)};
}
class Monitor{
 constructor({onSample=()=>{},onEvent=()=>{},onStatus=()=>{},active=()=>false}={}){
  Object.assign(this,{onSample,onEvent,onStatus,active});this.device=null;this.characteristic=null;this.last=null;this.good=0;this.busy=false;this.connected=false;this.message='Not connected';this.stale=false;this.retryAt=0;this.closed=false;
  this.receive=this.receive.bind(this);this.disconnected=this.disconnected.bind(this);
 }
 support(){
  if(!globalThis.isSecureContext)return 'Open this task using HTTPS or the downloaded task in desktop Chrome.';
  if(!globalThis.navigator?.bluetooth)return 'Bluetooth is unavailable. Open this task in Chrome on your Mac.';
  const policy=globalThis.document?.permissionsPolicy||globalThis.document?.featurePolicy;
  if(policy&&!policy.allowsFeature('bluetooth'))return 'Bluetooth is blocked in this embedded page. Use Download task file in researcher setup, then open that file in Chrome.';
  return '';
 }
 ready(){return this.connected&&this.good>=3&&this.last&&Date.now()-this.last.received_ms<=5000&&this.last.bpm>0&&this.last.contact_detected!==false;}
 async connect(){
  if(this.busy)return;const issue=this.support();if(issue){this.message=issue;this.onStatus();return;}
  this.busy=true;this.closed=false;this.message='Choose your Polar sensor';this.onStatus();
  try{
   this.release();this.device=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}]});
   this.device.addEventListener('gattserverdisconnected',this.disconnected);
   await this.subscribe();
  }catch(e){this.message=e.name==='NotFoundError'?'No sensor selected. Try Connect heart-rate sensor again.':e.name==='SecurityError'?'Bluetooth access was blocked. Use Download task file in researcher setup and open it in Chrome.':`Connection failed: ${e.message}`;this.onEvent('hr_connection_error',{message:this.message});this.release();}
  finally{this.busy=false;this.onStatus();}
 }
 async subscribe(){
  this.message='Connecting…';this.onStatus();
  const server=await this.device.gatt.connect();
  if(this.closed){this.device.gatt.disconnect();return;}
  const service=await server.getPrimaryService('heart_rate');
  const characteristic=await service.getCharacteristic('heart_rate_measurement');
  if(this.closed){this.device.gatt.disconnect();return;}
  if(this.characteristic)this.characteristic.removeEventListener('characteristicvaluechanged',this.receive);
  this.characteristic=characteristic;characteristic.addEventListener('characteristicvaluechanged',this.receive);
  await characteristic.startNotifications();
  if(this.closed){this.release();return;}
  this.connected=true;this.last=null;this.good=0;this.stale=false;this.message='Connected — waiting for readings';
  this.onEvent('hr_connected',{});this.onStatus();
 }
 receive(event){
  if(this.closed)return;
  try{
   const received_ms=Date.now(),received_mono_ms=performance.now(),sample={...decode(event.target.value),received_ms,received_utc:new Date(received_ms).toISOString(),received_mono_ms};
   if(this.last&&received_ms-this.last.received_ms>5000)this.good=0;
   this.good=sample.bpm>0&&sample.contact_detected!==false?this.good+1:0;
   if(this.stale){this.onEvent('hr_signal_resumed',{gap_seconds:this.last?(received_ms-this.last.received_ms)/1000:null});this.stale=false;}
   if(this.last&&this.last.contact_detected!==sample.contact_detected)this.onEvent('hr_contact_changed',{contact_detected:sample.contact_detected});
   this.last=sample;this.message=sample.contact_detected===false?'Check strap contact':this.good>=3?'Live signal ready':'Checking incoming readings…';
   this.onSample(sample);this.onStatus();
  }catch(e){this.onEvent('hr_packet_error',{message:e.message});}
 }
 disconnected(){
  if(this.closed)return;this.connected=false;this.good=0;this.message='Sensor disconnected';this.retryAt=Date.now()+5000;this.onEvent('hr_disconnected',{});this.onStatus();
 }
 async check(){
  if(this.connected&&this.last&&Date.now()-this.last.received_ms>5000&&!this.stale){this.stale=true;this.good=0;this.message='No recent readings — check strap';this.onEvent('hr_signal_stale',{last_received_utc:this.last.received_utc});}
  this.onStatus();
  if(!this.closed&&!this.connected&&this.device&&this.active()&&!this.busy&&Date.now()>=this.retryAt){
   this.busy=true;try{await this.subscribe();}catch(e){this.message='Reconnecting…';this.onEvent('hr_reconnect_failed',{message:e.message});}finally{this.busy=false;this.retryAt=Date.now()+5000;}
  }
 }
 release(){
  if(this.characteristic)this.characteristic.removeEventListener('characteristicvaluechanged',this.receive);
  if(this.device){this.device.removeEventListener('gattserverdisconnected',this.disconnected);if(this.device.gatt.connected)this.device.gatt.disconnect();}
  this.characteristic=null;this.device=null;this.connected=false;this.last=null;this.good=0;
 }
 stop(){this.closed=true;this.release();this.message='Not connected';this.onStatus();}
}
const api={decode,Monitor};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HeartRate=api;
})(typeof window!=='undefined'?window:globalThis);
