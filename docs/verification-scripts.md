# WasiAI Verification Scripts

Scripts para verificar el correcto funcionamiento del marketplace, agents, licencias y x402 inference.

## Tabla de Contenidos

1. [Indexar Fuentes de Verdad a Neon DB](#1-indexar-fuentes-de-verdad-a-neon-db)
2. [Verificar Modelo y Agent](#2-verificar-modelo-y-agent)
3. [Verificar x402 Inference](#3-verificar-x402-inference)
4. [Verificar Compra de Licencia](#4-verificar-compra-de-licencia)
5. [Script Completo End-to-End](#5-script-completo-end-to-end)

---

## 1. Indexar Fuentes de Verdad a Neon DB

### Opción A: Via API (Recomendado)

```bash
# Re-indexar un modelo específico (blockchain + IPFS metadata)
curl "http://localhost:3000/api/indexer/recache?modelId=1&sync=true&chainId=43113"

# Re-indexar todos los modelos
curl "http://localhost:3000/api/indexer/recache?all=true&sync=true"

# Solo re-cachear metadata IPFS (sin sync de blockchain)
curl "http://localhost:3000/api/indexer/recache?modelId=1"

# Ejecutar indexer completo (nuevos modelos/licencias)
curl "http://localhost:3000/api/indexer?chainId=43113"
```

### Opción B: Script Hardhat

Crear archivo `contracts/evm/scripts/syncToNeon.ts`:

```typescript
import hre from "hardhat";

/**
 * Sync blockchain data to Neon DB via API
 * Usage: npx hardhat run scripts/syncToNeon.ts --network avax
 */
async function main() {
  const API_BASE = process.env.API_BASE || 'http://localhost:3000';
  const chainId = 43113; // Avalanche Fuji
  
  console.log('='.repeat(60));
  console.log('Syncing Blockchain → Neon DB');
  console.log('='.repeat(60));
  
  // Step 1: Run indexer for new models/licenses
  console.log('\n1. Running indexer for new data...');
  const indexerRes = await fetch(`${API_BASE}/api/indexer?chainId=${chainId}`);
  const indexerData = await indexerRes.json();
  console.log('   Models indexed:', indexerData.modelsIndexed);
  console.log('   Agents indexed:', indexerData.agentsIndexed);
  console.log('   Licenses indexed:', indexerData.licensesIndexed);
  
  // Step 2: Re-sync all models from blockchain
  console.log('\n2. Re-syncing all models from blockchain...');
  const syncRes = await fetch(`${API_BASE}/api/indexer/recache?all=true&sync=true`);
  const syncData = await syncRes.json();
  console.log('   Result:', syncData.message);
  
  console.log('\n' + '='.repeat(60));
  console.log('Sync complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
```

---

## 2. Verificar Modelo y Agent

### Script: `contracts/evm/scripts/verifyModelAgent.ts`

```typescript
import hre from "hardhat";

/**
 * Verify model and agent registration on blockchain
 * 
 * Usage:
 *   MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax
 * 
 * Environment variables:
 *   MODEL_ID - The model ID to verify (required)
 *   MARKETPLACE_ADDRESS - Override marketplace address (optional)
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = Number(process.env.MODEL_ID);
  if (!modelId) {
    console.error('ERROR: MODEL_ID environment variable is required');
    console.log('Usage: MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax');
    process.exit(1);
  }
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  console.log('='.repeat(70));
  console.log('MODEL & AGENT VERIFICATION');
  console.log('='.repeat(70));
  console.log('Model ID:', modelId);
  console.log('Marketplace:', marketplaceAddress);
  console.log('');
  
  // Get contracts
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const agentRegistryAddress = await marketplace.agentRegistry();
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  const licenseAddress = await marketplace.licenseNFT();
  const licenseNFT = await ethers.getContractAt('LicenseNFT', licenseAddress);
  
  console.log('AgentRegistry:', agentRegistryAddress);
  console.log('LicenseNFT:', licenseAddress);
  console.log('');
  
  // ========== MODEL VERIFICATION ==========
  console.log('─'.repeat(70));
  console.log('1. MODEL DATA (MarketplaceV2)');
  console.log('─'.repeat(70));
  
  const model = await marketplace.models(modelId);
  
  const modelChecks = {
    'Owner': model.owner,
    'Creator': model.creator,
    'Name': model.name,
    'URI': model.uri,
    'Listed': model.listed ? '✅ Yes' : '❌ No',
    'Version': model.version.toString(),
    'Price Perpetual': `${ethers.formatUnits(model.pricePerpetual, 6)} USDC`,
    'Price Subscription': `${ethers.formatUnits(model.priceSubscription, 6)} USDC/mo`,
    'Price Inference': `${ethers.formatUnits(model.priceInference, 6)} USDC`,
    'Inference Wallet': model.inferenceWallet,
    'Delivery Rights': model.deliveryRightsDefault.toString(),
    'Delivery Mode': model.deliveryModeHint.toString(),
    'Royalty BPS': `${model.royaltyBps.toString()} (${Number(model.royaltyBps) / 100}%)`,
    'Terms Hash': model.termsHash,
  };
  
  for (const [key, value] of Object.entries(modelChecks)) {
    console.log(`  ${key.padEnd(20)}: ${value}`);
  }
  
  // ========== AGENT VERIFICATION ==========
  console.log('');
  console.log('─'.repeat(70));
  console.log('2. AGENT DATA (AgentRegistryV2)');
  console.log('─'.repeat(70));
  
  const agentId = await agentRegistry.modelToAgent(modelId);
  
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    const agentOwner = await agentRegistry.ownerOf(agentId);
    let metadataUri = '';
    try {
      metadataUri = await agentRegistry.tokenURI(agentId);
    } catch (e) {
      metadataUri = '(not available)';
    }
    
    const agentChecks = {
      'Agent ID': agentId.toString(),
      'NFT Owner': agentOwner,
      'Model ID': agent.modelId.toString(),
      'Wallet': agent.wallet,
      'Endpoint': agent.endpoint || '(empty)',
      'Registered At': new Date(Number(agent.registeredAt) * 1000).toISOString(),
      'Active': agent.active ? '✅ Yes' : '❌ No',
      'Metadata URI': metadataUri,
    };
    
    for (const [key, value] of Object.entries(agentChecks)) {
      console.log(`  ${key.padEnd(20)}: ${value}`);
    }
    
    // Endpoint validation
    console.log('');
    console.log('  Endpoint Check:');
    if (!agent.endpoint || agent.endpoint === '') {
      console.log('    ❌ EMPTY - Agent has no inference endpoint configured');
    } else if (agent.endpoint.includes('localhost')) {
      console.log('    ⚠️  WARNING - Endpoint is localhost (fallback used during publish)');
      console.log('    → This means Step 3 inferenceConfig was not passed correctly');
    } else if (agent.endpoint.startsWith('https://')) {
      console.log('    ✅ VALID - External HTTPS endpoint configured');
    } else {
      console.log('    ⚠️  CHECK - Endpoint format may be incorrect');
    }
  } else {
    console.log('  ❌ NO AGENT REGISTERED for this model');
    console.log('');
    console.log('  Possible causes:');
    console.log('    - Model was published without inference endpoint in Step 3');
    console.log('    - AgentRegistry was not linked to Marketplace during publish');
    console.log('    - Transaction failed silently');
  }
  
  // ========== NFT VERIFICATION ==========
  console.log('');
  console.log('─'.repeat(70));
  console.log('3. NFT VERIFICATION');
  console.log('─'.repeat(70));
  
  // Check if agent NFT exists
  if (agentId > 0n) {
    console.log(`  Agent NFT #${agentId}:`);
    try {
      const owner = await agentRegistry.ownerOf(agentId);
      console.log(`    ✅ Exists - Owner: ${owner}`);
    } catch (e) {
      console.log(`    ❌ Does not exist or burned`);
    }
  }
  
  // Check total agents
  const nextAgentId = await agentRegistry.nextAgentId();
  console.log(`  Total Agents in Registry: ${(nextAgentId - 1n).toString()}`);
  
  // ========== SUMMARY ==========
  console.log('');
  console.log('='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  
  const issues: string[] = [];
  
  if (!model.listed) issues.push('Model is not listed');
  if (agentId === 0n) issues.push('No agent registered');
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    if (!agent.endpoint) issues.push('Agent endpoint is empty');
    if (agent.endpoint?.includes('localhost')) issues.push('Agent endpoint is localhost (should be external)');
    if (!agent.active) issues.push('Agent is not active');
  }
  if (model.priceInference === 0n) issues.push('Inference price is 0 (x402 disabled)');
  
  if (issues.length === 0) {
    console.log('✅ All checks passed!');
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  console.log('='.repeat(70));
}

main().catch(console.error);
```

### Uso:

```bash
# Verificar modelo #2
MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax

# Verificar modelo #1
MODEL_ID=1 npx hardhat run scripts/verifyModelAgent.ts --network avax
```

---

## 3. Verificar x402 Inference

### Script: `contracts/evm/scripts/verifyX402.ts`

```typescript
import hre from "hardhat";

/**
 * Verify x402 inference configuration and test payment flow
 * 
 * Usage:
 *   MODEL_ID=2 npx hardhat run scripts/verifyX402.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = Number(process.env.MODEL_ID);
  if (!modelId) {
    console.error('ERROR: MODEL_ID environment variable is required');
    process.exit(1);
  }
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  console.log('='.repeat(70));
  console.log('x402 INFERENCE VERIFICATION');
  console.log('='.repeat(70));
  console.log('Model ID:', modelId);
  console.log('');
  
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const agentRegistryAddress = await marketplace.agentRegistry();
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  const paymentToken = await marketplace.paymentToken();
  
  // Get model and agent data
  const model = await marketplace.models(modelId);
  const agentId = await agentRegistry.modelToAgent(modelId);
  
  console.log('─'.repeat(70));
  console.log('1. x402 CONFIGURATION');
  console.log('─'.repeat(70));
  
  const priceInference = model.priceInference;
  const inferenceWallet = model.inferenceWallet;
  
  console.log(`  Price per Inference: ${ethers.formatUnits(priceInference, 6)} USDC`);
  console.log(`  Inference Wallet: ${inferenceWallet}`);
  console.log(`  Payment Token (USDC): ${paymentToken}`);
  
  if (priceInference === 0n) {
    console.log('');
    console.log('  ❌ x402 is DISABLED (price is 0)');
    console.log('     To enable, set a price > 0 in Step 4 of the wizard');
  } else {
    console.log('');
    console.log('  ✅ x402 is ENABLED');
  }
  
  // Agent endpoint
  console.log('');
  console.log('─'.repeat(70));
  console.log('2. AGENT ENDPOINT');
  console.log('─'.repeat(70));
  
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    console.log(`  Agent ID: ${agentId.toString()}`);
    console.log(`  Endpoint: ${agent.endpoint || '(empty)'}`);
    console.log(`  Wallet: ${agent.wallet}`);
    
    if (agent.endpoint && !agent.endpoint.includes('localhost')) {
      console.log('');
      console.log('  ✅ External endpoint configured');
      
      // Test endpoint availability
      console.log('');
      console.log('  Testing endpoint availability...');
      try {
        const response = await fetch(agent.endpoint, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        console.log(`  Response status: ${response.status}`);
        if (response.status === 200 || response.status === 405) {
          console.log('  ✅ Endpoint is reachable');
        } else {
          console.log('  ⚠️  Endpoint returned non-200 status');
        }
      } catch (e: any) {
        console.log(`  ⚠️  Could not reach endpoint: ${e.message}`);
      }
    } else {
      console.log('');
      console.log('  ❌ No valid external endpoint');
    }
  } else {
    console.log('  ❌ No agent registered');
  }
  
  // x402 Payment Flow
  console.log('');
  console.log('─'.repeat(70));
  console.log('3. x402 PAYMENT FLOW');
  console.log('─'.repeat(70));
  
  console.log('  Payment flow for inference:');
  console.log('');
  console.log('  1. Client calls inference endpoint with x402 payment header');
  console.log('  2. Server validates payment (USDC transfer to inference wallet)');
  console.log('  3. If valid, server processes inference request');
  console.log('  4. Response returned to client');
  console.log('');
  console.log('  Required headers for x402:');
  console.log('    X-Payment-Token: <USDC contract address>');
  console.log('    X-Payment-Amount: <amount in base units>');
  console.log('    X-Payment-Signature: <signed payment authorization>');
  
  // Example curl command
  console.log('');
  console.log('─'.repeat(70));
  console.log('4. EXAMPLE INFERENCE REQUEST');
  console.log('─'.repeat(70));
  
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    if (agent.endpoint && !agent.endpoint.includes('localhost')) {
      console.log('');
      console.log('  # Direct inference (no x402 - for testing)');
      console.log(`  curl -X POST "${agent.endpoint}" \\`);
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -d \'{"inputs": "Your test input here"}\'');
      console.log('');
      console.log('  # Via WasiAI proxy (with x402)');
      console.log(`  curl -X POST "https://wasiai.com/api/inference/${modelId}" \\`);
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -H "Authorization: Bearer <your-api-key>" \\');
      console.log('    -d \'{"inputs": "Your test input here"}\'');
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
```

### Uso:

```bash
MODEL_ID=2 npx hardhat run scripts/verifyX402.ts --network avax
```

---

## 4. Verificar Compra de Licencia

### Script: `contracts/evm/scripts/verifyLicense.ts`

```typescript
import hre from "hardhat";

/**
 * Verify license purchases for a model
 * 
 * Usage:
 *   MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax
 *   LICENSE_ID=1 npx hardhat run scripts/verifyLicense.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = Number(process.env.MODEL_ID) || 0;
  const licenseId = Number(process.env.LICENSE_ID) || 0;
  
  if (!modelId && !licenseId) {
    console.error('ERROR: MODEL_ID or LICENSE_ID environment variable is required');
    console.log('Usage:');
    console.log('  MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax');
    console.log('  LICENSE_ID=1 npx hardhat run scripts/verifyLicense.ts --network avax');
    process.exit(1);
  }
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  console.log('='.repeat(70));
  console.log('LICENSE VERIFICATION');
  console.log('='.repeat(70));
  
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const licenseAddress = await marketplace.licenseNFT();
  const licenseNFT = await ethers.getContractAt('LicenseNFT', licenseAddress);
  
  console.log('Marketplace:', marketplaceAddress);
  console.log('LicenseNFT:', licenseAddress);
  console.log('');
  
  if (licenseId > 0) {
    // Verify specific license
    console.log('─'.repeat(70));
    console.log(`LICENSE #${licenseId}`);
    console.log('─'.repeat(70));
    
    await verifyLicense(marketplace, licenseNFT, licenseId, ethers);
  } else if (modelId > 0) {
    // Find all licenses for model
    console.log('─'.repeat(70));
    console.log(`LICENSES FOR MODEL #${modelId}`);
    console.log('─'.repeat(70));
    
    // Get total supply and check each license
    const totalSupply = await licenseNFT.totalSupply();
    console.log(`Total licenses minted: ${totalSupply.toString()}`);
    console.log('');
    
    let found = 0;
    for (let i = 1; i <= Number(totalSupply); i++) {
      try {
        const license = await marketplace.licenses(i);
        if (Number(license.modelId) === modelId) {
          found++;
          console.log(`\n--- License #${i} ---`);
          await verifyLicense(marketplace, licenseNFT, i, ethers);
        }
      } catch (e) {
        // License doesn't exist or was burned
      }
    }
    
    if (found === 0) {
      console.log('No licenses found for this model');
    } else {
      console.log(`\nTotal licenses for model #${modelId}: ${found}`);
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
}

async function verifyLicense(marketplace: any, licenseNFT: any, licenseId: number, ethers: any) {
  try {
    // Get license data from marketplace
    const license = await marketplace.licenses(licenseId);
    const status = await marketplace.licenseStatus(licenseId);
    
    // Get NFT owner
    let owner = '(burned or not minted)';
    try {
      owner = await licenseNFT.ownerOf(licenseId);
    } catch (e) {}
    
    // Get token URI
    let tokenUri = '(not available)';
    try {
      tokenUri = await licenseNFT.tokenURI(licenseId);
    } catch (e) {}
    
    const kindNames = ['Perpetual', 'Subscription'];
    
    console.log(`  Model ID: ${license.modelId.toString()}`);
    console.log(`  Owner: ${owner}`);
    console.log(`  Kind: ${kindNames[Number(license.kind)] || 'Unknown'}`);
    console.log(`  Minted At: ${new Date(Number(license.mintedAt) * 1000).toISOString()}`);
    console.log(`  Expires At: ${license.expiresAt > 0 ? new Date(Number(license.expiresAt) * 1000).toISOString() : 'Never (Perpetual)'}`);
    console.log(`  Transferable: ${license.transferable ? '✅ Yes' : '❌ No'}`);
    console.log(`  Token URI: ${tokenUri}`);
    console.log('');
    console.log('  Status:');
    console.log(`    Revoked: ${status[0] ? '❌ Yes' : '✅ No'}`);
    console.log(`    Valid for API: ${status[1] ? '✅ Yes' : '❌ No'}`);
    console.log(`    Valid for Download: ${status[2] ? '✅ Yes' : '❌ No'}`);
    
    // Check if license is valid
    const isValid = !status[0] && (status[1] || status[2]);
    console.log('');
    console.log(`  Overall: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
  } catch (e: any) {
    console.log(`  ❌ Error: ${e.message}`);
  }
}

main().catch(console.error);
```

### Uso:

```bash
# Ver todas las licencias de un modelo
MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax

# Ver una licencia específica
LICENSE_ID=1 npx hardhat run scripts/verifyLicense.ts --network avax
```

---

## 5. Script Completo End-to-End

### Script: `contracts/evm/scripts/e2eVerification.ts`

```typescript
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
```

### Uso:

```bash
# Verificación completa end-to-end
MODEL_ID=2 npx hardhat run scripts/e2eVerification.ts --network avax

# Con API personalizada
MODEL_ID=2 API_BASE=https://wasiai.com npx hardhat run scripts/e2eVerification.ts --network avax
```

---

## Quick Reference

### Comandos Rápidos

```bash
# === INDEXACIÓN ===
# Sync completo
curl "http://localhost:3000/api/indexer/recache?all=true&sync=true"

# Sync modelo específico
curl "http://localhost:3000/api/indexer/recache?modelId=2&sync=true&chainId=43113"

# === VERIFICACIÓN ===
# Verificar modelo y agent
MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax

# Verificar x402
MODEL_ID=2 npx hardhat run scripts/verifyX402.ts --network avax

# Verificar licencias
MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax

# Verificación completa E2E
MODEL_ID=2 npx hardhat run scripts/e2eVerification.ts --network avax
```

### Direcciones de Contratos (Fuji Testnet)

| Contrato | Dirección |
|----------|-----------|
| MarketplaceV2 | `0x278E6E5417d7af738368dA4a105A0ca80b89C7db` |
| AgentRegistryV2 | `0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD` |
| LicenseNFT | `0x94263370CbBDbFb40AEcd24C29d310Bf7E00F1c5` |
| USDC (Test) | `0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e` |

### Snowtrace Links

- [MarketplaceV2](https://testnet.snowtrace.io/address/0x278E6E5417d7af738368dA4a105A0ca80b89C7db)
- [AgentRegistryV2](https://testnet.snowtrace.io/address/0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD)
- [LicenseNFT](https://testnet.snowtrace.io/address/0x94263370CbBDbFb40AEcd24C29d310Bf7E00F1c5)
