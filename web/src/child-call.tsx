import { useApp, useRead } from './chain';
import { fmtDate, short } from './lib';
import { parentIdOf, readThesisParent, thesisParentError } from './thesis-parent';

export function useThesisParent(value: string) {
  const { pub, contracts, wallet, now } = useApp();
  const requested = !!value.trim();
  const id = parentIdOf(value);
  const account = wallet.account;
  const read = useRead(id && account && wallet.onChain
    ? () => readThesisParent(pub, contracts.hook, id, contracts.limits.thesisGrace) : null,
  [id, account, wallet.onChain, Math.floor(now / 15)], [id, account, wallet.onChain]);
  const error = !requested ? null : !id ? 'Enter a nonzero hex thesis ID, or leave the parent empty.'
    : !account ? 'Connect the thesis’s author wallet to check this parent.'
    : !wallet.onChain ? 'Switch to Ethereum to check this parent.'
    : read.error ?? (read.data ? thesisParentError(read.data, account, now) : null);
  return { id, requested, error, readError: read.error, ready: !requested || !!read.data && !error && !read.loading, loading: read.loading, parent: read.data, refresh: read.refresh };
}

export function ChildCallContext({ state }: { state: ReturnType<typeof useThesisParent> }) {
  return <p className="small child-call-context" role="status">
    {state.requested && (state.parent && !state.error
      ? <>Child call under your thesis <a href={`#/note/${state.parent.id}`}>{short(state.parent.id)}</a>, due {fmtDate(state.parent.graceEnd)}</>
      : state.error || 'Checking your thesis on chain…')}
  </p>;
}

export function ThesisParentField({ value, onChange, state, id = 'parent', disabled = false }: {
  value: string; onChange: (value: string) => void; state: ReturnType<typeof useThesisParent>; id?: string; disabled?: boolean;
}) {
  return <div className="thesis-parent-field">
    <label htmlFor={id}>Parent (your own open thesis)</label>
    <span className="hint" id={`${id}-hint`}>Optional. Any token and either side; post before the thesis’s child-call deadline.</span>
    <input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder="0x… thesis id, or empty" autoComplete="off" spellCheck={false}
      disabled={disabled} aria-invalid={!!state.error} aria-describedby={`${id}-hint ${id}-status`} />
    <p className={`small ${state.error ? 'status bad' : ''}`} id={`${id}-status`} role="status">
      {state.error || (state.loading ? 'Checking parent…' : '')}
    </p>
    {state.readError && <button type="button" className="quiet" disabled={disabled || state.loading} onClick={state.refresh}>Retry parent check</button>}
  </div>;
}
