// Real service method: explicit component direction must beat prefix guesses.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {transformSync}=require('esbuild');
const file=path.join(__dirname,'../electron/services/analyticsService.ts');
const compiled=transformSync(fs.readFileSync(file,'utf8'),{loader:'ts',format:'cjs'}).code;
const exported={exports:{}};
vm.runInNewContext(compiled,{
 module:exported,exports:exported.exports,console,process,Buffer,setImmediate,
 require:id=>id==='./config'?{ConfigService:class{}}:id==='electron'?{app:{}}:id==='./wcdbService'?{wcdbService:{}}:id==='./contactCacheService'?{}:require(id),
},{filename:file});
const service=exported.exports.analyticsService;
for(const flag of [0,'0',false,'false'])assert.equal(service.isRowSentByMe({computed_is_send:flag,sender_username:'wxid_synthetic_friend'},'wxid_synthetic'),false);
for(const flag of [1,'1',true,'true'])assert.equal(service.isRowSentByMe({computed_is_send:flag,sender_username:'different'},'wxid_synthetic'),true);
assert.equal(service.isRowSentByMe({sender_username:'actual-self'},'actual-self'),true);
assert.equal(service.isRowSentByMe({sender_username:'different'},'actual-self'),false);
console.log(JSON.stringify({success:true,checks:10}));
