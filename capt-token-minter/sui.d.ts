declare module '@mysten/sui.js' {
  export class Ed25519Keypair {
    static fromSecretKey(privateKey: Uint8Array): Ed25519Keypair;
    getPublicKey(): { toSuiAddress(): string };
  }
  
  export class RawSigner {
    constructor(keypair: Ed25519Keypair, client: SuiClient);
    getAddress(): Promise<string>;
    signAndExecuteTransactionBlock(params: { 
      transactionBlock: TransactionBlock, 
      options?: { 
        showEffects?: boolean, 
        showObjectChanges?: boolean 
      } 
    }): Promise<any>;
  }
  
  export class TransactionBlock {
    constructor();
    moveCall(params: { 
      target: string, 
      arguments: any[] 
    }): void;
    object(id: string): any;
    pure(value: any): any;
    setGasBudget(budget: number): void;
  }
  
  export class SuiClient {
    constructor(params: { url: string });
  }
  
  export function getFullnodeUrl(network: string): string;
} 