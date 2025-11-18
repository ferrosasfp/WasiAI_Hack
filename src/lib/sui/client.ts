import { SuiClient } from '@mysten/sui/client';
import { env } from '@/config/env';

// Crear cliente Sui singleton
let suiClient: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (!suiClient) {
    const rpcUrl = env.NEXT_PUBLIC_SUI_RPC_URL || getDefaultRpcUrl();
    
    suiClient = new SuiClient({
      url: rpcUrl,
    });
  }
  
  return suiClient;
}

// Obtener URL RPC por defecto según la red
function getDefaultRpcUrl(): string {
  const network = env.NEXT_PUBLIC_SUI_NETWORK;
  
  const urls: Record<string, string> = {
    testnet: 'https://fullnode.testnet.sui.io:443',
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
  };
  
  return urls[network] || urls.testnet;
}

// Helper: Obtener balance de una dirección
export async function getBalance(address: string): Promise<bigint> {
  const client = getSuiClient();
  const balance = await client.getBalance({ owner: address });
  return BigInt(balance.totalBalance);
}

// Helper: Obtener objetos propiedad de una dirección
export async function getOwnedObjects(
  address: string,
  objectType?: string
) {
  const client = getSuiClient();
  
  const response = await client.getOwnedObjects({
    owner: address,
    filter: objectType ? { StructType: objectType } : undefined,
    options: {
      showType: true,
      showContent: true,
      showDisplay: true,
    },
  });
  
  return response.data;
}

// Helper: Obtener detalles de un objeto
export async function getObject(objectId: string) {
  const client = getSuiClient();
  
  return await client.getObject({
    id: objectId,
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showDisplay: true,
    },
  });
}

// Helper: Obtener transacción
export async function getTransaction(digest: string) {
  const client = getSuiClient();
  
  return await client.getTransactionBlock({
    digest,
    options: {
      showEffects: true,
      showEvents: true,
      showInput: true,
      showObjectChanges: true,
    },
  });
}

// Helper: Esperar a que una transacción se confirme
export async function waitForTransaction(
  digest: string,
  timeout: number = 30000
): Promise<boolean> {
  const client = getSuiClient();
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const tx = await client.getTransactionBlock({ digest });
      if (tx.effects?.status?.status === 'success') {
        return true;
      }
      if (tx.effects?.status?.status === 'failure') {
        return false;
      }
    } catch {
      // Transacción aún no disponible
    }
    
    // Esperar 1 segundo antes de reintentar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Transaction timeout');
}

// Helper: Validar dirección Sui
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

// Helper: Normalizar dirección Sui
export function normalizeSuiAddress(address: string): string {
  if (!address.startsWith('0x')) {
    address = '0x' + address;
  }
  return address.toLowerCase().padStart(66, '0');
}