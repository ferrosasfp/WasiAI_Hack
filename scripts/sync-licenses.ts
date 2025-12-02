#!/usr/bin/env tsx
/**
 * Sync all licenses from blockchain to Neon DB
 * Reads license data directly from contract state
 */

import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { createPublicClient, http } from 'viem'
import { avalancheFuji } from 'viem/chains'
import { query, queryOne } from '../src/lib/db'
import MARKET_ARTIFACT from '../src/abis/Marketplace.json'

const CHAIN_ID = 43113
const MARKET_ADDRESS = process.env.NEXT_PUBLIC_EVM_MARKET_43113 as `0x${string}`
const RPC_URL = process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc'

async function main() {
  console.log('🔄 Syncing licenses from blockchain to Neon DB...')
  console.log(`   Chain: ${CHAIN_ID}`)
  console.log(`   Market: ${MARKET_ADDRESS}`)
  
  const client = createPublicClient({
    chain: avalancheFuji,
    transport: http(RPC_URL),
  })
  
  const abi = MARKET_ARTIFACT.abi as any
  
  // Get total licenses
  const lastLicenseId = await client.readContract({
    address: MARKET_ADDRESS,
    abi,
    functionName: 'lastLicenseId',
    args: [],
  }) as bigint
  
  console.log(`📊 Total licenses on chain: ${lastLicenseId}`)
  
  let synced = 0
  let skipped = 0
  
  for (let tokenId = 1; tokenId <= Number(lastLicenseId); tokenId++) {
    try {
      // Check if already in DB
      const existing = await queryOne<any>(
        'SELECT token_id FROM licenses WHERE token_id = $1 AND chain_id = $2',
        [tokenId, CHAIN_ID]
      )
      
      if (existing) {
        console.log(`  ⏭️  License #${tokenId} already in DB`)
        skipped++
        continue
      }
      
      // Get license data from contract
      // licenseStatus returns: (revoked_, validApi, validDownload, kind, expiresAt, owner)
      const status = await client.readContract({
        address: MARKET_ADDRESS,
        abi,
        functionName: 'licenseStatus',
        args: [BigInt(tokenId)],
      }) as [boolean, boolean, boolean, number, bigint, string]
      
      const [revoked, validApi, validDownload, kind, expiresAt, owner] = status
      
      // Skip burned/zero-address licenses
      if (owner === '0x0000000000000000000000000000000000000000') {
        console.log(`  ⏭️  License #${tokenId} is burned (zero address)`)
        skipped++
        continue
      }
      
      // Get modelId from LicenseMinted event logs
      // For now, we'll need to scan events or use a fallback
      // Since we can't easily get modelId without events, we'll set it to 0
      // and update it later when we have the event data
      const modelId = 0 // Will be updated from events
      
      console.log(`  📝 License #${tokenId}: model=${modelId}, kind=${kind}, owner=${owner.slice(0,10)}...`)
      
      // expires_at is stored as BIGINT (unix timestamp), 0 means perpetual
      const expiresAtValue = Number(expiresAt)
      
      // Insert into DB
      await query(
        `INSERT INTO licenses (
          token_id, model_id, owner, kind, expires_at, chain_id,
          revoked, valid_api, valid_download, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (token_id, chain_id) DO UPDATE SET
          owner = EXCLUDED.owner,
          kind = EXCLUDED.kind,
          expires_at = EXCLUDED.expires_at,
          revoked = EXCLUDED.revoked,
          valid_api = EXCLUDED.valid_api,
          valid_download = EXCLUDED.valid_download`,
        [
          tokenId,
          modelId,
          owner.toLowerCase(),
          Number(kind),
          expiresAtValue, // BIGINT unix timestamp
          CHAIN_ID,
          revoked,
          validApi,
          validDownload,
        ]
      )
      
      synced++
    } catch (error: any) {
      console.error(`  ❌ Failed to sync license #${tokenId}:`, error.message)
    }
  }
  
  console.log(`\n✅ Sync complete: ${synced} synced, ${skipped} skipped`)
  
  // Now scan events to get modelIds for licenses with model_id=0
  console.log('\n🔍 Scanning LicenseMinted events to update modelIds...')
  
  const licensesWithoutModel = await query<{ token_id: number }>(
    'SELECT token_id FROM licenses WHERE chain_id = $1 AND model_id = 0',
    [CHAIN_ID]
  )
  
  if (licensesWithoutModel.length > 0) {
    console.log(`   Found ${licensesWithoutModel.length} licenses without modelId`)
    
    // Get LicenseMinted events - scan in batches due to RPC limits
    const licenseMintedEvent = abi.find((e: any) => e.type === 'event' && e.name === 'LicenseMinted')
    if (licenseMintedEvent) {
      try {
        const latestBlock = await client.getBlockNumber()
        const BATCH_SIZE = 2000n
        let allLogs: any[] = []
        
        // Scan from recent blocks backwards (most licenses are recent)
        for (let toBlock = latestBlock; toBlock > 0n; toBlock -= BATCH_SIZE) {
          const fromBlock = toBlock > BATCH_SIZE ? toBlock - BATCH_SIZE + 1n : 0n
          
          try {
            const logs = await client.getLogs({
              address: MARKET_ADDRESS,
              event: licenseMintedEvent as any,
              fromBlock,
              toBlock,
            })
            allLogs = [...allLogs, ...logs]
            
            if (logs.length > 0) {
              console.log(`   Found ${logs.length} events in blocks ${fromBlock}-${toBlock}`)
            }
            
            // Stop if we found enough events
            if (allLogs.length >= 20) break
          } catch {}
          
          // Limit scan to last 500k blocks (about 2 weeks on Fuji)
          if (latestBlock - fromBlock > 500000n) break
        }
        
        console.log(`   Total: ${allLogs.length} LicenseMinted events`)
        
        for (const log of allLogs) {
          const args = (log as any).args
          const licenseId = Number(args?.licenseId || args?.tokenId || 0)
          const modelId = Number(args?.modelId || 0)
          
          if (licenseId > 0 && modelId > 0) {
            await query(
              'UPDATE licenses SET model_id = $1 WHERE token_id = $2 AND chain_id = $3',
              [modelId, licenseId, CHAIN_ID]
            )
            console.log(`   ✅ Updated license #${licenseId} → model ${modelId}`)
          }
        }
      } catch (error: any) {
        console.error('   ❌ Failed to scan events:', error.message)
      }
    }
  } else {
    console.log('   All licenses have modelIds')
  }
  
  console.log('\n✅ All done!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
