import { useId, useRef, useState } from 'react';
import { useApp, useRead } from '../chain';
import { Person } from '../identity';
import { fmtAmount, short } from '../lib';
import { PagesAbi } from '../pages-abi';
import { pagesSearchRoute, readPagesDirectory, type PageSubject } from '../pages-data';
import { sendChecked } from '../transactions';
import { TxButton, WalletAction } from '../ui';

export function PagesSearch() {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <form className="pages-search" onSubmit={e => {
    e.preventDefault(); const route = pagesSearchRoute(text);
    if (route) { setError(false); window.location.hash = route; }
    else { setError(true); input.current?.focus(); }
  }}>
    <label htmlFor="pages-search">X handle or wallet address</label>
    <div><input ref={input} id="pages-search" name="subject" type="search" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="@handle or 0x…" value={text} onChange={e => { setText(e.target.value); setError(false); }} aria-invalid={error} aria-describedby={error ? 'pages-search-error' : undefined}/><button className="primary" type="submit">Find pages</button></div>
    {error && <p id="pages-search-error" role="alert">Enter a full wallet address or an X handle of 1–15 letters, numbers or underscores.</p>}
  </form>;
}

export function PagesDirectory() {
  const { contracts, pub, wallet } = useApp();
  const read = useRead(contracts.pages ? () => readPagesDirectory(pub, contracts.pages!, wallet.account ?? undefined) : null, [pub, contracts.pages, wallet.account]);
  const data = read.error ? undefined : read.data;
  const tradeGaps = !!data?.gaps.some(g => g.kind === 'trades');
  const uncertain = tradeGaps || !!data?.rows.some(r => r.holdingsFailed || r.supply === null);
  return <section className="pages-directory">
    <div className="section-head"><h1>Pages</h1>{wallet.account ? <span className="small mono" title={wallet.account}>{short(wallet.account)}</span> : <button type="button" onClick={wallet.connect} disabled={wallet.connecting}>Connect wallet</button>}</div>
    <p>Back a writer by holding their pages.</p>
    <PagesSearch/>
    {!contracts.pages ? <p role="status">Pages are unavailable until the contract is verified.</p> : <>
      <div className="section-head"><h2>Writers with pages</h2><button type="button" className="quiet" disabled={read.loading} onClick={read.refresh}>{read.loading ? 'Reading…' : 'Refresh pages'}</button></div>
      <p className="small">Ranked by backers, then pages.{uncertain && ' Counts and order are incomplete; only verified backers count.'}</p>
      <p role="status" className="small">{read.error ? 'Pages reads failed. Retry with Refresh pages.' : read.loading ? 'Reading Pages trades and current holdings…' : data ? `${data.rows.length} subjects found · block ${data.to}.` : ''}</p>
      {data && data.gaps.length > 0 && <details className="pages-gaps"><summary>Incomplete history · {data.gaps.length} unread ranges</summary><p>Missing trades can hide subjects, backers and your holdings. Missing registrations can hide handle names. Refresh to retry.</p><ul>{data.gaps.map((g, i) => <li key={i}>{g.kind}: blocks {g.from.toString()}–{g.to.toString()}</li>)}</ul></details>}
      {data && <ul className="page-subjects">{data.rows.map(row => <li key={row.subject} data-subject={row.subject}>
        <SubjectName row={row}/>
        <div className="page-subject-stats"><span>{row.holdingsFailed ? 'Backers unknown' : `${tradeGaps ? '≥' : ''}${row.backers} backers`}</span><span>{row.supply?.toString() ?? 'Unknown'} pages</span><span>Next page {row.next === null ? 'unavailable' : `${fmtAmount(row.next)} IMD`}</span></div>
        {row.holdingsFailed > 0 && <p className="small">{row.backers} verified; {row.holdingsFailed} balance reads failed. Refresh to retry.</p>}
      </li>)}</ul>}
      {data && !data.rows.length && <p className="empty">{tradeGaps ? 'No subjects found in the readable history.' : 'No pages held yet.'} Find a writer above to open their backing controls.</p>}
      <section aria-labelledby="your-pages"><h2 id="your-pages">Your pages</h2>
        {!wallet.account ? <p>Connect your wallet to see your holdings.</p> : data ? <>
          {(tradeGaps || data.rows.some(r => r.holding === null)) && <p className="small" role="status">Your holdings may be incomplete. Only verified balances appear below; refresh to retry.</p>}
          <ul className="page-holdings">{data.rows.filter(r => (r.holding ?? 0n) > 0n).map(row => <li key={row.subject}><SubjectName row={row}/><p>You hold {row.holding!.toString()} pages.</p><details><summary>Sell back</summary><SellPages row={row} refresh={read.refresh}/></details></li>)}</ul>
          {!data.rows.some(r => (r.holding ?? 0n) > 0n) && <p>No verified holdings found{tradeGaps ? ' in the readable history' : ''}.</p>}
        </> : <p>{read.error ? 'Holdings unavailable. Refresh to retry.' : 'Reading your holdings…'}</p>}
      </section>
    </>}
  </section>;
}

function SubjectName({ row }: { row: PageSubject }) {
  return row.author ? <Person address={row.author}/> : row.handle ? <a className="page-handle" href={`#/pages/${row.handle}`}>@{row.handle}</a> : <span title={row.subject}>Handle unavailable · {short(row.subject)}</span>;
}

function SellPages({ row, refresh }: { row: PageSubject; refresh: () => Promise<void> }) {
  const app = useApp(); const { pub, contracts, wallet, now } = app;
  const [amountText, setAmount] = useState('1'); const [busy, setBusy] = useState(false);
  const id = useId();
  const amount = /^[1-9]\d?$/.test(amountText) && Number(amountText) <= 10 ? BigInt(amountText) : null;
  const read = useRead(wallet.account && amount ? async () => {
    const h = { address: contracts.pages!, abi: PagesAbi, blockNumber: await pub.getBlockNumber({ cacheTime: 0 }) } as const;
    const holding = await pub.readContract({ ...h, functionName: 'pagesOf', args: [row.subject, wallet.account!] });
    const quote = holding >= amount ? await pub.readContract({ ...h, functionName: 'sellPrice', args: [row.subject, amount] }) : null;
    return { holding, quote };
  } : null, [row.subject, wallet.account, amountText, row.holding, Math.floor(now / 15)], [row.subject, wallet.account, amountText, row.holding]);
  const data = read.error ? undefined : read.data;
  const receive = data?.quote ? data.quote[0] - data.quote[1] : 0n;
  const minOut = receive * 99n / 100n;
  return <div className="pages-sell"><label htmlFor={id}>Pages to sell</label><input id={id} inputMode="numeric" value={amountText} onChange={e => setAmount(e.target.value)} disabled={busy}/>
    {data?.quote && <><p>You receive {fmtAmount(receive)} IMD for {amountText} pages.</p><p className="small">Includes {fmtAmount(data.quote[1])} IMD fee. Minimum {fmtAmount(minOut)} IMD · 1% slippage.</p></>}
    {data && amount && data.holding < amount && <p role="alert">You hold {data.holding.toString()} pages. Choose that amount or less.</p>}
    {read.error && <p role="alert">Sell quote unavailable. <button onClick={read.refresh}>Retry quote</button></p>}
    <WalletAction><TxButton label="Sell pages" busyLabel="Selling pages…" disabled={busy || !amount || !data?.quote || minOut <= 0n} onBusyChange={setBusy} onSend={() => sendChecked(app, contracts.pages!, PagesAbi, 'sell', [row.subject, amount, minOut])} onDone={async () => { await read.refresh(); await refresh(); }}/></WalletAction>
  </div>;
}
