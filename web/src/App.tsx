import { useEffect, useMemo, useRef, useState } from 'react';
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
import { PagesDirectory, PagesSearch } from './pages/PagesDirectory';
import { Prize, Scoreboard } from './pages/Home';
import { DuelPage } from './pages/Duel';
import { FeedPage } from './pages/Feed';
import { NotePage } from './pages/Note';
import { PoolsPage } from './pages/Pools';
import { PostPage } from './pages/Post';
import { SealPage } from './pages/Seal';
import { Caveat, WalletBar } from './ui';
import { Shell, PotChip, ComposeSheet } from './shell';
import { IdentityProvider } from './identity';
import { FeedContext } from './social';
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
  const previousRoute = useRef(route);
  useEffect(() => {
    const composing = (r: string) => /^\/(call|thesis)/.test(r) || (r.split('?')[0] === '/' && query(r).has('child'));
    if (!composing(route) && !composing(previousRoute.current)) document.getElementById('main')?.focus({ preventScroll: true });
    previousRoute.current = route;
  }, [route]);

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
    () => {
      // Retain each contract's last snapshot until its replacement arrives, so a
      // faster Hook refresh cannot remove a mounted Annex receipt or composer.
      const parts: Partial<Record<'hook' | 'annex', FeedData>> = {};
      return () => {
        if (!pub || !cfg) return;
        setFeedLoading(true);
        const publish = () => {
          const h = parts.hook, a = parts.annex;
          if (!h) return;
          const waiting = !!cfg.annex && !a;
          const f: FeedData = a ? {
            ...h, notes: [...h.notes, ...a.notes].sort((x, y) => x.block > y.block ? -1 : 1),
            byId: new Map([...h.byId, ...a.byId]), partial: h.partial || a.partial,
            scanning: h.scanning || a.scanning,
            warnings: [...h.warnings, ...a.warnings.map(w => `Annex: ${w}`)],
            coverageDetails: [`Hook: ${h.coverage?.map(([x,y]) => `${x}–${y}`).join(', ') || 'none'}`, `Annex: ${a.coverage?.map(([x,y]) => `${x}–${y}`).join(', ') || 'none'}`],
          } : { ...h, partial: h.partial || waiting, scanning: h.scanning || waiting };
          setFeed(previous => ({ ...f, loadedAt: Math.max(Date.now(), (previous?.loadedAt ?? 0) + 1) }));
          setFeedError(null);
        };
        const hook = loadFeed(pub, cfg.hook, undefined, 'hook', f => { parts.hook = f; publish(); })
          .then(f => { parts.hook = f; publish(); });
        const annex = cfg.annex ? loadFeed(pub, cfg.annex, ANNEX_DEPLOY_BLOCK, 'annex', f => { parts.annex = f; publish(); })
          .then(f => { parts.annex = f; publish(); })
          .catch(() => {
            parts.annex = { ...(parts.annex ?? { notes: [], byId: new Map(), seals: [], toBlock: 0n, loadedAt: Date.now() }), partial: true, scanning: false,
              warnings: [parts.annex ? 'History refresh unavailable. Previously loaded calls are still shown; refresh to retry.' : 'History unavailable. Its calls are missing from this record.'] };
            publish();
          }) : Promise.resolve();
        void Promise.all([hook, annex])
          .catch((e) => setFeedError((e as Error).message))
          .finally(() => setFeedLoading(false));
      };
    },
    [pub, cfg],
  );
  useEffect(() => {
    if (!feedbackRoute) refreshFeed();
  }, [refreshFeed, feedbackRoute]);

  // The shell and Feedback remain reachable while verified chain reads are unavailable.
  if (!cfg || !pub || !contracts || bootError) return <Shell route={route} wallet={wallet}>
    <main id="main" tabIndex={-1} className="app-main">
      {route.startsWith('/pages') ? <><h1>Pages</h1><p>Back a writer by holding their pages.</p><PagesSearch/><p role="status">{bootError ? 'Pages reads unavailable. Retry to load holdings and enable backing.' : 'Verifying Pages and reading Ethereum…'}</p>{bootError && <button onClick={() => window.location.reload()}>Retry connection</button>}</> : feedbackRoute ? <><h1>Feedback</h1><Feedback/></> : route.startsWith('/about') ? <><h1>About Marginalia</h1><Caveat/><p>Calls, theses and backing, recorded on Ethereum.</p></> : <>
        <div className="section-head"><h1>Feed</h1><button type="button" className="quiet" onClick={wallet.connect} disabled={wallet.connecting}>{wallet.account ? 'Wallet connected' : 'Connect wallet'}</button></div>
        <div className="feed-tabs tabs" aria-label="Feed views">{['Latest', 'Settling soon', 'Theses', 'Backed'].map(t => <button type="button" key={t} disabled>{t}</button>)}</div>
        <p className="empty" role="status">{bootError ? 'Ethereum reads unavailable. Retry to load the record and enable calls.' : 'Checking the deployment and reading Ethereum…'}</p>
        {bootError && <button type="button" onClick={() => window.location.reload()}>Retry connection</button>}
        {/^\/(call|thesis)/.test(route) && <p>Compose opens after the contract checks complete.</p>}
        {bootError && <details><summary>Connection details</summary><p className="small">{bootError}</p></details>}
      </>}
      {wallet.error && !feedbackRoute && <p className="status bad" role="alert">{wallet.error}</p>}
    </main>
  </Shell>;

  const feedState = { feed, error: feedError, loading: feedLoading, refresh: refreshFeed };
  let page;
  let isFeedPage = false;
  const m = (re: RegExp) => route.split('?')[0].match(re);
  let seg;
  const counterNote = (id: string | null) => feed?.notes.find(n => n.id.toLowerCase() === id?.toLowerCase());
  if ((seg = m(/^\/author\/(0x[0-9a-fA-F]{40})$/))) page = <AuthorPage key={route} address={seg[1] as `0x${string}`} {...feedState} />;
  else if ((seg = m(/^\/note\/(0x[0-9a-fA-F]{1,64})$/))) { const n=feed?.notes.find(n=>n.id.toLowerCase()===seg![1].toLowerCase()); page = n?.source==='annex' ? <AnnexNote key={route} n={n} refresh={refreshFeed}/> : <NotePage key={route} id={seg[1] as `0x${string}`} {...feedState} />; }
  else if ((seg = m(/^\/duel\/(0x[0-9a-fA-F]{1,64})$/))) page = <DuelPage key={route} id={seg[1] as `0x${string}`} {...feedState} />;
  else if (feedbackRoute) page = <><h1>Feedback</h1><section className="trade-shell writing-shell"><Feedback/></section></>;
  else if (route.startsWith('/feed')) { page = <FeedPage key={route} {...feedState} />; isFeedPage = true; }
  else if (route.startsWith('/call') || route.startsWith('/thesis') || (route.split('?')[0] === '/' && q.has('child'))) {
    const thesis = route.startsWith('/thesis');
    page = <><FeedPage {...feedState}/><ComposeSheet thesis={thesis} close={() => { window.location.hash = '#/'; }}>
      <WalletBar/>
      {thesis ? <><Prize loadedAt={feed?.loadedAt}/><PostPage key={route} {...feedState} initialMode="thesis" embedded/></> : q.has('counter') && !counterNote(q.get('counter')) ? <p role="status">{feed && !feedLoading ? 'This call is outside the loaded history; close the sheet and refresh the feed.' : 'Reading the call to counter…'}</p> : <TradeForm key={route} annex={counterNote(q.get('counter'))?.source === 'annex'} counter={counterNote(q.get('counter'))} childId={q.get('child')} initialToken={q.get('token')} refresh={refreshFeed}/>}
    </ComposeSheet></>;
    isFeedPage = true;
  }
  else if (route.startsWith('/post')) { const n=counterNote(q.get('counter')); page=n?.source==='annex'?<><h1>Counter the call</h1><section className="trade-shell"><TradeForm annex counter={n} refresh={refreshFeed}/></section></>:<PostPage key={route} {...feedState}/>; }
  else if (route.startsWith('/seal')) page = <SealPage {...feedState} />;
  else if (route.startsWith('/pools')) page = <PoolsPage {...feedState} />;
  else if (route.startsWith('/scoreboard')) { page = <Scoreboard {...feedState} />; isFeedPage = true; }
  else if (m(/^\/pages\/?$/)) page = <PagesDirectory/>;
  else if (cfg.pages && (seg = m(/^\/pages\/([a-zA-Z0-9_]{1,15})$/))) page = <PagesPanel key={seg[1].toLowerCase()} handle={seg[1]} feed={feed}/>;
  else if (route.startsWith('/about')) page = <AboutPage />;
  else { page = <FeedPage key={route} {...feedState} />; isFeedPage = true; }

  return (
    <Ctx.Provider value={{ cfg, pub, contracts, wallet, now }}>
      <IdentityProvider><FeedContext.Provider value={feed}><DollarProvider>
        <Shell route={route} wallet={wallet} pot={<PotChip/>}>
          <main id="main" tabIndex={-1} className="app-main">
            {!feedbackRoute && wallet.account && !wallet.onChain && <WalletBar/>}
            {wallet.error && !feedbackRoute && <p className="status bad" role="alert">{wallet.error}</p>}
            {!isFeedPage && !feedbackRoute && feed && (feed.partial || feed.warnings.length > 0) && <HistoryStatus {...feedState} />}
            {page}
          </main>
          <footer className="app-footer"><a href="#/about">About</a><a href="#/post">Exact-parameter Post</a><a href="#/seal">Seal</a></footer>
        </Shell>
      </DollarProvider></FeedContext.Provider></IdentityProvider>
    </Ctx.Provider>
  );
}
