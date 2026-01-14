const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function main() {
  console.log('🔍 === VERIFYING ASSET ON-CHAIN DATA ===\n');

  // Asset ID from user's asset details
  const ASSET_ID = '0xb0888d62b34f56d07a1e758e6de9bd1d4d48a7150b822fcbe710d8f4cd82e0ff';

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  console.log('💰 Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'MNT\n');

  // Contract addresses from latest deployment
  const CORE_ASSET_FACTORY_ADDRESS = '0x7C3cBa0E5012837987a3C1041F2629Df4C8216cE';
  const AMC_MANAGER_ADDRESS = process.env.AMC_MANAGER_ADDRESS || '0x9b6Df47B538bb3C3e15b6833F3C2c5fD36F4bAf8';

  console.log('📋 Configuration:');
  console.log('   Asset ID:', ASSET_ID);
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('   AMCManager:', AMC_MANAGER_ADDRESS);
  console.log('');

  // Get contract instances
  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  // Convert asset ID to bytes32 if needed
  const assetIdBytes32 = ASSET_ID.startsWith('0x') && ASSET_ID.length === 66 
    ? ASSET_ID 
    : ethers.id(ASSET_ID);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📦 STEP 1: CHECKING ASSET IN COREASSETFACTORY');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const asset = await coreAssetFactory.getAsset(assetIdBytes32);
    
    // Check if asset exists (id should match)
    const assetIdHex = asset.id || asset[0];
    const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    if (!assetIdHex || assetIdHex === ZERO_HASH || assetIdHex.toLowerCase() !== assetIdBytes32.toLowerCase()) {
      console.log('❌ Asset NOT found in CoreAssetFactory!');
      console.log(`   Returned ID: ${assetIdHex}`);
      console.log(`   Expected ID: ${assetIdBytes32}\n`);
      console.log('⚠️  The asset may be in a different contract or network.');
      process.exit(1);
    }

    console.log('✅ Asset FOUND in CoreAssetFactory!\n');

    // Extract asset data (UniversalAsset struct has 31 fields)
    // Structure: [id, originalOwner, currentOwner, category, assetType, assetTypeString, name, location, 
    //            totalValue, maturityDate, verificationLevel, evidenceHashes, documentTypes, imageURI, 
    //            documentURI, description, nftContract, tokenId, status, currentAMC, createdAt, verifiedAt, 
    //            amcTransferredAt, tradingVolume, lastSalePrice, isTradeable, isListed, listingPrice, 
    //            listingExpiry, currentBuyer, currentOffer]
    
    const assetData = {
      id: asset.id || asset[0],
      originalOwner: asset.originalOwner || asset[1],
      currentOwner: asset.currentOwner || asset[2],
      category: asset.category || asset[3],
      assetType: asset.assetType || asset[4],
      assetTypeString: asset.assetTypeString || asset[5],
      name: asset.name || asset[6],
      location: asset.location || asset[7],
      totalValue: asset.totalValue || asset[8],
      maturityDate: asset.maturityDate || asset[9],
      verificationLevel: asset.verificationLevel || asset[10],
      evidenceHashes: asset.evidenceHashes || asset[11] || [],
      documentTypes: asset.documentTypes || asset[12] || [],
      imageURI: asset.imageURI || asset[13],
      documentURI: asset.documentURI || asset[14],
      description: asset.description || asset[15],
      nftContract: asset.nftContract || asset[16],
      tokenId: asset.tokenId || asset[17],
      status: asset.status || asset[18],
      currentAMC: asset.currentAMC || asset[19],
      createdAt: asset.createdAt || asset[20],
      verifiedAt: asset.verifiedAt || asset[21],
      amcTransferredAt: asset.amcTransferredAt || asset[22],
      tradingVolume: asset.tradingVolume || asset[23],
      lastSalePrice: asset.lastSalePrice || asset[24],
      isTradeable: asset.isTradeable !== undefined ? asset.isTradeable : asset[25],
      isListed: asset.isListed !== undefined ? asset.isListed : asset[26],
      listingPrice: asset.listingPrice || asset[27],
      listingExpiry: asset.listingExpiry || asset[28],
      currentBuyer: asset.currentBuyer || asset[29],
      currentOffer: asset.currentOffer || asset[30]
    };

    // Convert status number to name
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

    const statusNum = typeof assetData.status === 'bigint' ? Number(assetData.status) : Number(assetData.status || 0);
    const statusName = statusNames[statusNum] || 'UNKNOWN';

    console.log('📊 ASSET DATA FROM COREASSETFACTORY:');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`ID:              ${assetData.id}`);
    console.log(`Name:            ${assetData.name}`);
    console.log(`Type:            ${assetData.assetTypeString}`);
    console.log(`Category:        ${assetData.category}`);
    console.log(`Location:        ${assetData.location}`);
    console.log(`Total Value:     ${ethers.formatEther(assetData.totalValue || 0n)} TRUST (raw: ${assetData.totalValue})`);
    console.log(`Status:          ${statusNum} (${statusName})`);
    console.log(`Original Owner:  ${assetData.originalOwner}`);
    console.log(`Current Owner:   ${assetData.currentOwner}`);
    console.log(`Current AMC:     ${assetData.currentAMC || 'Not assigned'}`);
    console.log(`Created At:      ${assetData.createdAt ? new Date(Number(assetData.createdAt) * 1000).toISOString() : 'N/A'}`);
    console.log(`Verified At:     ${assetData.verifiedAt ? new Date(Number(assetData.verifiedAt) * 1000).toISOString() : 'N/A'}`);
    console.log(`AMC Transferred: ${assetData.amcTransferredAt ? new Date(Number(assetData.amcTransferredAt) * 1000).toISOString() : 'N/A'}`);
    console.log(`Description:     ${assetData.description || 'N/A'}`);
    console.log(`Image URI:       ${assetData.imageURI || 'N/A'}`);
    console.log(`Document URI:    ${assetData.documentURI || 'N/A'}`);
    console.log(`NFT Contract:    ${assetData.nftContract || 'N/A'}`);
    console.log(`NFT Token ID:    ${assetData.tokenId ? assetData.tokenId.toString() : 'N/A'}`);
    console.log(`Evidence Hashes: ${assetData.evidenceHashes?.length || 0} documents`);
    if (assetData.evidenceHashes && assetData.evidenceHashes.length > 0) {
      assetData.evidenceHashes.forEach((hash, index) => {
        console.log(`                  ${index + 1}. ${hash}`);
      });
    }
    console.log(`Document Types:  ${assetData.documentTypes?.length || 0} types`);
    if (assetData.documentTypes && assetData.documentTypes.length > 0) {
      assetData.documentTypes.forEach((type, index) => {
        console.log(`                  ${index + 1}. ${type}`);
      });
    }
    console.log('───────────────────────────────────────────────────────────\n');

    // Check AMCManager for inspection and legal transfer records
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 2: CHECKING INSPECTION RECORD IN AMCMANAGER');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
      const AMCManager = await ethers.getContractFactory('AMCManager');
      const amcManager = AMCManager.attach(AMC_MANAGER_ADDRESS);

      const inspectionRecord = await amcManager.getInspectionRecord(assetIdBytes32);
      
      const inspectionStatus = typeof inspectionRecord.status === 'bigint' 
        ? Number(inspectionRecord.status) 
        : (typeof inspectionRecord.status === 'string' ? parseInt(inspectionRecord.status) : Number(inspectionRecord.status || 0));
      
      const scheduledAt = inspectionRecord.scheduledAt 
        ? (typeof inspectionRecord.scheduledAt === 'bigint' ? Number(inspectionRecord.scheduledAt) : Number(inspectionRecord.scheduledAt || 0))
        : 0;
      
      const completedAt = inspectionRecord.completedAt 
        ? (typeof inspectionRecord.completedAt === 'bigint' ? Number(inspectionRecord.completedAt) : Number(inspectionRecord.completedAt || 0))
        : 0;

      const inspectionStatusNames = {
        0: 'PENDING',
        1: 'SCHEDULED',
        2: 'COMPLETED',
        3: 'FLAGGED',
        4: 'REJECTED'
      };

      if (inspectionRecord && inspectionRecord.assetId && inspectionRecord.assetId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('✅ Inspection record FOUND!\n');
        console.log('📊 INSPECTION RECORD DATA:');
        console.log('───────────────────────────────────────────────────────────');
        console.log(`Asset ID:           ${inspectionRecord.assetId || inspectionRecord[0]}`);
        console.log(`Status:             ${inspectionStatus} (${inspectionStatusNames[inspectionStatus] || 'UNKNOWN'})`);
        console.log(`Inspector:          ${inspectionRecord.inspector || inspectionRecord[1] || 'N/A'}`);
        console.log(`Scheduled At:       ${scheduledAt > 0 ? new Date(scheduledAt * 1000).toISOString() : 'Not scheduled'}`);
        console.log(`Completed At:       ${completedAt > 0 ? new Date(completedAt * 1000).toISOString() : 'Not completed'}`);
        console.log(`Report URI:         ${inspectionRecord.reportURI || inspectionRecord[3] || 'N/A'}`);
        console.log(`Report Hash:        ${inspectionRecord.reportHash || inspectionRecord[4] || 'N/A'}`);
        console.log(`Image URIs:         ${inspectionRecord.imageURIs?.length || inspectionRecord[5]?.length || 0} images`);
        if (inspectionRecord.imageURIs && inspectionRecord.imageURIs.length > 0) {
          inspectionRecord.imageURIs.forEach((uri, index) => {
            console.log(`                      ${index + 1}. ${uri}`);
          });
        }
        console.log('───────────────────────────────────────────────────────────\n');
      } else {
        console.log('ℹ️  No inspection record found (empty/default record)\n');
      }

      // Check legal transfer record
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📜 STEP 3: CHECKING LEGAL TRANSFER RECORD IN AMCMANAGER');
      console.log('═══════════════════════════════════════════════════════════\n');

      const legalTransferRecord = await amcManager.getLegalTransferRecord(assetIdBytes32);
      
      const transferStatus = typeof legalTransferRecord.status === 'bigint' 
        ? Number(legalTransferRecord.status) 
        : (typeof legalTransferRecord.status === 'string' ? parseInt(legalTransferRecord.status) : Number(legalTransferRecord.status || 0));

      const transferStatusNames = {
        0: 'PENDING',
        1: 'INITIATED',
        2: 'COMPLETED',
        3: 'REJECTED'
      };

      if (legalTransferRecord && legalTransferRecord.assetId && legalTransferRecord.assetId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('✅ Legal transfer record FOUND!\n');
        console.log('📊 LEGAL TRANSFER RECORD DATA:');
        console.log('───────────────────────────────────────────────────────────');
        console.log(`Asset ID:           ${legalTransferRecord.assetId || legalTransferRecord[0]}`);
        console.log(`Status:             ${transferStatus} (${transferStatusNames[transferStatus] || 'UNKNOWN'})`);
        console.log(`Initiator:          ${legalTransferRecord.initiator || legalTransferRecord[1] || 'N/A'}`);
        console.log(`Individual Owner:   ${legalTransferRecord.individualOwner || legalTransferRecord[2] || 'N/A'}`);
        console.log(`AMC Address:        ${legalTransferRecord.amcAddress || legalTransferRecord[3] || 'N/A'}`);
        console.log(`Initiated At:       ${legalTransferRecord.initiatedAt ? new Date(Number(legalTransferRecord.initiatedAt) * 1000).toISOString() : 'N/A'}`);
        console.log(`Completed At:       ${legalTransferRecord.completedAt ? new Date(Number(legalTransferRecord.completedAt) * 1000).toISOString() : 'N/A'}`);
        console.log(`Document Hash:      ${legalTransferRecord.documentHash || legalTransferRecord[6] || 'N/A'}`);
        console.log('───────────────────────────────────────────────────────────\n');
      } else {
        console.log('ℹ️  No legal transfer record found (empty/default record)\n');
      }

    } catch (amcError) {
      console.log('⚠️  Could not fetch AMCManager records:');
      console.log(`   Error: ${amcError.message}`);
      console.log(`   This might mean AMCManager is not deployed at ${AMC_MANAGER_ADDRESS}\n`);
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 SUMMARY - DATA THAT FRONTEND RECEIVES');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Based on the contract data, the frontend will display:');
    console.log(`  Name:              ${assetData.name}`);
    console.log(`  Status:            ${statusName} (${statusNum})`);
    console.log(`  Type:              ${assetData.assetTypeString || 'RWA'}`);
    console.log(`  Location:          ${assetData.location}`);
    console.log(`  Value:             $${Number(ethers.formatEther(assetData.totalValue || 0n)).toFixed(2)}`);
    console.log(`  Owner:             ${assetData.currentOwner || assetData.originalOwner}`);
    console.log(`  Created At:        ${assetData.createdAt ? new Date(Number(assetData.createdAt) * 1000).toLocaleDateString() : 'N/A'}`);
    if (completedAt > 0) {
      console.log(`  Inspection Date:   ${new Date(completedAt * 1000).toLocaleDateString()}`);
    } else if (scheduledAt > 0) {
      console.log(`  Inspection Date:   ${new Date(scheduledAt * 1000).toLocaleDateString()} (scheduled)`);
    }
    if (transferStatus === 2) {
      console.log(`  Legal Transfer:    COMPLETED`);
    } else if (transferStatus === 1) {
      console.log(`  Legal Transfer:    INITIATED`);
    }
    console.log(`  Documents:         ${assetData.evidenceHashes?.length || 0} files\n`);

  } catch (error) {
    console.error('\n❌ Error fetching asset data:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('✅ Verification complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

