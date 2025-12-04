import hre from "hardhat";

/**
 * Complete end-to-end verification of model, agent, x402, and licenses
 * 
 * Usage:
 *   MODEL_ID=2 npx hardhat run scripts/e2eVerification.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = Number(process.env.MODEL_ID);
  if (!modelId) {
    console.error('ERROR: MODEL_ID environment variable is required');
    process.exit(1);
  }
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  const API_BASE = process.env.API_BASE || 'http://localhost:3000';
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                    WASIAI END-TO-END VERIFICATION                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Model ID: ${modelId}`);
  console.log(`Marketplace: ${marketplaceAddress}`);
  console.log(`API Base: ${API_BASE}`);
  console.log('');
  
  const results: { check: string; status: string; details?: string }[] = [];
  
  // Get contracts
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const agentRegistryAddress = await marketplace.agentRegistry();
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  const licenseAddress = await marketplace.licenseNFT();
  const licenseNFT = await ethers.getContractAt('LicenseNFT', licenseAddress);
  
  // ========== 1. MODEL VERIFICATION ==========
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ 1. MODEL VERIFICATION                                                │');
  console.log('└──────────────────────────────────────────────────────────────────────┘');
  
  try {
    const model = await marketplace.models(modelId);
    
    if (model.owner === ethers.ZeroAddress) {
      results.push({ check: 'Model exists', status: '❌', details: 'Model not found' });
    } else {
      results.push({ check: 'Model exists', status: '✅', details: `Owner: ${model.owner.slice(0,10)}...` });
      results.push({ check: 'Model listed', status: model.listed ? '✅' : '❌' });
      results.push({ check: 'Model URI', status: model.uri ? '✅' : '❌', details: model.uri?.slice(0,30) + '...' });
      results.push({ check: 'Perpetual price', status: model.pricePerpetual > 0 ? '✅' : '⚠️', details: `${ethers.formatUnits(model.pricePerpetual, 6)} USDC` });
      results.push({ check: 'Inference price', status: model.priceInference > 0 ? '✅' : '⚠️', details: `${ethers.formatUnits(model.priceInference, 6)} USDC` });
      results.push({ check: 'Inference wallet', status: model.inferenceWallet !== ethers.ZeroAddress ? '✅' : '❌' });
      results.push({ check: 'Royalty configured', status: model.royaltyBps > 0 ? '✅' : '⚠️', details: `${Number(model.royaltyBps) / 100}%` });
      results.push({ check: 'Terms hash', status: model.termsHash !== ethers.ZeroHash ? '✅' : '⚠️' });
    }
  } catch (e: any) {
    results.push({ check: 'Model exists', status: '❌', details: e.message });
  }
  
  // ========== 2. AGENT VERIFICATION ==========
  console.log('');
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ 2. AGENT VERIFICATION                                                │');
  console.log('└──────────────────────────────────────────────────────────────────────┘');
  
  try {
    const agentId = await agentRegistry.modelToAgent(modelId);
    
    if (agentId === 0n) {
      results.push({ check: 'Agent registered', status: '❌', details: 'No agent for this model' });
    } else {
      results.push({ check: 'Agent registered', status: '✅', details: `Agent ID: ${agentId}` });
      
      const agent = await agentRegistry.agents(agentId);
      results.push({ check: 'Agent active', status: agent.active ? '✅' : '❌' });
      results.push({ check: 'Agent wallet', status: agent.wallet !== ethers.ZeroAddress ? '✅' : '❌' });
      
      // Endpoint check
      if (!agent.endpoint || agent.endpoint === '') {
        results.push({ check: 'Agent endpoint', status: '❌', details: 'Empty' });
      } else if (agent.endpoint.includes('localhost')) {
        results.push({ check: 'Agent endpoint', status: '⚠️', details: 'Localhost (fallback)' });
      } else if (agent.endpoint.startsWith('https://')) {
        results.push({ check: 'Agent endpoint', status: '✅', details: agent.endpoint.slice(0,40) + '...' });
      } else {
        results.push({ check: 'Agent endpoint', status: '⚠️', details: 'Non-HTTPS' });
      }
      
      // NFT ownership
      try {
        const owner = await agentRegistry.ownerOf(agentId);
        results.push({ check: 'Agent NFT minted', status: '✅', details: `Owner: ${owner.slice(0,10)}...` });
      } catch (e) {
        results.push({ check: 'Agent NFT minted', status: '❌' });
      }
    }
  } catch (e: any) {
    results.push({ check: 'Agent verification', status: '❌', details: e.message });
  }
  
  // ========== 3. x402 CONFIGURATION ==========
  console.log('');
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ 3. x402 INFERENCE CONFIGURATION                                      │');
  console.log('└──────────────────────────────────────────────────────────────────────┘');
  
  try {
    const model = await marketplace.models(modelId);
    const agentId = await agentRegistry.modelToAgent(modelId);
    
    const x402Enabled = model.priceInference > 0n;
    results.push({ check: 'x402 enabled', status: x402Enabled ? '✅' : '❌', details: x402Enabled ? `${ethers.formatUnits(model.priceInference, 6)} USDC/call` : 'Price is 0' });
    
    if (agentId > 0n) {
      const agent = await agentRegistry.agents(agentId);
      const hasValidEndpoint = agent.endpoint && !agent.endpoint.includes('localhost') && agent.endpoint.startsWith('https://');
      results.push({ check: 'x402 endpoint ready', status: hasValidEndpoint ? '✅' : '❌' });
      
      // Test endpoint reachability
      if (hasValidEndpoint) {
        try {
          const response = await fetch(agent.endpoint, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          results.push({ check: 'Endpoint reachable', status: response.status < 500 ? '✅' : '⚠️', details: `HTTP ${response.status}` });
        } catch (e: any) {
          results.push({ check: 'Endpoint reachable', status: '⚠️', details: 'Timeout or error' });
        }
      }
    }
  } catch (e: any) {
    results.push({ check: 'x402 verification', status: '❌', details: e.message });
  }
  
  // ========== 4. LICENSE VERIFICATION ==========
  console.log('');
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ 4. LICENSE VERIFICATION                                              │');
  console.log('└──────────────────────────────────────────────────────────────────────┘');
  
  try {
    const totalSupply = await licenseNFT.totalSupply();
    let licensesForModel = 0;
    let validLicenses = 0;
    
    for (let i = 1; i <= Number(totalSupply); i++) {
      try {
        const license = await marketplace.licenses(i);
        if (Number(license.modelId) === modelId) {
          licensesForModel++;
          const status = await marketplace.licenseStatus(i);
          if (!status[0] && (status[1] || status[2])) {
            validLicenses++;
          }
        }
      } catch (e) {}
    }
    
    results.push({ check: 'Licenses sold', status: licensesForModel > 0 ? '✅' : '⚠️', details: `${licensesForModel} total` });
    results.push({ check: 'Valid licenses', status: validLicenses > 0 ? '✅' : '⚠️', details: `${validLicenses} active` });
  } catch (e: any) {
    results.push({ check: 'License verification', status: '❌', details: e.message });
  }
  
  // ========== 5. DATABASE SYNC ==========
  console.log('');
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ 5. DATABASE SYNC (Neon)                                              │');
  console.log('└──────────────────────────────────────────────────────────────────────┘');
  
  try {
    const response = await fetch(`${API_BASE}/api/models/evm/${modelId}`);
    if (response.ok) {
      const data = await response.json();
      results.push({ check: 'Model in DB', status: '✅' });
      results.push({ check: 'Metadata cached', status: data.data?.metadata ? '✅' : '❌' });
      results.push({ check: 'Image URL', status: data.data?.metadata?.cover?.cid ? '✅' : '⚠️' });
    } else {
      results.push({ check: 'Model in DB', status: '❌', details: `HTTP ${response.status}` });
    }
  } catch (e: any) {
    results.push({ check: 'Database sync', status: '⚠️', details: 'API not reachable' });
  }
  
  // ========== SUMMARY ==========
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                           VERIFICATION RESULTS                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const passed = results.filter(r => r.status === '✅').length;
  const warnings = results.filter(r => r.status === '⚠️').length;
  const failed = results.filter(r => r.status === '❌').length;
  
  for (const result of results) {
    const details = result.details ? ` (${result.details})` : '';
    console.log(`  ${result.status} ${result.check}${details}`);
  }
  
  console.log('');
  console.log('─'.repeat(74));
  console.log(`  Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  console.log('─'.repeat(74));
  
  if (failed === 0 && warnings === 0) {
    console.log('');
    console.log('  🎉 ALL CHECKS PASSED! Model is fully operational.');
  } else if (failed === 0) {
    console.log('');
    console.log('  ✅ Core functionality working. Review warnings for improvements.');
  } else {
    console.log('');
    console.log('  ❌ Some checks failed. Review issues above.');
  }
  
  console.log('');
}

main().catch(console.error);
