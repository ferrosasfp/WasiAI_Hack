/**
 * Sync blockchain data to Neon DB via API
 * 
 * Usage: 
 *   npx hardhat run scripts/syncToNeon.ts --network avax
 *   API_BASE=https://wasiai.com npx hardhat run scripts/syncToNeon.ts --network avax
 *   MODEL_ID=2 npx hardhat run scripts/syncToNeon.ts --network avax
 */
async function main() {
  const API_BASE = process.env.API_BASE || 'http://localhost:3000';
  const chainId = 43113; // Avalanche Fuji
  const modelId = Number(process.env.MODEL_ID) || 0;
  
  console.log('='.repeat(60));
  console.log('Syncing Blockchain → Neon DB');
  console.log('='.repeat(60));
  console.log('API Base:', API_BASE);
  console.log('Chain ID:', chainId);
  if (modelId) console.log('Model ID:', modelId);
  console.log('');
  
  if (modelId > 0) {
    // Sync specific model
    console.log(`1. Syncing model #${modelId} from blockchain...`);
    const syncRes = await fetch(`${API_BASE}/api/indexer/recache?modelId=${modelId}&sync=true&chainId=${chainId}`);
    const syncData = await syncRes.json();
    
    if (syncData.success) {
      console.log('   ✅ Model synced successfully');
      console.log('   Data:', JSON.stringify(syncData.data, null, 2));
    } else {
      console.log('   ❌ Sync failed:', syncData.error || syncData.message);
    }
  } else {
    // Full sync
    
    // Step 1: Run indexer for new models/licenses
    console.log('1. Running indexer for new data...');
    try {
      const indexerRes = await fetch(`${API_BASE}/api/indexer?chainId=${chainId}`);
      const indexerData = await indexerRes.json();
      console.log('   Models indexed:', indexerData.modelsIndexed);
      console.log('   Agents indexed:', indexerData.agentsIndexed);
      console.log('   Licenses indexed:', indexerData.licensesIndexed);
      console.log('   Blocks scanned:', indexerData.blocksScanned);
    } catch (e: any) {
      console.log('   ⚠️  Indexer error:', e.message);
    }
    
    // Step 2: Re-sync all models from blockchain
    console.log('');
    console.log('2. Re-syncing all models from blockchain...');
    try {
      const syncRes = await fetch(`${API_BASE}/api/indexer/recache?all=true&sync=true`);
      const syncData = await syncRes.json();
      console.log('   Result:', syncData.message);
      if (syncData.results) {
        const success = syncData.results.filter((r: any) => r.success).length;
        const failed = syncData.results.filter((r: any) => !r.success).length;
        console.log(`   Success: ${success}, Failed: ${failed}`);
      }
    } catch (e: any) {
      console.log('   ⚠️  Sync error:', e.message);
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Sync complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
