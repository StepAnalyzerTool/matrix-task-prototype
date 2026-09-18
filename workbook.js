/* Browser-only Excel export. No response data leave the participant's browser. */
(function(root){
'use strict';
const dateValue=n=>n==null?null:new Date(n);
const plain=value=>value==null?null:typeof value==='object'&&!(value instanceof Date)?JSON.stringify(value):value;
function datasets(v){
 const identity={participant_code:v.config.participant,visit_id:v.id};
 const tagged=rows=>rows.map(row=>({...identity,...row}));
 const timed=rows=>rows.map(row=>({...row,start_utc:dateValue(row.start),end_utc:dateValue(row.end)}));
 const summary=[
  ['participant_code',v.config.participant],['visit_id',v.id],['program_version',v.version],
  ['visit_start_utc',dateValue(v.started)],['visit_end_utc',dateValue(v.ended)],['end_reason',v.end_reason],
  ['visit_duration_seconds',v.ended==null?null:(v.ended-v.started)/1000],['total_points',v.points],
  ['session_count',v.sessions.length],['break_count',v.breaks.length],['trial_count',v.trials.length],
  ['heart_rate_sample_count',(v.heart_rate||[]).length],
  ['beat_interval_count',(v.heart_rate||[]).reduce((n,row)=>n+(row.rr_ms||[]).length,0)],
  ['selected_difficulty',v.level],['practice_recommendation',v.recommendation],
  ...Object.entries(v.config).map(([k,value])=>['setting_'+k,plain(value)]),
  ...Object.entries(v.hr_setup||{}).map(([k,value])=>['hr_setup_'+k,plain(value)]),
  ['response_method',v.config.responseMethod||'select_then_submit'],
  ['response_time_definition',v.config.responseMethod==='answer_click'?'Problem appearance to answer-option click.':'Problem appearance to Submit answer click.'],
  ['heart_rate_timing','Timestamps mark browser receipt, not exact heartbeat time. RR intervals in one packet share its receipt time.'],
  ['breakpoint_definition','Last completed ratio per session. Time-limit and interrupted endings are censored; inspect end_reason.'],
  ['time_units','Elapsed times and durations: seconds. RR intervals: milliseconds. RR ticks: 1/1024 second. All date/time cells: UTC.'],
  ['empty_tabs','Headers are retained when no observations were recorded. Missing values are blank, not zero.']
 ].map(([field,value])=>({field,value}));
 const hr=(v.heart_rate||[]).map(({rr_ticks,rr_ms,...row},packet_index)=>({...row,packet_index,rr_count:(rr_ms||[]).length,rr_ticks:JSON.stringify(rr_ticks||[]),rr_ms:JSON.stringify(rr_ms||[])}));
 const rr=(v.heart_rate||[]).flatMap((row,packet_index)=>(row.rr_ms||[]).map((rr_ms,interval_index)=>({packet_index,interval_index,received_utc:row.received_utc,received_ms:row.received_ms,elapsed_s:row.elapsed_s,visit_mono_s:row.visit_mono_s,phase:row.phase,session:row.session,rr_ticks:row.rr_ticks?.[interval_index],rr_ms})));
 return [
  {name:'Visit Summary',rows:summary,headers:['field','value']},
  {name:'Trials',rows:tagged(v.trials),headers:['participant_code','visit_id','phase','session','item_id','level','presented_utc','answered_utc','response_seconds','selected','correct_answer','correct','ratio_requirement','ratio_completed','total_points']},
  {name:'Sessions',rows:tagged(timed(v.sessions)),headers:['participant_code','visit_id','number','start_utc','end_utc','duration_s','end_reason','lastCompletedRatio','correct','attempts','points','progress','unfinished_requirement']},
  {name:'Breaks',rows:tagged(timed(v.breaks)),headers:['participant_code','visit_id','after_session','start_utc','end_utc','duration_s','reason']},
  {name:'Heart Rate',rows:tagged(hr),headers:['participant_code','visit_id','packet_index','received_utc','elapsed_s','visit_mono_s','phase','session','bpm','contact_detected','rr_count','rr_ms']},
  {name:'Beat Intervals',rows:tagged(rr),headers:['participant_code','visit_id','packet_index','interval_index','received_utc','elapsed_s','phase','session','rr_ms','rr_ticks']},
  {name:'Event Log',rows:tagged(v.events),headers:['participant_code','visit_id','type','utc','elapsed_s','visit_mono_s','session']}
 ];
}
function build(v,ExcelJS){
 const book=new ExcelJS.Workbook();book.creator='Matrix Lab';book.created=new Date();
 for(const {name,rows,headers} of datasets(v)){
  const keys=[...new Set([...headers,...rows.flatMap(Object.keys)])];
  const sheet=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],properties:{defaultRowHeight:22}});
  sheet.columns=keys.map(key=>({header:key,key,width:name==='Visit Summary'?(key==='field'?34:95):/utc$|^utc$/.test(key)?28:/visit_id/.test(key)?38:Math.max(15,Math.min(32,key.length+3))}));
  for(const record of rows){
   const row=sheet.addRow(keys.map(key=>{const x=plain(record[key]);return typeof x==='string'&&(key==='utc'||key.endsWith('_utc'))&&!Number.isNaN(Date.parse(x))?new Date(x):x;}));
   row.eachCell(cell=>{
    cell.font={name:'Calibri',size:11,color:{argb:'FF233D37'}};
    cell.alignment={vertical:'top',wrapText:true};
    if(cell.value instanceof Date)cell.numFmt='yyyy-mm-dd hh:mm:ss.000';
    else if(typeof cell.value==='number')cell.numFmt=Number.isInteger(cell.value)?'0':'0.000';
    else if(typeof cell.value==='string')cell.numFmt='@';
   });
   if(name==='Visit Summary'&&String(record.value??'').length>90)row.height=42;
  }
  sheet.getRow(1).height=32;
  sheet.getRow(1).eachCell(cell=>{cell.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF315F4F'}};cell.alignment={vertical:'middle',wrapText:true};});
  sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:keys.length}};
 }
 return book;
}
const api={datasets,build};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VisitWorkbook=api;
})(typeof window!=='undefined'?window:globalThis);
