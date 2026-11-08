import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTeams} from '../lib/teams.mjs';
import {executeTask,validateRoute} from '../lib/workflow.mjs';
const teams=await loadTeams(new URL('../../ha_quality_team_v2/config/agents.json',import.meta.url));
const route={level:3,team:'ha',desk:'director',message:'SAR needs clinical and KPI verification',supports:[
 {team:'ha',desk:'clinical',reason:'check clinical claims',messageIndexes:[0]},
 {team:'ha',desk:'metrics',reason:'check denominators',messageIndexes:[1]}]};
const review={status:'needs_info',result:'Missing denominator',evidenceChecks:['Compared provided numerator and denominator'],limitations:['No denominator'],decisions:['Do not calculate rate']};
test('routine executes one call, logs actual result and unknown usage as null',async()=>{
 const logs=[],calls=[],events=[];
 await executeTask({teams,messages:[{content:'hello'}],emit:e=>events.push(e),onLog:e=>logs.push(e),run:async o=>{calls.push(o);return {level:1,team:'jeff',desk:'secretary',message:'hello',supports:[]};}});
 assert.equal(calls.length,1);assert.equal(logs.find(e=>e.status==='completed').usage,null);assert.equal(events.at(-1).team,'jeff');
});
test('collaboration scopes inputs, waits for independent supports and records leader review',async()=>{
 const logs=[],calls=[],events=[];
 await executeTask({teams,messages:[{content:'clinical-only'},{content:'metrics-only'}],emit:e=>events.push(e),onLog:e=>logs.push(e),run:async o=>{
 calls.push(o);if(o.schema?.properties.level)return route;if(o.schema)return review;
 if(o.system.includes('บทบาท'))return 'evidence finding';return 'draft';}});
 assert.equal(calls.length,5);assert.ok(!calls[2].prompt.includes('metrics-only'));assert.ok(!calls[3].prompt.includes('clinical-only'));
 assert.ok(calls[4].prompt.includes('evidence finding'));assert.equal(logs.filter(l=>l.status==='completed').length,5);
 assert.equal(logs.at(-1).phase,'acceptance');assert.equal(events.at(-1).state,'awaiting_user');
});
test('invalid plans cannot fan out',()=>{
 for(const changed of [{level:1},{team:'jeff',desk:'secretary'},{desk:'sar'},{supports:[...route.supports,...route.supports]},
 {supports:[{...route.supports[0],desk:'invented'}]},{supports:[{...route.supports[0],reason:''}]}])assert.throws(()=>validateRoute({...route,...changed},teams));
});
test('failure and invalid review never deliver ready; failures are logged',async()=>{
 for(const mode of ['throw','invalid']){
 const logs=[],events=[];let n=0;
 await assert.rejects(executeTask({teams,messages:[{},{}],emit:e=>events.push(e),onLog:e=>logs.push(e),run:async()=>{
 n++;if(n===1)return {...route,supports:[]};if(n===2){if(mode==='throw')throw Error('provider unavailable');return 'draft';}return {status:'ready',result:'unverified'};}}));
 assert.ok(!events.some(e=>e.state==='ready'));if(mode==='throw')assert.equal(logs.at(-1).status,'failed');
 }
});
test('invalid context indexes stop before specialist execution',async()=>{
 let calls=0;await assert.rejects(executeTask({teams,messages:[{}],emit(){},run:async()=>{calls++;return route;}}));assert.equal(calls,1);
});
test('call budget stops before extra model invocation',async()=>{
 let n=0;await assert.rejects(executeTask({teams,messages:[{},{}],emit(){},maxCalls:1,run:async()=>{n++;return route;}}),/งบ/);assert.equal(n,1);
});
