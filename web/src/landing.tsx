import { useEffect, useState } from 'react';
import { loadDeployment } from './config';
import { makePublicClient } from './chain';
import { MarginaliaHookAbi } from './abi';
import { fmtAmount, fmtDate } from './lib';
import { Caveat } from './ui';
import { PROMISE } from './pages/Home';

export function Landing() {
  const [pot, setPot] = useState<{ pool: bigint; closes: number }>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const cfg = await loadDeployment(), pub = makePublicClient(cfg);
        if (await pub.getChainId() !== cfg.chainId) throw new Error('Wrong chain');
        const blockNumber = await pub.getBlockNumber();
        const h = { address: cfg.hook, abi: MarginaliaHookAbi, blockNumber } as const;
        const week = await pub.readContract({ ...h, functionName: 'week' });
        const pool = await pub.readContract({ ...h, functionName: 'thesisPool', args: [week] });
        if (active) { setPot({ pool, closes: (week + 1) * 604800 }); setError(false); }
      } catch { if (active) { setPot(undefined); setError(true); } }
    };
    void read();
    const timer = setInterval(read, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <div className="landing">
    <header><a className="brand" href="./"><span className="mark" aria-hidden="true">☞</span> Marginalia</a></header>
    <main id="main">
      <h1>{PROMISE[0]}</h1>
      <p className="landing-promise">{PROMISE[1]} {PROMISE[2]}</p>
      <ol className="landing-steps">
        {['Make a call with a bond', 'The chain settles it', 'Readers back the ones who are right'].map((step, i) => <li key={step}><span aria-hidden="true">{i + 1}</span>{step}</li>)}
      </ol>
      <div className="landing-pot" aria-live="polite"><span>This week’s thesis pot</span><strong>{pot ? `${fmtAmount(pot.pool)} IMD` : error ? 'Unavailable' : 'Reading…'}</strong><span className="small">{pot ? `Entries close ${fmtDate(pot.closes)}` : error ? 'Open the app to retry the live read.' : 'Reading the entry deadline from Ethereum.'}</span></div>
      <a className="button primary launch-app" href="./app/">Launch app <span aria-hidden="true">↗</span></a>
      <Caveat />
    </main>
    <footer><a href="./app/#/about">About</a><a href="./agents.md">agents.md</a><a href="./llms.txt">llms.txt</a></footer>
  </div>;
}
