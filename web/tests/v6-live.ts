// Optional, read-only smoke check. RPC is supplied on the command line and never persisted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPublicClient, http, type Address } from 'viem';
import { PagesAbi } from '../src/pages-abi';
import { intakeAbi } from '../src/market-abi';
import { readPagesDirectory } from '../src/pages-data';
const manifest = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const address = (name: string): Address => manifest.contracts.find((c: { name: string }) => c.name === name).address;
const pages = address('MarginaliaPages');
const pub = createPublicClient({ transport: http(process.argv[2], {timeout:20000,retryCount:1}), ccipRead:false });
assert.equal(await pub.getChainId(),manifest.chainId);
const blockNumber=await pub.getBlockNumber({cacheTime:0});
assert((await pub.getCode({address:pages,blockNumber}))!.length>2);
const h={address:pages,abi:PagesAbi,blockNumber} as const;
const [hook,annex,intake,action,claimWindow,answerDeadline]=await Promise.all([
 pub.readContract({...h,functionName:'hook'}),pub.readContract({...h,functionName:'annex'}),pub.readContract({...h,functionName:'intake'}),pub.readContract({...h,functionName:'action'}),pub.readContract({...h,functionName:'CLAIM_WINDOW'}),pub.readContract({...h,functionName:'ANSWER_DEADLINE'}),
]);
assert.equal(hook.toLowerCase(),address('MarginaliaHook').toLowerCase());assert.equal(annex.toLowerCase(),address('MarginaliaAnnex').toLowerCase());
assert.equal(claimWindow,90n*86400n);assert.equal(answerDeadline,3n*86400n);
const oracleCost=await pub.readContract({address:intake,abi:intakeAbi,functionName:'priceOf',args:[action,manifest.network.pairToken.address],blockNumber});
const directory=await readPagesDirectory(pub,pages);
console.log(JSON.stringify({source:manifest.network.rpcUrls[0],chainId:manifest.chainId,blockNumber,pages,bindingsVerified:true,claimWindow,answerDeadline,oracleCost,directory,transactionsSent:0},(_,v)=>typeof v==='bigint'?v.toString():v,2));
