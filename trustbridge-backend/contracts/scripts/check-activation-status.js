const { ethers } = require('ethers');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔍 === CHECKING ASSET ACTIVATION STATUS ===\n');

  // Asset ID to check
  const ASSET_ID = process.argv[2] || '0xe0e2e348433e5e985ce6edc008dd888063c74c3c40333ecff3402a3ffd9c3a6b';

  // Contract addresses from environment
  const CORE_ASSET_FACTORY_ADDRESS = process.env.CORE_ASSET_FACTORY_ADDRESS || '0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a';
  const AMC_MANAGER_ADDRESS = process.env.AMC_MANAGER_ADDRESS || process.env.VITE_AMC_MANAGER_ADDRESS || '0x995a59e804c9c53Ca1fe7e529ccd6f0dA617e36A';
  const RPC_URL = process.env.MANTLE_RPC_URL || process.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz';

  console.log('📋 Configuration:');
  console.log('   Asset ID:', ASSET_ID);
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('   AMCManager:', AMC_MANAGER_ADDRESS);
  console.log('   RPC URL:', RPC_URL);
  console.log('');

  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log('🔗 Connected to network');
    console.log('');

    // Load contract ABIs
    const coreAssetFactoryArtifactPath = path.join(__dirname, '../artifacts/contracts/contracts/CoreAssetFactory.sol/CoreAssetFactory.json');
    const amcManagerArtifactPath = path.join(__dirname, '../artifacts/contracts/contracts/AMCManager.sol/AMCManager.json');
    
    let coreAssetFactoryABI = [];
    let amcManagerABI = [];
    
    if (fs.existsSync(coreAssetFactoryArtifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(coreAssetFactoryArtifactPath, 'utf8'));
      coreAssetFactoryABI = artifact.abi;
    }
    
    if (fs.existsSync(amcManagerArtifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(amcManagerArtifactPath, 'utf8'));
      amcManagerABI = artifact.abi;
    }

    // Get contract instances
    const coreAssetFactory = new ethers.Contract(CORE_ASSET_FACTORY_ADDRESS, coreAssetFactoryABI, provider);
    const amcManager = new ethers.Contract(AMC_MANAGER_ADDRESS, amcManagerABI, provider);

    // 1. Check asset status from CoreAssetFactory
    console.log('📊 [1/3] Checking asset status from CoreAssetFactory...');
    const asset = await coreAssetFactory.getAsset(ASSET_ID);
    
    // Check if asset exists
    const assetIdHex = asset.id;
    if (assetIdHex === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('❌ Asset not found on blockchain!');
      console.log('   The asset ID does not exist in CoreAssetFactory.');
      process.exit(1);
    }

    const contractStatusNum = typeof asset.status === 'bigint' ? Number(asset.status) : Number(asset.status || 0);
    
    const statusNames = {
      0: 'PENDING_VERIFICATION',
      1: 'VERIFIED_PENDING_AMC',
      2: 'AMC_INSPECTION_SCHEDULED',
      3: 'AMC_INSPECTION_COMPLETED',
      4: 'LEGAL_TRANSFER_PENDING',
      5: 'LEGAL_TRANSFER_COMPLETED',
      6: 'ACTIVE_AMC_MANAGED',
      7: 'DIGITAL_VERIFIED',
      8: 'DIGITAL_ACTIVE',
      9: 'REJECTED',
      10: 'FLAGGED'
    };

    const contractStatusName = statusNames[contractStatusNum] || 'UNKNOWN';
    console.log(`   ✅ Contract Status: ${contractStatusNum} (${contractStatusName})`);
    console.log(`   Asset Name: ${asset.name}`);
    console.log(`   Owner: ${asset.currentOwner || asset.originalOwner}`);
    console.log('');

    // 2. Check legal transfer record from AMCManager
    console.log('📋 [2/3] Checking legal transfer record from AMCManager...');
    try {
      const legalTransferRecord = await amcManager.getLegalTransferRecord(ASSET_ID);
      
      const transferStatusNames = {
        0: 'PENDING',
        1: 'INITIATED',
        2: 'COMPLETED',
        3: 'REJECTED'
      };

      const transferStatusNum = typeof legalTransferRecord.status === 'bigint' 
        ? Number(legalTransferRecord.status) 
        : Number(legalTransferRecord.status || 0);

      const transferStatusName = transferStatusNames[transferStatusNum] || 'UNKNOWN';
      const recordAssetId = legalTransferRecord.assetId;
      const hasRecord = recordAssetId && recordAssetId !== '0x0000000000000000000000000000000000000000000000000000000000000000';

      if (hasRecord) {
        console.log(`   ✅ Legal Transfer Record exists`);
        console.log(`   Transfer Status: ${transferStatusNum} (${transferStatusName})`);
        console.log(`   AMC Address: ${legalTransferRecord.amcAddress}`);
        console.log(`   Individual Owner: ${legalTransferRecord.individualOwner}`);
        if (legalTransferRecord.completedAt && Number(legalTransferRecord.completedAt) > 0) {
          const completedDate = new Date(Number(legalTransferRecord.completedAt) * 1000);
          console.log(`   Completed At: ${completedDate.toISOString()}`);
        }
      } else {
        console.log(`   ⚠️  Legal Transfer Record does NOT exist (empty/default record)`);
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error fetching legal transfer record: ${error.message}`);
      console.log('');
    }

    // 3. Check if activation is possible
    console.log('🚀 [3/3] Activation Requirements Check...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const legalTransferRecord = await amcManager.getLegalTransferRecord(ASSET_ID);
    const recordAssetId = legalTransferRecord.assetId;
    const hasRecord = recordAssetId && recordAssetId !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    const transferStatusNum = hasRecord 
      ? (typeof legalTransferRecord.status === 'bigint' ? Number(legalTransferRecord.status) : Number(legalTransferRecord.status || 0))
      : -1;

    const requirements = {
      contractStatusIs5: contractStatusNum === 5,
      legalTransferIsCompleted: transferStatusNum === 2,
      hasLegalTransferRecord: hasRecord
    };

    console.log(`   Contract Status is 5 (LEGAL_TRANSFER_COMPLETED): ${requirements.contractStatusIs5 ? '✅' : '❌'}`);
    console.log(`   Legal Transfer Record exists: ${requirements.hasLegalTransferRecord ? '✅' : '❌'}`);
    console.log(`   Legal Transfer Status is COMPLETED (2): ${requirements.legalTransferIsCompleted ? '✅' : '❌'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Summary
    if (contractStatusNum === 6) {
      console.log('✅ Asset is already ACTIVE_AMC_MANAGED (status 6) - Ready for pooling!');
    } else if (requirements.contractStatusIs5 && requirements.legalTransferIsCompleted) {
      console.log('✅ Asset CAN be activated!');
      console.log('   Both requirements are met:');
      console.log('   - Contract status is 5 (LEGAL_TRANSFER_COMPLETED)');
      console.log('   - Legal transfer record status is 2 (COMPLETED)');
      console.log('');
      console.log('   To activate, call: amcManager.activateAsset(ASSET_ID)');
    } else {
      console.log('❌ Asset CANNOT be activated yet. Missing requirements:');
      if (!requirements.contractStatusIs5) {
        console.log(`   - Contract status is ${contractStatusNum} (${contractStatusName}), expected 5 (LEGAL_TRANSFER_COMPLETED)`);
      }
      if (!requirements.hasLegalTransferRecord) {
        console.log('   - Legal transfer record does not exist');
      } else if (!requirements.legalTransferIsCompleted) {
        console.log(`   - Legal transfer status is ${transferStatusNum}, expected 2 (COMPLETED)`);
      }
      console.log('');
      console.log('   Workflow steps:');
      if (contractStatusNum < 5) {
        console.log(`   - Complete legal transfer (current status: ${contractStatusNum})`);
      }
      if (!requirements.legalTransferIsCompleted && requirements.hasLegalTransferRecord) {
        console.log(`   - Legal transfer record exists but status is not COMPLETED (status: ${transferStatusNum})`);
      }
      if (!requirements.hasLegalTransferRecord) {
        console.log('   - Initiate and complete legal transfer');
      }
      console.log('   - Then call activateAsset()');
    }

  } catch (error) {
    console.error('❌ Error checking activation status:', error.message);
    if (error.transaction) {
      console.error('   Transaction:', error.transaction.hash);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

