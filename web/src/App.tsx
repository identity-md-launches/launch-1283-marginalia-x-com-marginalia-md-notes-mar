import { useEffect, useMemo, useState } from 'react';
import type { PublicClient } from 'viem';
import { Ctx, loadContracts, makePublicClient, useNow, useWallet, type Contracts } from './chain';
import { loadDeployment, type AppConfig } from './config';
import { loadFeed, type FeedData } from './notes';
import { HistoryStatus } from './history';
import { AboutPage } from './pages/About';
import { AuthorPage } from './pages/Author';
import { HomePage } from './pages/Home';
import { DuelPage } from './pages/Duel';
import { FeedPage } from './pages/Feed';
import { NotePage } from './pages/Note';
import { PoolsPage } from './pages/Pools';
import { PostPage } from './pages/Post';
import { SealPage } from './pages/Seal';
import { Footer, Masthead, Notice, WalletBar } from './ui';

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
        .then((f) => {
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

  if (bootError) {
    return (
      <main className="page">
        <Masthead route={route} />
        <Notice kind="bad">
          <p>The site could not load its deployment configuration or reach Ethereum: {bootError}</p>
          <p>The site needs its verified configuration and an Ethereum connection before it can offer transactions.</p><button type="button" onClick={() => window.location.reload()}>Retry connection</button>
        </Notice>
      </main>
    );
  }
  if (!cfg || !pub || !contracts) {
    return (
      <main className="page">
        <Masthead route={route} />
        <p className="lede" aria-busy="true">
          Reading the contracts from Ethereum…
        </p>
      </main>
    );
  }

  const feedState = { feed, error: feedError, loading: feedLoading, refresh: refreshFeed };
  let page;
  let isFeedPage = false;
  const m = (re: RegExp) => route.match(re);
  let seg;
  if ((seg = m(/^\/author\/(0x[0-9a-fA-F]{40})$/))) page = <AuthorPage key={route} address={seg[1] as `0x${string}`} {...feedState} />;
  else if ((seg = m(/^\/note\/(0x[0-9a-fA-F]{1,64})$/))) page = <NotePage key={route} id={seg[1] as `0x${string}`} {...feedState} />;
  else if ((seg = m(/^\/duel\/(0x[0-9a-fA-F]{1,64})$/))) page = <DuelPage key={route} id={seg[1] as `0x${string}`} {...feedState} />;
  else if (route.startsWith('/feed')) { page = <FeedPage key={route} {...feedState} />; isFeedPage = true; }
  else if (route.startsWith('/post')) page = <PostPage key={route} {...feedState} />;
  else if (route.startsWith('/seal')) page = <SealPage {...feedState} />;
  else if (route.startsWith('/pools')) page = <PoolsPage {...feedState} />;
  else if (route.startsWith('/about')) page = <AboutPage />;
  else { page = <HomePage {...feedState} />; isFeedPage = true; }

  return (
    <Ctx.Provider value={{ cfg, pub, contracts, wallet, now }}>
      <div className={`page ${isFeedPage || route.startsWith('/duel') ? 'page-wide' : ''}`}>
        <a className="skip-link" href="#main">Skip to content</a>
        <Masthead route={route} />
        <WalletBar />
        <main id="main" tabIndex={-1}>
          {!isFeedPage && feed && (feed.partial || feed.warnings.length > 0) && <HistoryStatus {...feedState} />}
          {page}
        </main>
        <Footer hook={contracts.hook} marg={contracts.marg} />
      </div>
    </Ctx.Provider>
  );
}
