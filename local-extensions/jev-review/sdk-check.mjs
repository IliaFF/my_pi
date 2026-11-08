import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire, findPackageJSON } from 'node:module';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const coreDir = process.env.PI_CODING_AGENT_CORE_DIR ?? dirname(findPackageJSON(
  '@earendil-works/pi-coding-agent',
  pathToFileURL(realpathSync(execFileSync('which', ['pi'], {encoding:'utf8'}).trim())),
));
const core = join(coreDir,'dist/index.js');
const root = mkdtempSync(join(tmpdir(),'jev-workflow-sdk-'));
const keys = ['HOME','PI_CODING_AGENT_DIR','HERDR_ENV','HERDR_SOCKET_PATH','HERDR_PANE_ID','PI_SUBAGENT_ID','PI_SUBAGENT_AGENT','PI_DENY_TOOLS'];
const saved = Object.fromEntries(keys.map(key=>[key,process.env[key]]));
for(const key of keys) delete process.env[key];
process.env.HOME=join(root,'home');
process.env.PI_CODING_AGENT_DIR=join(root,'agent');
mkdirSync(process.env.HOME); mkdirSync(process.env.PI_CODING_AGENT_DIR);
const originalFetch=globalThis.fetch;
let networkAttempts=0;
globalThis.fetch=async()=>{networkAttempts++;throw new Error('Network forbidden in offline SDK check');};
const sessions=[];
try {
  const {createAgentSession,createCodemodeExtension,DefaultResourceLoader,ModelRuntime,SessionManager,SettingsManager}=await import(pathToFileURL(core));
  const ai=dirname(findPackageJSON('@earendil-works/pi-ai',pathToFileURL(core)));
  const {fauxProvider,fauxAssistantMessage,fauxToolCall,InMemoryCredentialStore}=await import(pathToFileURL(join(ai,'dist/index.js')));
  const require=createRequire(core);
  const {createJiti}=await import(pathToFileURL(join(coreDir,'dist/core/extensions/jiti-loader.js')));
  const loader=createJiti(import.meta.url,{alias:{'@earendil-works/pi-coding-agent':core}});
  const extension=await loader.import(join(dirname(fileURLToPath(import.meta.url)),'index.ts'),{default:true});
  const {Type}=require('typebox');
  const chat=fauxProvider({provider:'offline-workflow',models:[{id:'deepseek-fixture'},{id:'control-fixture'}]});
  const runtime=await ModelRuntime.create({credentials:new InMemoryCredentialStore(),modelsPath:null,refreshOnCreate:false});
  runtime.registerNativeProvider(chat.provider);
  const classifications=[];
  let pauseRouting;
  const classifier={...chat.getModel(),type:'classifier',provider:'openrouter',id:'typesafe/jev-1.14',api:'offline-classifier'};
  runtime.registerNativeProvider({...chat.provider,id:'openrouter',name:'Offline classifier',getModels:()=>[],getAllModels:()=>[classifier],
    classify:async(model,context,options)=>{
      classifications.push(context);
      if (pauseRouting && 's0' in context.questions) await pauseRouting(options.signal);
      return {api:model.api,provider:model.provider,model:model.id,stopReason:'stop',timestamp:Date.now(),
        answers:Object.fromEntries(Object.entries(context.questions).map(([id,q])=>[id,q.type==='choice'
          ? {type:'choice',probabilities:{violated:0,complied:1,unknown:0,not_applicable:0}}
          : {type:'bool',probability:id.startsWith('s')?1:0}]))};
    }});
  const cwd=join(root,'work');mkdirSync(cwd);
  const baseDir=join(root,'skill');mkdirSync(baseDir);
  const filePath=join(baseDir,'SKILL.md');
  const body='SDK_SKILL_BODY_7c1: inspect every independent tool result.\n';
  writeFileSync(filePath,body);
  const skill={name:'arbitrary-sdk-skill',description:'Applicable fixture skill',filePath,baseDir,disableModelInvocation:false,
    sourceInfo:{path:filePath,source:'fixture',scope:'user',origin:'top-level'}};
  const errors=[];
  const fixture=pi=>pi.registerTool({name:'fixture_failure',label:'Fixture failure',description:'Always fails safely',parameters:Type.Object({}),
    execute:async()=>{throw new Error('Expected local fixture failure');}});
  async function open(id,manager=SessionManager.inMemory(cwd)){
    const settingsManager=SettingsManager.inMemory({defaultTools:['+codemode'],compaction:{enabled:false},retry:{enabled:false,maxRetries:0}});
    const resources=new DefaultResourceLoader({cwd,agentDir:process.env.PI_CODING_AGENT_DIR,settingsManager,
      noExtensions:true,noSkills:true,noThemes:true,noPromptTemplates:true,noContextFiles:true,
      skillsOverride:()=>({skills:[skill],diagnostics:[]}),extensionFactories:[createCodemodeExtension({mode:'on'}),fixture,extension]});
    await resources.reload();assert.deepEqual(resources.getExtensions().errors,[]);
    const {session}=await createAgentSession({cwd,agentDir:process.env.PI_CODING_AGENT_DIR,modelRuntime:runtime,
      model:chat.getModel(id),thinkingLevel:'off',settingsManager,resourceLoader:resources,sessionManager:manager});
    sessions.push(session);await session.bindExtensions({onError:e=>errors.push(String(e))});return session;
  }
  const contexts=[];
  const respond=content=>context=>{contexts.push(JSON.parse(JSON.stringify(context)));return fauxAssistantMessage(content);};
  const control=await open('control-fixture');
  chat.setResponses([respond('Control done')]);
  await control.prompt('Perform a conceptual check.');
  assert.equal(classifications.length,0,'Non-DeepSeek must not classify');
  assert.ok(!JSON.stringify(contexts).includes(body),'Non-DeepSeek must not preload');
  console.log('PASS real SDK non-DeepSeek auto isolation');
  contexts.length=0;
  const deepseek=await open('deepseek-fixture');
  chat.setResponses([
    respond([fauxToolCall('codemode',{code:'const results = await Promise.allSettled([tools.fixture_failure({})]); text(results.map(r => r.status));'})]),
    respond('Fixture failure observed; no external action performed.'),
  ]);
  await deepseek.prompt('Exercise the local fixture and inspect its failure.');
  assert.ok(classifications.some(c=>'s0' in c.questions),'Real SDK must route skills');
  assert.ok(classifications.some(c=>'rules' in c.questions),'Real SDK must review at settle');
  assert.ok(JSON.stringify(contexts[0]).includes(body.trim()),'Full skill must reach actual provider context');
  const records=readFileSync(join(process.env.PI_CODING_AGENT_DIR,'jev-review/workflow.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const nested=records.find(r=>r.event==='tool-end'&&r.tool==='fixture_failure');
  assert.ok(nested?.parent,'Nested event must retain codemode parent');
  assert.equal(nested.failed,true);
  assert.ok(records.some(r=>r.event==='tool-end'&&r.tool==='codemode'));
  assert.ok(!JSON.stringify(records).includes(body.trim()),'Diagnostics must not retain skill body');
  console.log('PASS real SDK hydration, settle and codemode nested failure');
  await deepseek.setModel(chat.getModel('control-fixture'));
  const beforeSwitch=classifications.length;
  contexts.length=0;chat.setResponses([respond('Control after switch')]);
  await deepseek.prompt('Continue without workflow assistance.');
  assert.equal(classifications.length,beforeSwitch);
  assert.ok(!JSON.stringify(contexts[0]).includes(body.trim()),`Switch must remove hydrated skill body: ${JSON.stringify(contexts[0].messages.filter(m=>m.role==='system').map(m=>({keys:Object.keys(m),sections:Object.keys(m.sections??{}),contentHasSkill:JSON.stringify(m.content).includes(body.trim())})))}`);
  console.log('PASS real SDK model switch removes assistance');
  const manager=SessionManager.inMemory(cwd);
  const configured=await open('deepseek-fixture',manager);
  await configured.prompt('/jev-review off');
  const restored=await open('deepseek-fixture',manager);
  const beforeRestore=classifications.length;
  contexts.length=0;chat.setResponses([respond('Restored off')]);
  await restored.prompt('Keep the explicit session setting.');
  assert.equal(classifications.length,beforeRestore,'Off must survive actual session restore');
  assert.ok(!JSON.stringify(contexts[0]).includes(body.trim()));
  await restored.prompt('/jev-review auto');
  contexts.length=0;chat.setResponses([respond('Auto restored')]);
  await restored.prompt('Use the applicable fixture skill.');
  assert.ok(classifications.length>beforeRestore);
  assert.ok(JSON.stringify(contexts[0]).includes(body.trim()),JSON.stringify({errors,hydration:readFileSync(join(process.env.PI_CODING_AGENT_DIR,'jev-review/workflow.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(r=>r.event==='hydration').map(r=>({route:r.route,loaded:r.loaded,omitted:r.omitted}))}));
  console.log('PASS real SDK explicit off/auto and active-branch restore');
  const compactManager=SessionManager.inMemory(cwd);
  for(let i=0;i<8;i++) {
    compactManager.appendMessage({role:'user',content:`Older fixture request ${i}`,timestamp:i*2});
    compactManager.appendMessage({...fauxAssistantMessage('Old fixture data. '.repeat(1200)),timestamp:i*2+1});
  }
  const compacted=await open('deepseek-fixture',compactManager);
  const beforeCompaction=classifications.length;
  chat.setResponses([fauxAssistantMessage('Fixture summary'),fauxAssistantMessage('Fixture turn-prefix summary')]);
  await compacted.compact();
  assert.equal(classifications.length,beforeCompaction,'Compaction must not call Jev');
  assert.ok(compactManager.getEntries().some(e=>e.type==='compaction'));
  contexts.length=0;chat.setResponses([respond('Continue after compaction')]);
  await compacted.prompt('Continue the fixture task.');
  assert.ok(JSON.stringify(contexts[0]).includes(body.trim()),'Skills must be hydrated after compaction');
  console.log('PASS real SDK compaction and subsequent hydration');
  const routingStarted=Promise.withResolvers();
  const releaseRouting=Promise.withResolvers();
  pauseRouting=async signal=>{routingStarted.resolve(signal);await releaseRouting.promise;};
  const stale=await open('deepseek-fixture');
  const beforeStale=classifications.length;
  contexts.length=0;chat.setResponses([respond('Control answer after interrupted routing')]);
  const pendingPrompt=stale.prompt('Start the fixture task.');
  const routingSignal=await routingStarted.promise;
  await stale.setModel(chat.getModel('control-fixture'));
  assert.equal(routingSignal.aborted,true,'Model switch must cancel pending routing');
  releaseRouting.resolve();await pendingPrompt;
  pauseRouting=undefined;
  assert.equal(classifications.length,beforeStale+1,'Stale route must not schedule review or another turn');
  assert.ok(!JSON.stringify(contexts[0]).includes(body.trim()),'Late routing result must not inject skills');
  assert.deepEqual(errors,[]);
  assert.equal(networkAttempts,0);
  console.log('PASS real SDK cancelled late routing after model switch; zero network requests');
} finally {
  for(const session of sessions) session.dispose();
  globalThis.fetch=originalFetch;
  for(const key of keys) if(saved[key]===undefined) delete process.env[key]; else process.env[key]=saved[key];
  rmSync(root,{recursive:true,force:true});
}
