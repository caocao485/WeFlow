const fs=require('fs'),path=require('path'),{fork}=require('child_process');
const result=process.env.WEFLOW_RESULT_ROOT;
const host=process.env.WEFLOW_HOST_ROOT||'D:/Apps/WeFlow/host';
const model=process.env.WEFLOW_MODEL_ROOT||'D:/Apps/WeFlowData/models/sensevoice';
const wav=fs.readFileSync(path.join(result,'known-24k.wav'));
async function transcribe(worker,languages=['zh'],data=wav){return new Promise(resolve=>{
 const child=fork(worker,[],{stdio:['ignore','ignore','ignore','ipc'],serialization:'advanced',env:{...process.env,NODE_PATH:path.join(host,'resources/app.asar.unpacked/node_modules'),PATH:path.join(host,'resources/app.asar.unpacked/node_modules/sherpa-onnx-win-x64')+path.delimiter+process.env.PATH}});
 const timer=setTimeout(()=>{child.kill();resolve({success:false,timeout:true});},30000);
 child.on('message',r=>{if(r.type==='final'||r.type==='error'){clearTimeout(timer);const text=r.text||'';resolve({success:r.type==='final',characters:text.length,keywords:['下午','开会','参加'].filter(k=>text.includes(k)).length});}});
 child.send({modelPath:path.join(model,'model.int8.onnx'),tokensPath:path.join(model,'tokens.txt'),wavData:data,sampleRate:16000,languages});
 });}
(async()=>{
 const report={wavRate:wav.readUInt32LE(24),original:await transcribe(path.join(host,'resources/app.asar/dist-electron/transcribeWorker.js')),candidate:await transcribe(path.join(result,'transcribeWorker.js'))};
 report.languageFilter=await transcribe(path.join(result,'transcribeWorker.js'),['en']);
 report.malformed=await transcribe(path.join(result,'transcribeWorker.js'),['zh'],Buffer.alloc(44));
 report.success=report.wavRate===24000&&report.candidate.success&&report.candidate.keywords===3&&report.languageFilter.success&&report.languageFilter.characters===0&&!report.malformed.success;
 fs.writeFileSync(path.join(result,'engine-comparison.json'),JSON.stringify(report,null,2));
 fs.unlinkSync(path.join(result,'known-24k.wav'));
 console.log(JSON.stringify(report));process.exitCode=report.success?0:2;
})().catch(()=>{console.log(JSON.stringify({success:false,error:'ENGINE_TEST'}));process.exitCode=2;});
