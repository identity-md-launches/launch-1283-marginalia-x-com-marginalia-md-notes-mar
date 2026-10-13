import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeFunctionData, encodeFunctionResult } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { notedAuthors } from '../worker/noted.js';
import { environment } from './feedback-fixture.mjs';
const dist=process.env.SITE_DIR||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../dist');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'imd-deployment.json')));
const contracts=manifest.contracts.filter(contract=>['MarginaliaHook','MarginaliaAnnex'].includes(contract.name)).map(contract=>({...contract,abi:JSON.parse(fs.readFileSync(path.join(dist,contract.abiPath)))}));
const author=privateKeyToAccount(generatePrivateKey()).address.toLowerCase();
const request=new Request('https://marginalia.chat/api/feedback/today.json');
const originalFetch=globalThis.fetch;
let mode, reads;
function setup(patch={}){
  mode={hookPosted:0,annexPosted:0,...patch};reads=[];
  const env=environment();
  env.ASSETS={fetch:async request=>{const name=new URL(request.url).pathname.slice(1);let bytes=fs.readFileSync(path.join(dist,name));if(mode.badAbi&&name.startsWith('abi/'))bytes=Buffer.from('[]');return new Response(bytes);}};
  globalThis.fetch=async(url,init)=>{
    assert(manifest.network.rpcUrls.some(value => new URL(value).href === new URL(url).href),'Only configured RPC used');
    const body=JSON.parse(init.body);reads.push(body.method);
    let result;
    if(body.method==='eth_chainId')result=mode.wrongChain?'0x2':'0x1';
    else if(body.method==='eth_getCode')result=mode.noCode?'0x':'0x6000';
    else if(body.method==='eth_blockNumber')result='0x18fddff';
    else if(body.method==='eth_call'){
      const contract=contracts.find(contract=>contract.address.toLowerCase()===body.params[0].to.toLowerCase());
      const decoded=decodeFunctionData({abi:contract.abi,data:body.params[0].data});
      if(decoded.functionName==='hook')result=encodeFunctionResult({abi:contract.abi,functionName:'hook',result:mode.badBinding?author:contracts.find(contract=>contract.name==='MarginaliaHook').address});
      else{assert.equal(decoded.functionName,'records');assert.equal(decoded.args[0].toLowerCase(),author);assert.equal(body.params[1],'0x18fddff');const posted=contract.name==='MarginaliaHook'?mode.hookPosted:mode.annexPosted;const value=contract.name==='MarginaliaHook'?[0n,posted,0,0,0,0,0]:[0n,posted,0,0,0,0];result=encodeFunctionResult({abi:contract.abi,functionName:'records',result:value});}
    }else throw Error('Unexpected RPC method');
    return Response.json({jsonrpc:'2.0',id:body.id,result});
  };
  return env;
}
try{
  for(const patch of[{hookPosted:1},{annexPosted:1}]){
    const env=setup(patch);assert((await notedAuthors(env,request,[author])).has(author));assert.equal(await env.FEEDBACK.get(`noted:${author}`),'true');assert(reads.includes('eth_chainId'));assert(reads.includes('eth_getCode'));assert(reads.includes('eth_call'));
    reads=[];assert((await notedAuthors(env,request,[author])).has(author));assert.equal(reads.length,0);
  }
  for(const patch of[{}, {hookPosted:1,wrongChain:true},{hookPosted:1,noCode:true},{hookPosted:1,badAbi:true},{annexPosted:1,badBinding:true}])assert.equal((await notedAuthors(setup(patch),request,[author])).size,0);
  console.log('PASS note badges: hook OR Annex posted records, fixed block, configured RPC, canonical ABI/SHA, code/chain/hook binding, positive cache, absent/unverified fail closed.');
}finally{globalThis.fetch=originalFetch;}
