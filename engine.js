/* Original demonstration items; not Raven's or MaRs-IB. */
(function(root){
 function ratio(config,index){
  if(config.schedule==='doubling') return 2**index;
  if(config.schedule==='additive') return index===0?1:index*2;
  if(index<config.custom.length)return config.custom[index];
  return config.custom.at(-1)+(index-config.custom.length+1)*config.customStep;
 }
 function score(session, correct, config){
  session.attempts++; if(!correct)return false;
  session.correct++;session.progress++;
  if(session.progress===ratio(config,session.ratioIndex)){
   session.lastCompletedRatio=ratio(config,session.ratioIndex);session.ratioIndex++;session.progress=0;session.points++;return true;
  }return false;
 }
 function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function item(seed,level){
  const random=rng(seed),pick=n=>Math.floor(random()*n);
  const base=pick(4), rs=1+pick(3),cs=1+pick(3),angle=pick(4),fill=pick(2);
  const cell=(r,c)=>({n:1+(base+r*rs+c*cs)%4,a:level>=2?(angle+r+c)%4:0,f:level>=3?(fill+r+c)%2:0});
  const answer=cell(2,2), options=[answer];
  while(options.length<4){let v={...answer};let k=level===1?'n':['n','a',...(level>=3?['f']:[])][pick(level)];
   v[k]=k==='n'?1+pick(4):k==='a'?pick(4):pick(2);
   if(!options.some(o=>JSON.stringify(o)===JSON.stringify(v)))options.push(v);
  }
  for(let i=3;i>0;i--){let j=pick(i+1);[options[i],options[j]]=[options[j],options[i]];}
  return {id:`demo-${seed}-L${level}`,seed,level,cells:Array.from({length:8},(_,i)=>cell(Math.floor(i/3),i%3)),options,answer:options.indexOf(answer)};
 }
 const api={ratio,score,item};if(typeof module!=='undefined')module.exports=api;root.TaskEngine=api;
})(typeof window==='undefined'?globalThis:window);
