/** No USD oracle or price endpoint is included in the verified handoff. Never guess a dollar price. */
export function UsdContext() {
  return <span className="small" title="The deployment supplies no verified IMD/USD price source.">USD context unavailable</span>;
}
