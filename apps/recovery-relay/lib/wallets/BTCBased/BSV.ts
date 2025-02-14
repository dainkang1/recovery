/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import { BitcoinSV as BSVBase, Input } from '@fireblocks/wallet-derivation';
import { AccountData, UTXO, TxPayload, RawSignature } from '../types';
import { LateInitConnectedWallet } from '../LateInitConnectedWallet';

export class BitcoinSV extends BSVBase implements LateInitConnectedWallet {
  private baseUrl: string = '';

  public getLateInitLabel() {
    return '';
  }

  public async getBalance(): Promise<number> {
    return (await this.prepare()).balance;
  }

  public updateDataEndpoint(endpoint: string): void {
    this.baseUrl = endpoint;
  }

  public async prepare(): Promise<AccountData> {
    throw new Error('Method not implemented.');
  }

  public async generateTx(
    to: string,
    amount: number,
    memo?: string | undefined,
    utxos?: UTXO[] | undefined,
    additionalParameters?: Map<string, object> | undefined,
  ): Promise<TxPayload> {
    throw new Error('Method not implemented.');
  }

  public broadcastTx(): Promise<string> {
    throw new Error('Method not implemented.');
  }

  private async _request(path: string, init?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    return res;
  }

  private async _requestJson<T>(path: string, init?: RequestInit) {
    const res = await this._request(path, init);
    const data = await res.json();
    return data as T;
  }
}
