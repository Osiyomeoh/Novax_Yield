const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function main() {
  console.log('🚀 === ACTIVATING ASSET FOR POOLING ===\n');

  // Asset ID to activate
  const ASSET_ID = '0xb0888d62b34f56d07a1e758e6de9bd1d4d48a7150b822fcbe710d8f4cd82e0ff';

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  console.log('💰 Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Contract addresses from environment or defaults
  // Update these with your actual deployed contract addresses
  const CORE_ASSET_FACTORY_ADDRESS = process.env.CORE_ASSET_FACTORY_ADDRESS || '0x7C3cBa0E5012837987a3C1041F2629Df4C8216cE';
  const AMC_MANAGER_ADDRESS = process.env.AMC_MANAGER_ADDRESS || '0x9b6Df47B538bb3C3e15b6833F3C2c5fD36F4bAf8';
  
  // Make sure MANTLE_PRIVATE_KEY is set in .env file
  if (!process.env.MANTLE_PRIVATE_KEY) {
    console.error('❌ ERROR: MANTLE_PRIVATE_KEY not found in .env file');
    console.error('   Please add your private key to contracts/.env file');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log('   Asset ID:', ASSET_ID);
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('   AMCManager:', AMC_MANAGER_ADDRESS);
  console.log('');

  // Get contract instances
  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  const AMCManager = await ethers.getContractFactory('AMCManager');
  const amcManager = AMCManager.attach(AMC_MANAGER_ADDRESS);

  try {
    // Step 1: Check current asset status
    console.log('📊 Step 1: Checking current asset status...');
    const asset = await coreAssetFactory.getAsset(ASSET_ID);
    
    // Check if asset actually exists (id should match the requested ID)
    const assetIdHex = asset.id;
    console.log(`   Asset ID from contract: ${assetIdHex}`);
    console.log(`   Requested Asset ID: ${ASSET_ID}`);
    
    // Check if asset exists (id should not be zero hash)
    const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (assetIdHex === ZERO_HASH || assetIdHex.toLowerCase() !== ASSET_ID.toLowerCase()) {
      console.error(`\n❌ ERROR: Asset not found in CoreAssetFactory!`);
      console.error(`   The asset ID ${ASSET_ID} does not exist in the contract.`);
      console.error(`   Asset might be in a different contract (TRUSTAssetFactory) or was never created.`);
      console.error(`\n   To check if asset exists elsewhere, try:`);
      console.error(`   - Check TRUSTAssetFactory contract`);
      console.error(`   - Verify the asset was created on Mantle network`);
      console.error(`   - Check if asset ID is correct`);
      process.exit(1);
    }
    
    const currentStatus = Number(asset.status);
    console.log(`   Current status: ${currentStatus}`);
    console.log(`   Asset name: ${asset.name || 'N/A'}`);
    console.log(`   Asset owner: ${asset.currentOwner || asset.originalOwner || 'N/A'}`);
    
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
    console.log(`   Status name: ${statusNames[currentStatus] || 'UNKNOWN'}\n`);

    if (currentStatus === 6) {
      console.log('✅ Asset is already ACTIVE_AMC_MANAGED (status 6)!');
      return;
    }

    // Step 2: Verify asset (if status 0)
    if (currentStatus === 0) {
      console.log('📝 Step 2: Verifying asset...');
      try {
        const AMC_ROLE = await coreAssetFactory.AMC_ROLE();
        const hasRole = await coreAssetFactory.hasRole(AMC_ROLE, deployer.address);
        
        if (!hasRole) {
          console.log('   ⚠️  Deployer does not have AMC_ROLE. Granting...');
          // Only admin can grant, so we'll try to use AMC_ROLE for verification
          const VERIFIER_ROLE = await coreAssetFactory.VERIFIER_ROLE();
          const hasVerifierRole = await coreAssetFactory.hasRole(VERIFIER_ROLE, deployer.address);
          
          if (!hasVerifierRole) {
            throw new Error('Deployer needs AMC_ROLE or VERIFIER_ROLE to verify assets');
          }
        }

        const tx1 = await coreAssetFactory.verifyAsset(ASSET_ID, 0); // BASIC verification level
        console.log('   ⏳ Transaction sent:', tx1.hash);
        await tx1.wait();
        console.log('   ✅ Asset verified (status 1)\n');
      } catch (error) {
        console.error('   ❌ Failed to verify asset:', error.message);
        throw error;
      }
    }

    // Step 3: Assign AMC (if status 1)
    const assetAfterVerify = await coreAssetFactory.getAsset(ASSET_ID);
    let status = Number(assetAfterVerify.status);
    
    if (status === 1) {
      console.log('👥 Step 3: Assigning AMC...');
      try {
        const tx2 = await amcManager.assignAMC(ASSET_ID, deployer.address);
        console.log('   ⏳ Transaction sent:', tx2.hash);
        await tx2.wait();
        console.log('   ✅ AMC assigned\n');
        
        status = 1; // Still status 1 after assignAMC
      } catch (error) {
        console.error('   ❌ Failed to assign AMC:', error.message);
        throw error;
      }
    }

    // Step 4: Schedule inspection
    console.log('📅 Step 4: Scheduling inspection...');
    try {
      const now = Math.floor(Date.now() / 1000);
      const inspectorAddress = deployer.address;
      const tx3 = await amcManager.scheduleInspection(ASSET_ID, inspectorAddress, now);
      console.log('   ⏳ Transaction sent:', tx3.hash);
      await tx3.wait();
      console.log('   ✅ Inspection scheduled (status 2)\n');
    } catch (error) {
      console.error('   ❌ Failed to schedule inspection:', error.message);
      throw error;
    }

    // Step 5: Complete inspection
    console.log('✅ Step 5: Completing inspection...');
    try {
      const tx4 = await amcManager.completeInspection(
        ASSET_ID,
        'Physical inspection completed - Asset ready for legal transfer',
        ['inspection_report.pdf']
      );
      console.log('   ⏳ Transaction sent:', tx4.hash);
      await tx4.wait();
      console.log('   ✅ Inspection completed (status 3)\n');
    } catch (error) {
      console.error('   ❌ Failed to complete inspection:', error.message);
      throw error;
    }

    // Step 6: Initiate legal transfer
    console.log('📄 Step 6: Initiating legal transfer...');
    try {
      const tx5 = await amcManager.initiateLegalTransfer(ASSET_ID, deployer.address);
      console.log('   ⏳ Transaction sent:', tx5.hash);
      await tx5.wait();
      console.log('   ✅ Legal transfer initiated (status 4)\n');
    } catch (error) {
      console.error('   ❌ Failed to initiate legal transfer:', error.message);
      throw error;
    }

    // Step 7: Complete legal transfer
    console.log('✅ Step 7: Completing legal transfer...');
    try {
      const tx6 = await amcManager.completeLegalTransfer(ASSET_ID);
      console.log('   ⏳ Transaction sent:', tx6.hash);
      await tx6.wait();
      console.log('   ✅ Legal transfer completed (status 5)\n');
    } catch (error) {
      console.error('   ❌ Failed to complete legal transfer:', error.message);
      throw error;
    }

    // Step 8: Activate asset
    console.log('🚀 Step 8: Activating asset...');
    try {
      const tx7 = await amcManager.activateAsset(ASSET_ID);
      console.log('   ⏳ Transaction sent:', tx7.hash);
      await tx7.wait();
      console.log('   ✅ Asset activated (status 6)\n');
    } catch (error) {
      console.error('   ❌ Failed to activate asset:', error.message);
      throw error;
    }

    // Final check
    console.log('📊 Final check: Verifying asset status...');
    const finalAsset = await coreAssetFactory.getAsset(ASSET_ID);
    const finalStatus = Number(finalAsset.status);
    console.log(`   Final status: ${finalStatus}`);
    console.log(`   Status name: ${statusNames[finalStatus] || 'UNKNOWN'}\n`);

    if (finalStatus === 6) {
      console.log('✅ SUCCESS! Asset is now ACTIVE_AMC_MANAGED and ready for pooling!');
    } else {
      console.log('⚠️  WARNING: Asset status is', finalStatus, 'expected 6');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
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
