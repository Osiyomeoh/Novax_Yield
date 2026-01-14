const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Get all assets created by a specific address on-chain
 * 
 * This is a wrapper script that accepts the address as a hardhat task parameter
 * 
 * Usage:
 *   npx hardhat run scripts/get-user-assets-by-address.js --network mantle_testnet --address 0x00224492F572944500AB4eb91E413cfA34770c60
 */

async function main() {
  // Parse hardhat task arguments
  const addressArg = process.env.ADDRESS || null;
  
  console.log('🔍 === GETTING USER ASSETS FROM BLOCKCHAIN ===\n');

  // Get user address from environment variable or use deployer
  const userAddress = addressArg || process.env.USER_ADDRESS || null;
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const targetAddress = userAddress || deployer.address;
  
  console.log('👤 Target address:', targetAddress);
  console.log('👤 Deployer address:', deployer.address);
  console.log('   Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Load contract addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  let CORE_ASSET_FACTORY_ADDRESS;
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    CORE_ASSET_FACTORY_ADDRESS = deployment.contracts.CoreAssetFactory;
  } else {
    CORE_ASSET_FACTORY_ADDRESS = process.env.CORE_ASSET_FACTORY_ADDRESS || '0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a';
  }

  console.log('📋 Configuration:');
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('');

  // Get contract instance
  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  try {
    // Get user assets
    console.log('⏳ Fetching asset IDs for address:', targetAddress);
    const assetIds = await coreAssetFactory.getUserAssets(targetAddress);
    
    console.log(`\n✅ Found ${assetIds.length} asset(s) created by ${targetAddress}\n`);

    if (assetIds.length === 0) {
      console.log('ℹ️  No assets found for this address.');
      console.log('   This could mean:');
      console.log('   - No assets have been created by this address');
      console.log('   - Assets were created by a different address');
      console.log('   - Check the originalOwner field if assets were transferred\n');
      return;
    }

    // Status mapping
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

    const categoryNames = {
      0: 'REAL_ESTATE',
      1: 'COMMODITY',
      2: 'AGRICULTURE',
      3: 'INFRASTRUCTURE',
      4: 'BUSINESS',
      5: 'OTHER',
      6: 'DIGITAL_ART',
      7: 'MUSIC',
      8: 'GAMING',
      9: 'VIRTUAL_REAL_ESTATE',
      10: 'SOCIAL_CONTENT',
      11: 'MEMES',
      12: 'VIRAL_CONTENT'
    };

    const assetTypeNames = {
      0: 'RWA',
      1: 'DIGITAL'
    };

    const verificationLevelNames = {
      0: 'BASIC',
      1: 'PROFESSIONAL',
      2: 'EXPERT',
      3: 'MASTER'
    };

    // Fetch details for each asset
    const assets = [];
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      console.log(`📦 Fetching asset ${i + 1}/${assetIds.length}...`);
      
      try {
        const asset = await coreAssetFactory.getAsset(assetId);
        
        const statusNum = Number(asset.status);
        const categoryNum = Number(asset.category);
        const assetTypeNum = Number(asset.assetType);
        const verificationLevelNum = Number(asset.verificationLevel);
        
        const assetData = {
          assetId: assetId,
          name: asset.name,
          description: asset.description,
          location: asset.location,
          totalValue: ethers.formatEther(asset.totalValue),
          category: categoryNames[categoryNum] || `UNKNOWN(${categoryNum})`,
          assetType: assetTypeNames[assetTypeNum] || `UNKNOWN(${assetTypeNum})`,
          assetTypeString: asset.assetTypeString,
          status: statusNum,
          statusName: statusNames[statusNum] || `UNKNOWN(${statusNum})`,
          originalOwner: asset.originalOwner,
          currentOwner: asset.currentOwner,
          verificationLevel: verificationLevelNames[verificationLevelNum] || `UNKNOWN(${verificationLevelNum})`,
          createdAt: new Date(Number(asset.createdAt) * 1000).toISOString(),
          verifiedAt: asset.verifiedAt > 0 ? new Date(Number(asset.verifiedAt) * 1000).toISOString() : 'Not verified',
          amcTransferredAt: asset.amcTransferredAt > 0 ? new Date(Number(asset.amcTransferredAt) * 1000).toISOString() : 'Not transferred',
          maturityDate: asset.maturityDate > 0 ? new Date(Number(asset.maturityDate) * 1000).toISOString() : 'No maturity date',
          tokenId: asset.tokenId.toString(),
          nftContract: asset.nftContract,
          imageURI: asset.imageURI,
          documentURI: asset.documentURI,
          evidenceHashes: asset.evidenceHashes.length,
          documentTypes: asset.documentTypes.length,
          isTradeable: asset.isTradeable,
          isListed: asset.isListed,
          listingPrice: asset.listingPrice > 0 ? ethers.formatEther(asset.listingPrice) : '0',
          currentAMC: asset.currentAMC,
          tradingVolume: ethers.formatEther(asset.tradingVolume),
          lastSalePrice: asset.lastSalePrice > 0 ? ethers.formatEther(asset.lastSalePrice) : '0'
        };
        
        assets.push(assetData);
      } catch (error) {
        console.error(`   ❌ Failed to fetch asset ${assetId}:`, error.message);
      }
    }

    // Display summary table
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ASSET SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Assets: ${assets.length}`);
    
    const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.totalValue), 0);
    console.log(`Total Value: ${totalValue.toLocaleString()} TRUST\n`);

    // Status breakdown
    const statusCounts = {};
    assets.forEach(asset => {
      const status = asset.statusName;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log('');

    // Category breakdown
    const categoryCounts = {};
    assets.forEach(asset => {
      const category = asset.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    console.log('Category Breakdown:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
    console.log('');

    // Display detailed information for each asset
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DETAILED ASSET INFORMATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    assets.forEach((asset, index) => {
      console.log(`\n${index + 1}. ${asset.name}`);
      console.log('   ──────────────────────────────────────────────────────────────');
      console.log('   Asset ID:', asset.assetId);
      console.log('   Name:', asset.name);
      console.log('   Description:', asset.description || 'No description');
      console.log('   Location:', asset.location || 'Not specified');
      console.log('   Total Value:', asset.totalValue, 'TRUST');
      console.log('   Category:', asset.category);
      console.log('   Asset Type:', asset.assetType);
      console.log('   Asset Type String:', asset.assetTypeString);
      console.log('   Status:', asset.status, `(${asset.statusName})`);
      console.log('   Verification Level:', asset.verificationLevel);
      console.log('   Original Owner:', asset.originalOwner);
      console.log('   Current Owner:', asset.currentOwner);
      console.log('   Created At:', asset.createdAt);
      console.log('   Verified At:', asset.verifiedAt);
      console.log('   AMC Transferred At:', asset.amcTransferredAt);
      console.log('   Maturity Date:', asset.maturityDate);
      console.log('   Token ID:', asset.tokenId);
      console.log('   NFT Contract:', asset.nftContract);
      console.log('   Current AMC:', asset.currentAMC === ethers.ZeroAddress ? 'None' : asset.currentAMC);
      console.log('   Is Tradeable:', asset.isTradeable);
      console.log('   Is Listed:', asset.isListed);
      if (asset.isListed) {
        console.log('   Listing Price:', asset.listingPrice, 'TRUST');
      }
      console.log('   Trading Volume:', asset.tradingVolume, 'TRUST');
      console.log('   Last Sale Price:', asset.lastSalePrice, 'TRUST');
      console.log('   Evidence Hashes:', asset.evidenceHashes);
      console.log('   Document Types:', asset.documentTypes);
      console.log('   Image URI:', asset.imageURI || 'Not set');
      console.log('   Document URI:', asset.documentURI || 'Not set');
      
      // Check if ready for pooling
      if (asset.status === 6) {
        console.log('   ✅ Ready for pooling (ACTIVE_AMC_MANAGED)');
      } else if (asset.status === 8) {
        console.log('   ✅ Active digital asset (DIGITAL_ACTIVE)');
      } else {
        console.log('   ⚠️  Not ready for pooling');
      }
    });

    // Save to file
    const outputFile = path.join(__dirname, `../assets-by-${targetAddress}.json`);
    const outputData = {
      address: targetAddress,
      network: 'mantle_sepolia',
      chainId: 5003,
      queryDate: new Date().toISOString(),
      totalAssets: assets.length,
      totalValue: totalValue.toString(),
      assets: assets
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Asset data saved to: ${outputFile}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Query completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error fetching assets:', error.message);
    if (error.message.includes('userAssets')) {
      console.error('   ⚠️  getUserAssets function may not be available or address has no assets');
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

