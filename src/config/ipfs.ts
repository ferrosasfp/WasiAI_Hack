/**
 * IPFS Configuration
 * Centralized configuration for IPFS gateways and Pinata API
 */

/**
 * IPFS Gateway URLs
 */
export const IPFS_GATEWAYS = {
  primary: process.env.NEXT_PUBLIC_IPFS_GATEWAY_PRIMARY || 'https://ipfs.io',
  secondary: process.env.NEXT_PUBLIC_IPFS_GATEWAY_SECONDARY || 'https://gateway.pinata.cloud',
  pinata: process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud',
  fallbacks: [
    process.env.NEXT_PUBLIC_IPFS_GATEWAY_3 || 'https://dweb.link',
    process.env.NEXT_PUBLIC_IPFS_GATEWAY_4 || 'https://cf-ipfs.com',
  ],
} as const

/**
 * Pinata API Configuration
 */
export const PINATA_CONFIG = {
  apiUrl: process.env.PINATA_API_URL || 'https://api.pinata.cloud',
  endpoints: {
    pinFile: '/pinning/pinFileToIPFS',
    pinJson: '/pinning/pinJSONToIPFS',
    pinCid: '/pinning/pinByHash',
    unpin: '/pinning/unpin',
  },
} as const

/**
 * Helper: Convert IPFS URI to HTTP gateway URL
 * 
 * @param uri - IPFS URI (ipfs://, Qm..., or HTTP)
 * @param gateway - Gateway to use (default: primary)
 * @returns HTTP URL
 */
export function ipfsToHttp(uri: string, gateway?: string): string {
  if (!uri) return ''
  
  const gw = gateway || IPFS_GATEWAYS.primary
  
  // Already HTTP
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri
  }
  
  // ipfs:// protocol
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    return `${gw}/ipfs/${cid}`
  }
  
  // /ipfs/ path
  if (uri.startsWith('/ipfs/')) {
    return `${gw}${uri}`
  }
  
  // Raw CID (Qm... or b...)
  if (uri.match(/^(Qm[a-zA-Z0-9]{44}|b[a-zA-Z0-9]{58,})/)) {
    return `${gw}/ipfs/${uri}`
  }
  
  // Fallback: treat as CID
  return `${gw}/ipfs/${uri}`
}

/**
 * Helper: Convert IPFS URI to internal API route
 * Uses Next.js API route for proxying IPFS content
 * 
 * @param uri - IPFS URI
 * @returns API route path
 */
export function ipfsToApiRoute(uri: string): string {
  if (!uri) return ''
  
  // Already HTTP
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri
  }
  
  // ipfs:// protocol
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    return `/api/ipfs/ipfs/${cid}`
  }
  
  // /ipfs/ path
  if (uri.startsWith('/ipfs/')) {
    return `/api/ipfs${uri}`
  }
  
  // Raw CID
  return `/api/ipfs/ipfs/${uri}`
}

/**
 * Helper: Extract CID from any IPFS URI format
 * 
 * @param uri - IPFS URI in any format
 * @returns CID or empty string
 */
export function extractCid(uri: string): string {
  if (!uri) return ''
  
  // ipfs:// protocol
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', '')
  }
  
  // /ipfs/ path
  if (uri.startsWith('/ipfs/')) {
    return uri.replace('/ipfs/', '')
  }
  
  // HTTP gateway URL
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const url = new URL(uri)
      const match = url.pathname.match(/\/ipfs\/([^/]+)/)
      if (match) return match[1]
    } catch {}
  }
  
  // Already a CID
  if (uri.match(/^(Qm[a-zA-Z0-9]{44}|b[a-zA-Z0-9]{58,})/)) {
    return uri
  }
  
  return ''
}

/**
 * Helper: Check if string is a valid CID
 */
export function isValidCid(str: string): boolean {
  if (!str) return false
  // CIDv0 (Qm...)
  if (/^Qm[a-zA-Z0-9]{44}$/.test(str)) return true
  // CIDv1 (b...)
  if (/^b[a-zA-Z0-9]{58,}$/.test(str)) return true
  return false
}

/**
 * Helper: Get Pinata API endpoint
 */
export function getPinataEndpoint(endpoint: keyof typeof PINATA_CONFIG.endpoints): string {
  return `${PINATA_CONFIG.apiUrl}${PINATA_CONFIG.endpoints[endpoint]}`
}

/**
 * Helper: Get all gateway URLs for fallback retries
 */
export function getAllGateways(): string[] {
  return [
    IPFS_GATEWAYS.primary,
    IPFS_GATEWAYS.secondary,
    ...IPFS_GATEWAYS.fallbacks,
  ].filter(Boolean)
}

/**
 * Helper: Convert gateway URL back to ipfs:// URI
 */
export function httpToIpfs(url: string): string {
  if (!url) return ''
  
  // Already ipfs://
  if (url.startsWith('ipfs://')) return url
  
  // Extract CID from HTTP URL
  const cid = extractCid(url)
  if (cid) return `ipfs://${cid}`
  
  return url
}

/**
 * Helper: Normalize IPFS URI to ipfs:// format
 */
export function normalizeIpfsUri(uri: string): string {
  const cid = extractCid(uri)
  return cid ? `ipfs://${cid}` : uri
}
