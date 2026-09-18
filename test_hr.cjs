const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {decode}=require('./hr.js');
const packet=(...bytes)=>new DataView(Uint8Array.from(bytes).buffer);
assert.deepEqual(decode(packet(0x16,60,0,4,0,2)).rr_ms,[1000,500]);
assert.equal(decode(packet(0x06,80)).contact_detected,true);
assert.equal(decode(packet(0x04,80)).contact_detected,false);
assert.equal(decode(packet(0x19,44,1,7,0,0,4)).bpm,300);
assert.equal(decode(packet(0x19,44,1,7,0,0,4)).energy_kj,7);
for(const bytes of [[],[0x16,80,0],[0x16,80],[0x01,80],[0x06,80,0]])assert.throws(()=>decode(packet(...bytes)));
let els={},saved={},now=100000,mono=1000,notifications;
function el(id){return {id,dataset:{},value:'',disabled:false,textContent:'',classList:{toggle(){}},setAttribute(){},get innerHTML(){return this.html},set innerHTML(h){this.html=h;if(id==='app'){for(const k of Object.keys(els))if(!['app','save'].includes(k))delete els[k];for(const m of h.matchAll(/id="([^"]+)"/g))els[m[1]]=el(m[1]);if(els.hrmode)els.hrmode.value='on';}}};}
els.app=el('app');els.save=el('save');
const device={addEventListener(){},removeEventListener(){},gatt:{connected:false,disconnect(){this.connected=false;},async connect(){this.connected=true;return {getPrimaryService:async()=>({getCharacteristic:async()=>({addEventListener(name,f){notifications=f;},removeEventListener(){},startNotifications:async()=>{}})})};}}};
const ctx={console,Date:class extends Date{static now(){return now;}},Math,JSON,Number,String,Object,Array,Set,Error,Promise,DataView,Uint8Array,crypto:require('node:crypto').webcrypto,performance:{now:()=>mono},isSecureContext:true,navigator:{bluetooth:{requestDevice:async()=>device}},document:{documentElement:{outerHTML:'<html></html>'},body:{dataset:{}},featurePolicy:{allowsFeature:()=>true},querySelector:s=>els[s.slice(1)]||null,addEventListener(){}},localStorage:{setItem:(k,v)=>saved[k]=v,getItem:k=>saved[k]||null,removeItem:k=>delete saved[k]},window:{scrollTo(){},addEventListener(){}},setInterval:()=>1,clearInterval(){},setTimeout,URL,Blob,requestAnimationFrame:f=>f()};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('hr.js','utf8'),ctx);ctx.HeartRate=ctx.window.HeartRate;ctx.TaskEngine=require('./engine.js');vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),sample=()=>{now+=1000;mono+=1000;notifications({target:{value:packet(0x16,60,0,4)}});};
(async()=>{
assert.equal(els.begin.disabled,true);
await run('hr.connect()');sample();sample();assert.equal(els.begin.disabled,true);sample();assert.equal(els.begin.disabled,false);assert.equal(els.hrvalue.textContent,'60 beats/min');
now+=6000;await run('hr.check()');assert.equal(els.begin.disabled,true);sample();sample();sample();assert.equal(els.begin.disabled,false);
for(const [id,value] of Object.entries({pid:'SYNTHETIC-TEST',schedule:'doubling',custom:'1,2,4',step:'4',minutes:'30',rest:'60',difficulty:'1',seed:'2026'}))els[id].value=value;
run('begin()');assert.equal(run('v.state'),'baseline');assert.equal(els.hrvalue,undefined);assert.ok(!els.app.innerHTML.includes('beats/min'));sample();assert.equal(run('v.heart_rate.length'),1);assert.equal(run('v.heart_rate[0].phase'),'baseline');
run("v.state='practice';nextItem()");for(let i=0;i<6;i++)run('selected=v.item.answer;submit();nextItem()');assert.equal(run('v.state'),'ready');run('startSession()');sample();const before=run('v.trials.length');els['a'+run('v.item.answer')].onclick();assert.equal(run('v.trials.length'),before+1);assert.equal(run('v.state'),'feedback');assert.equal(els.submit,undefined);assert.equal(run('v.points'),1);run('takeBreak()');sample();assert.equal(run('v.heart_rate.at(-1).phase'),'break');assert.equal(els.hrvalue,undefined);
run('hr.disconnected()');assert.ok(run("v.events.some(e=>e.type==='hr_disconnected')"));now+=5000;await run('hr.check()');assert.equal(run('hr.connected'),true);sample();
run('startSession()');assert.equal(run('current().ratioIndex'),0);run("finish('voluntary_end')");const count=run('v.heart_rate.length');sample();assert.equal(run('v.heart_rate.length'),count);assert.equal(run('hr.connected'),false);run('results()');assert.ok(els.excel&&els.json);
run('setup()');els.hrmode.value='off';els.hrmode.onchange();assert.equal(els.begin.disabled,false);
console.log('PASS: HR decode, malformed packets, start gate, stale signal, hidden participant HR, phase recording, reconnect, break/reset, stop, and export controls');
})().catch(e=>{console.error(e);process.exitCode=1;});
