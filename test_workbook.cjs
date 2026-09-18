const assert=require('node:assert/strict'),fs=require('node:fs');
const ExcelJS=require('./vendor/exceljs.min.js'),{build}=require('./workbook.js');
const visit={id:'synthetic-visit',version:'0.5-click-excel-demo',started:1700000000000,ended:1700000060000,end_reason:'voluntary_end',points:1,level:2,config:{participant:'001-test',recordHR:true,responseMethod:'answer_click',custom:[1,2,4]},sessions:[{number:1,start:1700000000000,end:1700000060000,lastCompletedRatio:1,correct:1,attempts:2,points:1}],breaks:[],trials:[{phase:'practice',session:0,correct:false,response_seconds:1.125,selected:'A',answered_utc:'2023-11-14T22:13:22.000Z'},{phase:'task',session:1,correct:true,response_seconds:2.5}],heart_rate:[{bpm:60,received_utc:'2023-11-14T22:13:23.000Z',elapsed_s:3,phase:'baseline',session:0,rr_ticks:[1024,512],rr_ms:[1000,500],contact_detected:true}],events:[{type:'test',utc:'2023-11-14T22:13:23.000Z',details:{text:'=not-a-formula'}}]};
(async()=>{
 const book=build(visit,ExcelJS),bytes=await book.xlsx.writeBuffer();
 const read=new ExcelJS.Workbook();await read.xlsx.load(bytes);
 assert.deepEqual(read.worksheets.map(s=>s.name),['Visit Summary','Trials','Sessions','Breaks','Heart Rate','Beat Intervals','Event Log']);
 const cell=(name,key,row=2)=>{const sheet=read.getWorksheet(name);return sheet.getRow(row).getCell(sheet.getRow(1).values.indexOf(key));};
 assert.equal(cell('Trials','participant_code').value,'001-test');
 assert.equal(cell('Trials','correct').value,false);
 assert.equal(cell('Trials','response_seconds').value,1.125);
 assert.ok(cell('Trials','answered_utc').value instanceof Date);
 assert.equal(read.getWorksheet('Breaks').rowCount,1);
 assert.equal(read.getWorksheet('Beat Intervals').rowCount,3);
 assert.equal(cell('Beat Intervals','rr_ms',3).value,500);
 assert.equal(cell('Event Log','details').value,JSON.stringify(visit.events[0].details));
 for(const sheet of read.worksheets){assert.equal(sheet.views[0].state,'frozen');assert.ok(sheet.autoFilter);sheet.eachRow(row=>row.eachCell(c=>assert.notEqual(c.type,ExcelJS.ValueType.Formula)));}
 fs.writeFileSync('/tmp/matrix-workbook-test.xlsx',Buffer.from(bytes));
 const empty={...visit,sessions:[],trials:[],heart_rate:[],events:[]};const e=build(empty,ExcelJS);assert.equal(e.getWorksheet('Heart Rate').rowCount,1);
 console.log('PASS: seven-tab XLSX roundtrip, row counts, empty tabs, typed dates/numbers/booleans, identifiers, multiple RR intervals, filters and frozen headers');
})().catch(e=>{console.error(e);process.exitCode=1;});
