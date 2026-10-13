import { useEffect, useMemo, useState } from 'react';
import type { PublicClient } from 'viem';
import { Ctx, loadContracts, makePublicClient, useNow, useWallet, type Contracts } from './chain';
import { ANNEX_DEPLOY_BLOCK, loadDeployment, type AppConfig } from './config';
import { loadFeed, type FeedData } from './notes';
import { HistoryStatus } from './history';
import { AboutPage } from './pages/About';
import { AuthorPage } from './pages/Author';
import { TradeForm } from './trade';
import { DollarProvider } from './price';
import { AnnexNote } from './annex';
import { PagesPanel } from './pages/Pages';
import { HomePage, Scoreboard } from './pages/Home';
import { DuelPage } from './pages/Duel';
import { FeedPage } from './pages/Feed';
import { NotePage } from './pages/Note';
import { PoolsPage } from './pages/Pools';
import { PostPage } from './pages/Post';
import { SealPage } from './pages/Seal';
import { Caveat, Footer, Masthead, WalletBar } from './ui';
import { Feedback } from './feedback';

function useRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const on = () => {
      if (window.location.hash === '#main') { document.getElementById('main')?.focus(); return; }
      setRoute(window.location.hash.replace(/^#/, '') || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [pub, setPub] = useState<PublicClient | null>(null);
  const [contracts, setContracts] = useState<Contracts | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const wallet = useWallet(cfg);
  const now = useNow();
  const [bootFeedback, setBootFeedback] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]).get('tab') === 'feedback');
  useEffect(() => { if (route !== 'main') document.getElementById('main')?.focus({ preventScroll: true }); }, [route]);

  useEffect(() => {
    loadDeployment()
      .then(async (c) => {
        setCfg(c);
        const p = makePublicClient(c);
        setPub(p);
        setContracts(await loadContracts(p, c));
      })
      .catch((e) => setBootError((e as Error).message));
  }, []);

  const refreshFeed = useMemo(
    () => () => {
      if (!pub || !cfg) return;
      setFeedLoading(true);
      loadFeed(pub, cfg.hook)
        .then(async (hookFeed) => {
          let f = hookFeed;
          if (cfg.annex) {
            try { const a = await loadFeed(pub, cfg.annex, ANNEX_DEPLOY_BLOCK, 'annex'); f = { ...hookFeed, notes:[...hookFeed.notes,...a.notes].sort((x,y)=>x.block>y.block?-1:1),byId:new Map([...hookFeed.byId,...a.byId]),partial:hookFeed.partial||a.partial,warnings:[...hookFeed.warnings,...a.warnings.map(w=>`Annex: ${w}`)] }; }
            catch { f = {...hookFeed,partial:true,warnings:[...hookFeed.warnings,'Annex history unavailable. Its calls are missing from this record.']}; }
          }
          setFeed(f);
          setFeedError(null);
        })
        .catch((e) => setFeedError((e as Error).message))
        .finally(() => setFeedLoading(false));
    },
    [pub, cfg],
  );
  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  if (!cfg || !pub || !contracts || bootError) return <div className="page page-wide">
    <Masthead route={route} utility={<button type="button" className="quiet" onClick={wallet.connect} disabled={wallet.connecting}>{wallet.account ? 'Wallet connected' : 'Connect wallet'}</button>} />
    <main id="main"><div className="trade-intro"><h1>Trade it. Say why.</h1><p>The chain keeps the receipt.</p></div>
      <section className="trade-shell"><div className="composer-tabs" role="group" aria-label="Ways to post"><button disabled>Trade and post</button><button disabled>Just the call</button><button disabled>Write a thesis</button><button disabled>Launched tokens</button><button type="button" aria-pressed={bootFeedback} onClick={()=>setBootFeedback(value=>!value)}>Feedback</button></div>
        {bootFeedback ? <Feedback wallet={wallet} now={now}/> : <>
        <label htmlFor="boot-token">Token</label><input id="boot-token" placeholder="Paste a token address" disabled/>
        <label htmlFor="boot-amount">You pay</label><input id="boot-amount" placeholder="0.00" disabled/>
        <label htmlFor="boot-why">Why</label><input id="boot-why" placeholder="Make the call." disabled/>
        <div className="actions"><button className="primary" disabled>Trade and post</button></div>
        <p className="small" role="status">{bootError ? 'Ethereum reads unavailable. Trading is disabled.' : 'Checking deployment and reading Ethereum…'}</p>
        {bootError && <button type="button" className="quiet" onClick={()=>window.location.reload()}>Retry connection</button>}
        {wallet.error && <p className="status bad" role="alert">{wallet.error}</p>}</>}
      </section><Caveat />{bootError && <details><summary>Connection details</summary><p className="small">{bootError}</p></details>}
    </main>
  </div>;

  const feedState = { feed, error: feedError, loading: feedLoading, refresh: refreshFeed };
  let page;
  let isFeedPage = false;
  const m = (re: RegExp) => route.match(re);
  let seg;
  if ((seg = m(/^\/author\/(0x[0-9a-fA-F]{40})$/))) page = <AuthorPage key={route} address={seg[1] as `0x${string}`} {...feedState} />;
  else if ((seg = m(/^\/note\/(0x[0-9a-fA-F]{1,64})$/))) { const n=feed?.notes.find(n=>n.id.toLowerCase()===seg![1].toLowerCase()); page = n?.source==='annex' ? <AnnexNote key={route} n={n} refresh={refreshFeed}/> : <NotePage key={route} id={seg[1] as `0x${string}`} {...feedState} />; }
  else if ((seg = m(/^\/duel\/(0x[0-9a-fA-F]{1,64})$/))) page = <DuelPage key={route} id={seg[1] as `0x${string}`} {...feedState} />;
  else if (route.startsWith('/feed')) { page = <FeedPage key={route} {...feedState} />; isFeedPage = true; }
  else if (route.startsWith('/post')) { const target=new URLSearchParams(route.split('?')[1]).get('counter'); const n=feed?.notes.find(n=>n.id.toLowerCase()===target?.toLowerCase()); page=n?.source==='annex'?<><h1>Counter the call</h1><TradeForm annex counter={n} refresh={refreshFeed}/></>:<PostPage key={route} {...feedState}/>; }
  else if (route.startsWith('/seal')) page = <SealPage {...feedState} />;
  else if (route.startsWith('/pools')) page = <PoolsPage {...feedState} />;
  else if (route.startsWith('/scoreboard')) { page = <Scoreboard {...feedState} />; isFeedPage = true; }
  else if (cfg.pages && (seg = m(/^\/pages\/([a-zA-Z0-9_]{1,15})$/))) page = <PagesPanel handle={seg[1]} feed={feed}/>;
  else if (route.startsWith('/about')) page = <AboutPage />;
  else { page = <HomePage key={route} {...feedState} />; isFeedPage = true; }

  return (
    <Ctx.Provider value={{ cfg, pub, contracts, wallet, now }}>
      <DollarProvider><div className={`page ${isFeedPage || route.startsWith('/duel') ? 'page-wide' : ''}`}>
        <a className="skip-link" href="#main">Skip to content</a>
        <Masthead route={route} utility={<WalletBar />} />
        <main id="main" tabIndex={-1}>
          {!isFeedPage && feed && (feed.partial || feed.warnings.length > 0) && <HistoryStatus {...feedState} />}
          {page}
        </main>
        <Footer hook={contracts.hook} marg={contracts.marg} />
      </div></DollarProvider>
    </Ctx.Provider>
  );
}
