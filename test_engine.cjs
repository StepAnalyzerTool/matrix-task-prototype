const assert=require('node:assert/strict'),E=require('./engine.js');
for(const schedule of ['doubling','additive','custom']){
 const c={schedule,custom:[1,3,5],customStep:4},s={attempts:0,correct:0,progress:0,ratioIndex:0,lastCompletedRatio:0,points:0};
 for(let i=0;i<4;i++){
  const n=E.ratio(c,i);for(let j=0;j<n;j++){const old=s.progress;assert.equal(E.score(s,false,c),false);assert.equal(s.progress,old);assert.equal(E.score(s,true,c),j===n-1);}
  assert.equal(s.points,i+1);assert.equal(s.lastCompletedRatio,n);assert.equal(s.progress,0);
 }
}
for(let level=1;level<=3;level++)for(let seed=1;seed<500;seed++){
 const it=E.item(seed,level);assert.equal(new Set(it.options.map(JSON.stringify)).size,4);assert.ok(it.answer>=0&&it.answer<4);assert.deepEqual(it,E.item(seed,level));
}
console.log('PASS: ratio progression, errors, rewards, and 1,497 deterministic demo items');
