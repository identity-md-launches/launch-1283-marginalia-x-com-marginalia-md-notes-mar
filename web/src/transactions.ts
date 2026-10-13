import type { Abi, Address, Hex } from 'viem';
import type { AppCtx } from './chain';
export async function sendChecked(app: AppCtx, address: Address, abi: Abi, functionName: string, args: readonly unknown[] = [], value?: bigint): Promise<Hex> {
  const account = app.wallet.account;
  if (!account || !app.wallet.onChain || !app.wallet.client) throw new Error('Connect a wallet on the configured chain.');
  if (await app.pub.getChainId() !== app.cfg.chainId) throw new Error('The RPC is on a different chain.');
  const code = await app.pub.getCode({ address });
  if (!code || code === '0x') throw new Error('The transaction target has no contract code.');
  const { request } = await app.pub.simulateContract({ address, abi, functionName, args, account, ...(value === undefined ? {} : { value }) });
  const accounts = await app.wallet.client.getAddresses();
  if (await app.wallet.client.getChainId() !== app.cfg.chainId || accounts[0]?.toLowerCase() !== account.toLowerCase()) throw new Error('Wallet or network changed. Review the action again.');
  return app.wallet.client.writeContract(request);
}
