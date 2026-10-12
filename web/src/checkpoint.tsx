import { MarginaliaRouterAbi } from './abi';
import { useApp, useRead } from './chain';
import { fmtDate, venueId, type NoteParams } from './lib';
import { Countdown, Notice, TxButton } from './ui';

export function useCheckpoint(params: NoteParams | null) {
  const { pub, contracts, now } = useApp();
  const id = params ? venueId(params.venue) : null;
  const read = useRead(id ? async () => ({
    id,
    window: await pub.readContract({ address: contracts.router, abi: MarginaliaRouterAbi, functionName: 'priceWindows', args: [id] }),
  }) : null, [id, Math.floor(now / 15)]);
  const window = read.data?.id === id ? read.data?.window : undefined;
  const startedAt = window ? Number(window[0]) : 0;
  const age = now - startedAt;
  const state = !window || read.error ? 'loading' : !startedAt ? 'none' : age < 3600 ? 'young' : age <= 21600 ? 'ready' : 'stale';
  return { ...read, startedAt, age, state };
}

export function Checkpoint({ params, window: win, purpose = 'Posting', disabled = false }: {
  params: NoteParams; window: ReturnType<typeof useCheckpoint>; purpose?: 'Posting' | 'Sealing'; disabled?: boolean;
}) {
  const { pub, contracts, wallet } = useApp();
  const send = async () => {
    const { request } = await pub.simulateContract({ address: contracts.router, abi: MarginaliaRouterAbi, functionName: 'checkpointVenue', args: [params, contracts.poolKey], account: wallet.account! });
    return wallet.client!.writeContract(request);
  };
  return <>
    <p className="small">Checkpoint this venue, then wait one hour before {purpose === 'Sealing' ? 'sealing' : 'posting'}. The router records a baseline; it must be <strong>between 1 and 6 hours old</strong>.</p>
    {win.error && <Notice kind="bad"><p>Could not read the checkpoint. Refresh to try again.</p><button type="button" onClick={win.refresh}>Refresh checkpoint</button></Notice>}
    {win.state === 'loading' && !win.error && <p className="small">Reading the checkpoint…</p>}
    {win.state === 'young' && <Notice><p>Checkpointed {fmtDate(win.startedAt)}. {purpose} opens in <Countdown until={win.startedAt + 3600} /> and stays open until {fmtDate(win.startedAt + 21600)}.</p></Notice>}
    {win.state === 'ready' && <Notice kind="ok"><p>Checkpoint is {Math.floor(win.age / 60)} minutes old. {purpose} has a mature checkpoint for <Countdown until={win.startedAt + 21600} /> more.</p></Notice>}
    {win.state === 'stale' && <Notice kind="bad"><p>The last checkpoint is older than 6 hours. Checkpoint again and wait one hour.</p></Notice>}
    {(win.state === 'none' || win.state === 'stale') && <TxButton label={win.state === 'none' ? 'Checkpoint venue' : 'Checkpoint venue again'} busyLabel="Checkpointing…" primary disabled={disabled} onSend={send} onDone={win.refresh} explain={disabled ? 'New sealing is unavailable; no checkpoint transaction is needed for a seal that cannot be created here.' : undefined} />}
  </>;
}
