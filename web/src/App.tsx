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
import { HomePage, Prize, PROMISE, Scoreboard, WALLET_LINE } from './pages/Home';
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
const query = (route: string) => new URLSearchParams(route.split('?')[1] || '');

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
  const q = query(route);
  const feedbackRoute = route.startsWith('/feedback') || q.get('tab') === 'feedback';
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

  // Boot and failure state: the promise, the caveat and the doors (disabled until Ethereum reads), plus signature-only Feedback.
  if (!cfg || !pub || !contracts || bootError) return <div className="page page-wide">
    <Masthead route={route} utility={<button type="button" className="quiet" onClick={wallet.connect} disabled={wallet.connecting}>{wallet.account ? 'Wallet connected' : 'Connect wallet'}</button>} />
    <main id="main"><div className="promise"><h1>{PROMISE.map(line => <span key={line}>{line}</span>)}</h1></div><Caveat />
      {feedbackRoute ? <section className="trade-shell writing-shell"><h2>Feedback</h2><Feedback wallet={wallet} now={now}/></section> : <section className="doors" aria-label="Three doors">
        {[['Make a call', 'A target, a horizon and one line of why, with your trade if you want it.'], ['Write a thesis', "A longer argument for this week's pot."], ['Your pages', 'Your own page and record. Readers back you by holding your pages.']].map(([title, line]) => <div className="door" key={title}><h2>{title}</h2><p>{line}</p><button type="button" className="primary" disabled>{title}</button></div>)}
        <p className="door-secondary"><a href="#/scoreboard">See who is right</a> · the public record, by hit rate.</p>
        <p className="small wallet-line">{WALLET_LINE}</p>
        <p className="small" role="status">{bootError ? 'Ethereum reads unavailable. Calls, theses and pages are disabled until they return.' : 'Checking deployment and reading Ethereum…'}</p>
        {bootError && <button type="button" className="quiet" onClick={()=>window.location.reload()}>Retry connection</button>}
        {wallet.error && <p className="status bad" role="alert">{wallet.error}</p>}
      </section>}
      {bootError && <details><summary>Connection details</summary><p className="small">{bootError}</p></details>}
      <p className="small"><a href="#/feedback">Feedback</a> needs no chain read: a signature only.</p>
    </main>
  </div>;

  const feedState = { feed, error: feedError, loading: feedLoading, refresh: refreshFeed };
  let page;
  let isFeedPage = false;
  const m = (re: RegExp) => route.match(re);
  let seg;
  const counterNote = (id: string | null) => feed?.notes.find(n => n.id.toLowerCase() === id?.toLowerCase());
  if ((seg = m(/^\/author\/(0x[0-9a-fA-F]{40})$/))) page = <AuthorPage key={route} address={seg[1] as `0x${string}`} {...feedState} />;
  else if ((seg = m(/^\/note\/(0x[0-9a-fA-F]{1,64})$/))) { const n=feed?.notes.find(n=>n.id.toLowerCase()===seg![1].toLowerCase()); page = n?.source==='annex' ? <AnnexNote key={route} n={n} refresh={refreshFeed}/> : <NotePage key={route} id={seg[1] as `0x${string}`} {...feedState} />; }
  else if ((seg = m(/^\/duel\/(0x[0-9a-fA-F]{1,64})$/))) page = <DuelPage key={route} id={seg[1] as `0x${string}`} {...feedState} />;
  else if (feedbackRoute) page = <><h1>Feedback</h1><section className="trade-shell writing-shell"><Feedback wallet={wallet} now={now}/></section></>;
  else if (route.startsWith('/feed')) { page = <FeedPage key={route} {...feedState} />; isFeedPage = true; }
  else if (route.startsWith('/call') || (route.split('?')[0] === '/' && q.has('child'))) { const n = counterNote(q.get('counter')); page = <><h1>Make a call</h1><p className="lede">Right returns your bond. Wrong loses it. The chain decides.</p><section className="trade-shell"><TradeForm key={route} counter={n} childId={q.get('child')} initialToken={q.get('token')} refresh={refreshFeed}/></section><Caveat/></>; }
  else if (route.startsWith('/thesis')) page = <><h1>Write a thesis</h1><Prize loadedAt={feed?.loadedAt}/><section className="trade-shell writing-shell"><PostPage key={route} {...feedState} initialMode="thesis" embedded/></section><Caveat/></>;
  else if (route.startsWith('/post')) { const n=counterNote(q.get('counter')); page=n?.source==='annex'?<><h1>Counter the call</h1><section className="trade-shell"><TradeForm annex counter={n} refresh={refreshFeed}/></section></>:<PostPage key={route} {...feedState}/>; }
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
