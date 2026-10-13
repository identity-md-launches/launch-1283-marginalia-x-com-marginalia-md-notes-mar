// Shared pieces: addresses, tags, transaction buttons with their own pending state, the masthead and footer.
import { DollarSource } from './price';
import { useState, type ReactNode } from 'react';
import type { Address, Hex } from 'viem';
import { useApp } from './chain';
import { LINKS } from './config';
import { explainError, fmtDuration, short, STATUS_CLASS, STATUS_LABEL } from './lib';

export function Addr({ a, full = false, link = true }: { a: string; full?: boolean; link?: boolean }) {
  const { cfg } = useApp();
  const [copied, setCopied] = useState(false);
  const text = full ? a : short(a);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(a);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <span className="addr">
      {link ? (
        <a href={`${cfg.explorer}/address/${a}`} target="_blank" rel="noreferrer" title={a}>
          {text}
        </a>
      ) : (
        <span title={a}>{text}</span>
      )}{' '}
      <button type="button" className="copy quiet" onClick={copy} aria-label={`Copy address ${a}`}>
        {copied ? 'copied' : 'copy'}
      </button>
    </span>
  );
}

export function TxLink({ hash, label = 'transaction' }: { hash: Hex; label?: string }) {
  const { cfg } = useApp();
  return (
    <a className="mono" href={`${cfg.explorer}/tx/${hash}`} target="_blank" rel="noreferrer">
      {label} {short(hash, 8, 6)}
    </a>
  );
}

export function StatusTag({ status }: { status: number }) {
  return <span className={`tag ${STATUS_CLASS[status] ?? ''}`}>{STATUS_LABEL[status] ?? `status ${status}`}</span>;
}

export function Notice({ kind = '', children }: { kind?: '' | 'ok' | 'bad'; children: ReactNode }) {
  return (
    <div className={`notice ${kind}`} role={kind === 'bad' ? 'alert' : undefined}>
      {children}
    </div>
  );
}

export function Countdown({ until, prefix = '' }: { until: number; prefix?: string }) {
  const { now } = useApp();
  const left = until - now;
  if (left <= 0) return <span className="countdown">{prefix}now</span>;
  return (
    <span className="countdown" aria-live="off">
      {prefix}
      {fmtDuration(left)}
    </span>
  );
}

/** One transaction button: disabled on click, labelled while the wallet and the chain work, released in finally. */
export function TxButton({
  label,
  busyLabel,
  onSend,
  disabled,
  primary,
  onDone,
  explain,
  onBusyChange,
}: {
  onBusyChange?: (busy: boolean) => void;
  label: string;
  busyLabel: string;
  onSend: () => Promise<Hex>;
  disabled?: boolean;
  primary?: boolean;
  onDone?: (hash: Hex) => void | Promise<void>;
  explain?: string;
}) {
  const { pub, wallet } = useApp();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' | 'sent' | 'ok' | 'bad'; hash?: Hex; msg?: string }>({ kind: 'idle' });
  const ready = wallet.account && wallet.onChain && !disabled && !busy;
  const click = async () => {
    setBusy(true);
    onBusyChange?.(true);
    setState({ kind: 'idle' });
    try {
      const hash = await onSend();
      setState({ kind: 'sent', hash });
      const r = await pub.waitForTransactionReceipt({ hash });
      if (r.status === 'success') {
        setState({ kind: 'ok', hash });
        await onDone?.(hash);
      } else setState({ kind: 'bad', hash, msg: 'The transaction reverted on chain.' });
    } catch (e) {
      setState({ kind: 'bad', msg: explainError(e) });
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };
  return (
    <div>
      {explain && <p className="small">{explain}</p>}
      <div className="actions">
        <button type="button" className={primary ? 'primary' : ''} disabled={!ready} onClick={click} aria-busy={busy}>
          {busy ? busyLabel : label}
        </button>
        {state.kind === 'sent' && state.hash && (
          <span className="status">
            Sent. Waiting for confirmation… <TxLink hash={state.hash} />
          </span>
        )}
        {state.kind === 'ok' && state.hash && (
          <span className="status ok" role="status">
            Confirmed. <TxLink hash={state.hash} />
          </span>
        )}
      </div>
      {state.kind === 'bad' && (
        <p className="status bad" role="alert">
          {state.msg} {state.hash && <TxLink hash={state.hash} />}
        </p>
      )}
    </div>
  );
}

/** The four-state wallet strip: connect → switch → ready. */
export function WalletBar() {
  const { cfg, wallet } = useApp();
  return (
    <div className="walletbar">
      <span className="grow">
        {!wallet.account && !wallet.available && 'Public records. No wallet needed to read.'}
        {!wallet.account && wallet.available && 'Public records. No wallet needed to read.'}
        {wallet.account && wallet.onChain && (
          <>
            <Addr a={wallet.account} /> · {cfg.network.name}
          </>
        )}
        {wallet.account && !wallet.onChain && (
          <>
            Wallet on chain {wallet.chainId ?? '?'}; switch to {cfg.network.name}.
          </>
        )}
      </span>
      {wallet.account && wallet.onChain && <a className="small mono" href={`#/author/${wallet.account}`}>{wallet.account.slice(0,6)}…{wallet.account.slice(-4)}</a>}
      {!wallet.account && (
        <button type="button" className="quiet" onClick={wallet.connect} disabled={wallet.connecting}>
          {wallet.connecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      )}
      {wallet.account && !wallet.onChain && (
        <button type="button" className="primary" onClick={wallet.switchChain} disabled={wallet.switching}>
          {wallet.switching ? 'Switching…' : `Switch to ${cfg.network.name}`}
        </button>
      )}
      {wallet.error && (
        <p className="status bad" role="alert">
          {wallet.error}
        </p>
      )}
    </div>
  );
}

const NAV: [string, string][] = [
  ['#/', 'Home'],
  ['#/feed', 'Feed'],
  ['#/scoreboard', 'Record'],
  ['#/seal', 'Seal'],
  ['#/pools', 'Pools'],
  ['#/about', 'About'],
];

export function Masthead({ route, utility }: { route: string; utility?: ReactNode }) {
  const current = (href: string) => (href === '#/' ? route === '/' || route === '' : route.startsWith(href.slice(1)));
  return (
    <header className="masthead">
      <a className="brand" href="#/">
        <span className="mark" aria-hidden="true">
          ☞
        </span>
        Marginalia
      </a>
      {utility}
      <nav aria-label="Sections">
        {NAV.map(([href, label]) => (
          <a key={href} href={href} aria-current={current(href) ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}

export function Footer({ hook, marg }: { hook: Address; marg: Address }) {
  const { cfg } = useApp();
  return (
    <footer className="footer">
      <p>
        <a href={LINKS.x} target="_blank" rel="noreferrer">
          x.com/marginalia_md
        </a>{' '}
        ·{' '}
        <a href={LINKS.launch} target="_blank" rel="noreferrer">
          launch #1283 on the explorer
        </a>{' '}
        ·{' '}
        <a href={`${cfg.explorer}/address/${hook}`} target="_blank" rel="noreferrer">
          hook on Etherscan
        </a>{' '}
        ·{' '}
        <a href="#/feedback">Feedback</a>{' '}
        ·{' '}
        <a href="#/about">About</a>
      </p>
      <p>
        Hook <span className="addr">{hook}</span>
        <br />
        MARG <span className="addr">{marg}</span>
      </p>
      <Caveat />
      <DollarSource/>
      <p>
        A right call returns its bond. Reputation is the record; the weekly prize is judged separately.
        Read directly from Ethereum. No backend, analytics or third-party scripts.
      </p>
    </footer>
  );
}

export function WalletAction({ children }: { children: ReactNode }) {
  const { cfg, wallet } = useApp();
  if (!wallet.account) return <><button type="button" className="primary" onClick={wallet.connect} disabled={wallet.connecting}>{wallet.connecting ? 'Connecting…' : 'Connect wallet'}</button>{wallet.error && <p className="status bad" role="alert">{wallet.error}</p>}</>;
  if (!wallet.onChain) return <p className="status" role="status">Switch to {cfg.network.name} using the wallet control above.</p>;
  return <>{children}</>;
}
export function Caveat() {
  return <p className="caveat">Built, audited and deployed by the identity.md swarm, an open network of AI agents, with a review on our side and nothing we can patch. New: it can break, misprice, or refuse to do what it says. Nothing here is advice. Post with an amount you are willing to lose.</p>;
}
