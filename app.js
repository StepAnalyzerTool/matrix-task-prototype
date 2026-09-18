const standaloneHTML='<!doctype html>'+document.documentElement.outerHTML;
const E=TaskEngine,$=s=>document.querySelector(s),app=$('#app');
let v=null, selected=null, shownMono=0,shownWall=0,choiceStart=0,tick=null,saveChain=Promise.resolve(),busy=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=()=>new Date().toISOString();
function log(type,extra={}){v.events.push({type,utc:stamp(),elapsed_s:(Date.now()-v.started)/1000,visit_mono_s:v.monotonic_start_ms===undefined?null:(performance.now()-v.monotonic_start_ms)/1000,session:v.sessionNumber,...extra});}
const STORAGE_KEY='matrix-streamlit-visit-v1';
const backup={
 get(){try{return localStorage.getItem(STORAGE_KEY);}catch(e){return null;}},
 set(raw){try{localStorage.setItem(STORAGE_KEY,raw);return true;}catch(e){return false;}},
 clear(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}}
};
function persist(){if(!v)return;v.revision++;const ok=backup.set(JSON.stringify(v));
 $('#save').textContent=ok?'Browser backup · export before closing':'Memory only · export before closing';
}
let hrLastSave=0;
const hr=new HeartRate.Monitor({
 active:()=>!!(v&&v.state!=='done'&&v.config.recordHR),
 onStatus:refreshHR,
 onEvent:(type,extra)=>{if(v&&v.state!=='done'&&v.config.recordHR){log(type,extra);persist();}},
 onSample:sample=>{if(!v||v.state==='done'||!v.config.recordHR)return;
  if(limit())return;
  v.heart_rate.push({...sample,elapsed_s:(sample.received_ms-v.started)/1000,visit_mono_s:(sample.received_mono_ms-v.monotonic_start_ms)/1000,phase:v.state,session:v.sessionNumber,feedback_phase:v.state==='feedback'?v.feedbackPhase:null});
  if(Date.now()-hrLastSave>=5000){persist();hrLastSave=Date.now();}
 }
});
function hrPanel(){return `<section class="panel hr-panel" aria-label="Researcher heart rate"><h2>Heart rate</h2><label for="hrmode">Heart-rate recording</label><select id="hrmode"><option value="on">Record heart rate</option><option value="off">Task only — no heart rate</option></select><div class="hr-reading"><strong id="hrvalue">— beats/min</strong><span id="hrcontact"></span></div><p id="hrstatus" role="status"></p><p id="hrage" class="note"></p><div class="actions"><button type="button" id="hrconnect">Connect heart-rate sensor</button><button type="button" id="hrdisconnect">Disconnect</button></div><p class="note">Wear the moistened strap. Close other sensor apps or tabs. Wait for three fresh readings before beginning.</p><p class="note">Heart rate is hidden from the participant and recorded from rest until the visit ends, including breaks.</p><button type="button" id="standalone" class="hide">Download task file</button></section>`;}
function refreshHR(){
 if(!$('#hrstatus'))return;
 const enabled=$('#hrmode').value==='on',issue=hr.support(),fresh=hr.last&&Date.now()-hr.last.received_ms<=5000;
 $('#hrvalue').textContent=enabled&&fresh?hr.last.bpm+' beats/min':'— beats/min';
 $('#hrstatus').textContent=!enabled?'Heart-rate recording is off':issue||hr.message;
 $('#hrcontact').textContent=enabled&&fresh?(hr.last.contact_detected===true?'Skin contact detected':hr.last.contact_detected===false?'Check skin contact':'Contact status unavailable'):'';
 $('#hrage').textContent=enabled&&hr.last?'Last reading '+((Date.now()-hr.last.received_ms)/1000).toFixed(1)+' seconds ago':'';
 $('#hrconnect').disabled=!enabled||hr.busy||!!issue;
 $('#hrdisconnect').disabled=!hr.device||hr.busy;
 $('#standalone').classList.toggle('hide',!enabled||!issue);
 $('#begin').disabled=enabled&&!hr.ready();
}
setInterval(()=>hr.check(),1000);
function fitScreen(){
 const stage=document.querySelector('#stage');if(!stage)return;
 stage.style.transform='translate(-50%, -50%)';
 const scale=Math.min(1,(window.innerWidth-16)/stage.scrollWidth,(window.innerHeight-16)/stage.scrollHeight);
 stage.style.transform=`translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener('resize',fitScreen);
function screen(html){clearInterval(tick);app.innerHTML=html;
 app.dataset.view=html.includes('id="hrmode"')?'setup':html.includes('class="puzzle-layout"')?'problem':html.includes('id="json"')?'results':'message';
 document.body.dataset.view=app.dataset.view;
 window.scrollTo(0,0);requestAnimationFrame(fitScreen);
}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitScreen).observe(app);

function setup(){hr.stop();v=null;screen(`<div class="setup-heading"><div><div class="eyebrow">Researcher setup</div><h1>Work, pause, choose.</h1></div><span class="pill">Original demo puzzles</span></div><div class="setup-columns"><section class="panel"><h2>Visit settings</h2><div class="grid">
<div><label for="pid">Participant code</label><input id="pid" value="DEMO-001" maxlength="60"></div><div><label for="schedule">Ratio sequence</label><select id="schedule"><option value="doubling">1, 2, 4, 8, 16…</option><option value="additive">1, 2, 4, 6, 8…</option><option value="custom">Custom</option></select></div>
<div><label for="minutes">Maximum visit length</label><select id="minutes"><option value="30">30 minutes</option><option value="60">60 minutes</option></select></div><div><label for="rest">Seated baseline (seconds)</label><input id="rest" type="number" min="0" max="600" value="60"></div>
<div><label for="difficulty">Task difficulty</label><select id="difficulty"><option value="auto">Select after practice</option><option value="1">Easy demonstration items</option><option value="2">Medium demonstration items</option><option value="3">Difficult demonstration items</option></select></div><div><label for="seed">Reproducible item seed</label><input id="seed" type="number" min="1" max="1000000000" value="2026"></div></div>
<div id="customBox" class="hide"><div class="grid"><div><label for="custom">Initial ratios (comma-separated)</label><input id="custom" value="1,2,4,8"></div><div><label for="step">Later ratio increment</label><input id="step" type="number" min="1" value="8"></div></div></div>
<p class="note">One point per completed ratio. Only correct submitted answers advance progress. Six practice items; no practice points.</p><p class="note">Demo difficulty selection is provisional, not a validated assessment. The visit timer includes rest, practice, work, and breaks.</p></section>${hrPanel()}</div><div class="setup-bottom"><div id="validation" class="error" role="alert"></div><button class="primary" id="begin">Begin visit</button></div>`);
 $('#schedule').onchange=()=>{$('#customBox').classList.toggle('hide',$('#schedule').value!=='custom');requestAnimationFrame(fitScreen);};$('#begin').onclick=begin;$('#hrconnect').onclick=()=>hr.connect();$('#hrdisconnect').onclick=()=>hr.stop();$('#standalone').onclick=()=>download('Matrix-Lab-HR.html',standaloneHTML,'text/html');$('#hrmode').onchange=()=>{if($('#hrmode').value==='off')hr.stop();refreshHR();};refreshHR();
}
function begin(){const custom=$('#custom').value.split(',').map(s=>Number(s.trim())),config={participant:$('#pid').value.trim(),schedule:$('#schedule').value,custom,customStep:Number($('#step').value),minutes:Number($('#minutes').value),rest:Number($('#rest').value),difficulty:$('#difficulty').value,seed:Number($('#seed').value),recordHR:$('#hrmode').value==='on',responseMethod:'answer_click'};
 if(!config.participant||!Number.isInteger(config.rest)||config.rest<0||config.rest>600||!Number.isInteger(config.seed)||config.seed<1||config.seed>1e9||config.schedule==='custom'&&(!custom.length||custom[0]!==1||custom.some((n,i)=>!Number.isSafeInteger(n)||n<1||n>1000000||i&&n<=custom[i-1])||!Number.isSafeInteger(config.customStep)||config.customStep<1||config.customStep>1000000)){$('#validation').textContent='Enter a participant code, valid baseline and seed, and increasing positive whole-number requirements starting at 1.';return;}
 if(config.recordHR&&!hr.ready()){$('#validation').textContent='Wait for a live heart-rate signal before beginning.';return;}
 v={id:crypto.randomUUID(),version:'0.5-click-excel-demo',heart_rate:[],monotonic_start_ms:performance.now(),hr_setup:config.recordHR?{verified_utc:stamp(),bpm:hr.last.bpm,contact_detected:hr.last.contact_detected,consecutive_good_readings:hr.good}:null,revision:0,config,started:Date.now(),state:'baseline',sessionNumber:0,sessions:[],trials:[],events:[],breaks:[],points:0,itemIndex:0,practiceIndex:0,level:null,baselineEnd:Date.now()+config.rest*1000,deadline:Date.now()+config.minutes*60000};log('visit_start');log('baseline_start',{planned_seconds:config.rest});persist();baseline();}
function endButton(){return '<button id="end">End for today</button>';}
function wireEnd(){if($('#end'))$('#end').onclick=()=>finish('voluntary_end');}
function baseline(){screen(`<div class="panel center"><div class="eyebrow">Before we begin</div><h1>A quiet moment.</h1><p>Please sit comfortably and rest until the practice problems begin.</p><div class="clock" id="clock"></div><div class="actions" style="justify-content:center">${endButton()}</div></div>`);wireEnd();const update=()=>{if(limit())return;let s=Math.max(0,Math.ceil((v.baselineEnd-Date.now())/1000));$('#clock').textContent=s;if(!s){log('baseline_end');v.state='practice';nextItem();}};update();if(v.state==='baseline')tick=setInterval(update,250);}
function glyph(o){let pts=[[29,25],[67,25],[29,59],[67,59]];return `<svg viewBox="0 0 96 84" width="96" height="84" aria-hidden="true">${pts.slice(0,o.n).map(([x,y])=>`<path d="M ${x-9} ${y+9} L ${x} ${y-11} L ${x+9} ${y+9} Z" transform="rotate(${o.a*90} ${x} ${y})" fill="${o.f?'#315f4f':'none'}" stroke="#315f4f" stroke-width="2.5"/>`).join('')}</svg>`;}
function describe(o){return `${o.n} ${o.f?'filled':'outline'} triangles pointing ${['up','right','down','left'][o.a]}`;}
function current(){return v.sessions.at(-1);}
function startSession(){if(limit())return;if(v.state==='break'){const b=v.breaks.at(-1);b.end=Date.now();b.duration_s=(b.end-b.start)/1000;b.reason='restart';log('break_end',{duration_s:b.duration_s});}
 v.sessionNumber++;v.sessions.push({number:v.sessionNumber,start:Date.now(),end:null,ratioIndex:0,progress:0,lastCompletedRatio:0,attempts:0,correct:0,points:0});v.state='task';log('session_start');nextItem();}
function nextItem(){if(limit())return;if(v.state==='feedback'){log('continue_choice',{decision_seconds:(performance.now()-choiceStart)/1000});v.state=v.feedbackPhase==='practice'?'practice':'task';if(v.state==='practice'&&v.practiceIndex===6){calibrate();return;}}
 const level=v.state==='practice'?[1,2,3,1,2,3][v.practiceIndex]:v.level;
 v.item=E.item(v.config.seed+v.itemIndex++,level);selected=null;v.pendingPhase=v.state;v.pendingStart=Date.now();log('problem_presented',{item:v.item.id,phase:v.state,level});renderProblem();persist();}
function renderProblem(){const practice=v.state==='practice',s=current();screen(`<div class="top"><div><div class="eyebrow">${practice?'Practice · '+(v.practiceIndex+1)+' of 6':'Session '+v.sessionNumber}</div><h1>Find the missing piece.</h1></div><span class="pill">${v.points} point${v.points===1?'':'s'}</span></div><p>Click the answer that completes the pattern. Your choice is submitted immediately.</p><div class="panel">${practice?'':`<div class="top"><span>${s.progress} of ${E.ratio(v.config,s.ratioIndex)} correct toward your next point</span></div><div class="progress"><div style="width:${100*s.progress/E.ratio(v.config,s.ratioIndex)}%"></div></div>`}<div class="puzzle-layout"><div class="matrix" role="img" aria-label="Three by three matrix with bottom right cell missing">${v.item.cells.map(o=>`<div class="cell" title="${describe(o)}">${glyph(o)}</div>`).join('')}<div class="cell missing">?</div></div><div class="response-panel"><div class="answers">${v.item.options.map((o,i)=>`<button class="answer" id="a${i}" aria-label="Option ${'ABCD'[i]}: ${describe(o)}">${glyph(o)}<span>${'ABCD'[i]}</span></button>`).join('')}</div></div></div></div><div class="actions participant-actions">${practice?'':'<button id="break">Take a break</button>'}${endButton()}</div>`);
 for(let i=0;i<4;i++)$('#a'+i).onclick=()=>{if(v.state!=='practice'&&v.state!=='task')return;selected=i;submit();};
 wireEnd();if($('#break'))$('#break').onclick=takeBreak;
 // Starts after rendering has reached the browser's next animation frame.
 shownMono=performance.now();shownWall=Date.now();requestAnimationFrame(()=>{shownMono=performance.now();shownWall=Date.now();});tick=setInterval(limit,250);
}
function submit(){if(busy||selected===null||!['practice','task'].includes(v.state)||limit())return;busy=true;const phase=v.state,correct=selected===v.item.answer,s=current();const trial={phase,session:phase==='task'?v.sessionNumber:0,item_id:v.item.id,seed:v.item.seed,level:v.item.level,presented_utc:new Date(shownWall).toISOString(),answered_utc:stamp(),response_seconds:(performance.now()-shownMono)/1000,selected:'ABCD'[selected],correct_answer:'ABCD'[v.item.answer],correct,ratio_requirement:phase==='task'?E.ratio(v.config,s.ratioIndex):null,progress_before:phase==='task'?s.progress:null};
 let earned=false;if(phase==='task'){earned=E.score(s,correct,v.config);if(earned)v.points++;trial.progress_after=s.progress;trial.ratio_completed=earned;trial.total_points=v.points;}else v.practiceIndex++;
 v.trials.push(trial);v.pendingStart=null;log('answer_submitted',trial);if(earned)log('point_earned',{ratio:s.lastCompletedRatio,total_points:v.points});v.state='feedback';v.feedbackPhase=phase;v.feedbackCorrect=correct;v.feedbackEarned=earned;persist();feedback();busy=false;
}
function feedback(){choiceStart=performance.now();screen(`<div class="panel center"><div class="eyebrow">${v.feedbackPhase==='practice'?'Practice':'Answer recorded'}</div><h1 class="${v.feedbackCorrect?'success':'error'}">${v.feedbackCorrect?'Correct.':'Incorrect.'}</h1><p>${v.feedbackPhase==='practice'?'Practice answers do not earn points.':v.feedbackEarned?'You earned 1 point.':v.feedbackCorrect?'Your progress has been recorded.':'Your progress toward the next point stays the same.'}</p><span class="pill">${v.points} points earned</span><div class="actions" style="justify-content:center"><button id="next" class="primary">${v.feedbackPhase==='practice'&&v.practiceIndex===6?'Finish practice':'Next problem'}</button>${v.feedbackPhase==='task'?'<button id="break">Take a break</button>':''}${endButton()}</div></div>`);$('#next').onclick=nextItem;if($('#break'))$('#break').onclick=takeBreak;wireEnd();tick=setInterval(limit,250);}
function calibrate(){let by=[1,2,3].map(l=>v.trials.filter(t=>t.phase==='practice'&&t.level===l&&t.correct).length);v.recommendation=by[2]===2?3:by[1]===2?2:1;v.level=v.config.difficulty==='auto'?v.recommendation:Number(v.config.difficulty);v.state='ready';log('difficulty_selected',{practice_correct_by_level:by,recommended:v.recommendation,selected:v.level,method:'demo-two-of-two'});persist();screen(`<div class="panel center"><div class="eyebrow">Practice complete</div><h1>You’re ready.</h1><p>Each completed requirement earns one point. The number of correct answers needed increases as you continue.</p><p>You can take a break or end for today at any time. After a break, a new session starts at a requirement of 1. Your earned points stay with you.</p><div class="actions" style="justify-content:center"><button class="primary" id="start">Start session</button>${endButton()}</div></div>`);$('#start').onclick=startSession;wireEnd();tick=setInterval(limit,250);}
function abandon(reason){if(v.pendingStart){log('problem_unanswered',{item:v.item.id,phase:v.pendingPhase,reason,time_open_seconds:(Date.now()-v.pendingStart)/1000});v.pendingStart=null;}}
function closeSession(reason){const s=current();if(s&&!s.end){s.end=Date.now();s.end_reason=reason;s.unfinished_requirement=E.ratio(v.config,s.ratioIndex);s.duration_s=(s.end-s.start)/1000;log('session_end',{...s});}}
function takeBreak(){if(limit())return;if(v.state==='feedback')log('break_choice',{decision_seconds:(performance.now()-choiceStart)/1000});abandon('break');closeSession('voluntary_break');v.state='break';v.breaks.push({start:Date.now(),after_session:v.sessionNumber});log('break_start');persist();screen(`<div class="panel center"><div class="eyebrow">Session saved</div><h1>Take your time.</h1><p>Your ${v.points} earned point${v.points===1?'':'s'} will be retained.</p><div class="actions" style="justify-content:center"><button class="primary" id="restart">Start a new session when you’re ready</button>${endButton()}</div></div>`);$('#restart').onclick=startSession;wireEnd();tick=setInterval(limit,250);}
function limit(){if(v&&v.state!=='done'&&Date.now()>=v.deadline){finish('visit_time_limit');return true;}return false;}
function finish(reason){if(!v||v.state==='done')return;abandon(reason);closeSession(reason);if(v.state==='break'){const b=v.breaks.at(-1);b.end=Date.now();b.duration_s=(b.end-b.start)/1000;b.reason=reason;log('break_end',{duration_s:b.duration_s,reason});}v.state='done';v.ended=Date.now();v.end_reason=reason;log('visit_end',{reason});hr.stop();persist();done();}
function done(){screen(`<div class="panel center"><div class="eyebrow">Visit complete</div><h1>Thank you.</h1><p>${v.end_reason==='visit_time_limit'?'The maximum visit time has been reached.':'Your visit has ended.'}</p><span class="pill">${v.points} points earned</span><div class="actions" style="justify-content:center"><button id="research">Researcher results</button></div></div>`);$('#research').onclick=results;}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function csv(rows){if(!rows.length)return '';const keys=[...new Set(rows.flatMap(Object.keys))],q=x=>'"'+String(x??'').replaceAll('"','""')+'"';return [keys.map(q).join(','),...rows.map(r=>keys.map(k=>q(r[k])).join(','))].join('\r\n');}
let resultsPage=0;
function results(){const pageSize=4,totalPages=Math.max(1,Math.ceil(v.sessions.length/pageSize));resultsPage=Math.max(0,Math.min(resultsPage,totalPages-1));screen(`<div class="eyebrow">Researcher results</div><h1>Visit recorded.</h1><p>Participant ${esc(v.config.participant)} · ${esc(v.end_reason)} · Selected demo level ${v.level??'not reached'}</p><div class="panel results-table"><table><thead><tr><th>Session</th><th>Last completed ratio</th><th>Correct / attempts</th><th>Unfinished progress</th><th>Points</th><th>End reason</th></tr></thead><tbody>${v.sessions.slice(resultsPage*pageSize,(resultsPage+1)*pageSize).map(s=>`<tr><td>${s.number}</td><td>${s.lastCompletedRatio}</td><td>${s.correct} / ${s.attempts}</td><td>${s.progress} / ${s.unfinished_requirement}</td><td>${s.points}</td><td>${esc(s.end_reason)}</td></tr>`).join('')}</tbody></table><div class="page-controls"><button id="prevpage" ${resultsPage===0?'disabled':''}>Previous</button><span>Page ${resultsPage+1} of ${totalPages} · ${v.breaks.length} breaks recorded</span><button id="nextpage" ${resultsPage===totalPages-1?'disabled':''}>Next</button></div><p class="note">Only voluntary session endings are breakpoint observations; time-limit and interrupted endings are censored. Review accuracy alongside the last completed ratio.</p></div><div class="actions"><button id="excel" class="primary">Download Excel workbook</button><button id="json">Download complete JSON</button></div><p id="exportstatus" class="note" role="status"></p><p class="note">Download your results before closing. This shared demo has no central database; a browser backup is kept when storage is available. Heart-rate samples: ${v.heart_rate?.length||0}. Signal interruptions: ${v.events.filter(e=>e.type==='hr_disconnected'||e.type==='hr_signal_stale').length}. Heart-rate timestamps mark receipt in the browser, not the exact heartbeat time. See JSON events for signal and contact changes. Researcher screens are not password-protected in this prototype.</p><div class="actions"><button id="new">Set up another visit</button></div>`);
 $('#prevpage').onclick=()=>{resultsPage--;results();};$('#nextpage').onclick=()=>{resultsPage++;results();};
 const prefix='matrix-'+v.id;$('#json').onclick=()=>download(prefix+'.json',JSON.stringify(v,null,2),'application/json');
 $('#excel').onclick=async()=>{const button=$('#excel'),status=$('#exportstatus');button.disabled=true;status.textContent='Preparing workbook…';
 try{const workbook=VisitWorkbook.build(v,ExcelJS);const bytes=await workbook.xlsx.writeBuffer();download(prefix+'.xlsx',bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');status.textContent='Workbook download requested. Check your Downloads folder.';}
 catch(error){status.textContent='Excel export failed. Download complete JSON to preserve the data. '+error.message;}
 finally{button.disabled=false;requestAnimationFrame(fitScreen);}
 };
 $('#new').onclick=()=>{backup.clear();setup();};}
window.addEventListener('beforeunload',e=>{if(v&&v.state!=='done'){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(v&&v.state!=='done'){log(document.hidden?'page_hidden':'page_visible');persist();}});
const previous=backup.get();if(previous){try{v=JSON.parse(previous);if(v.state!=='done'){v.monotonic_start_ms=undefined;// Do not silently resume after an unknown recording gap.
 finish('interrupted_reload');}else done();}catch(e){setup();}}else setup();

