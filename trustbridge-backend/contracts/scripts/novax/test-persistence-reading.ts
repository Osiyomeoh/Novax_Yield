import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

/**
 * Test script to verify persistence and reliability of reading contract data
 * Tests various reading patterns and measures consistency
 */

async function main() {
  console.log("🧪 Testing Data Reading Persistence and Reliability\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../../deployments/novax-arbitrum-sepolia-421614.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contracts = deployment.contracts;

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log("Deployer:", deployer.address);
  console.log("");

  // Get contract instances
  const NovaxReceivableFactory = await ethers.getContractFactory("NovaxReceivableFactory");
  const receivableFactory = NovaxReceivableFactory.attach(contracts.NovaxReceivableFactory);

  const NovaxPoolManager = await ethers.getContractFactory("NovaxPoolManager");
  const poolManager = NovaxPoolManager.attach(contracts.NovaxPoolManager);

  // ============================================
  // TEST 1: Read totalPools with retries
  // ============================================
  console.log("📝 TEST 1: Reading totalPools with multiple attempts...");
  const totalPoolsResults: bigint[] = [];
  for (let i = 0; i < 5; i++) {
    try {
      const total = await poolManager.totalPools();
      totalPoolsResults.push(total);
      console.log(`   Attempt ${i + 1}: ${total.toString()}`);
    } catch (error: any) {
      console.error(`   Attempt ${i + 1} failed:`, error.message);
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
  }
  
  const allSame = totalPoolsResults.every(val => val === totalPoolsResults[0]);
  console.log(`✅ Consistency: ${allSame ? 'All values match' : 'Values differ!'}`);
  if (!allSame) {
    console.log(`   Values: ${totalPoolsResults.map(v => v.toString()).join(', ')}`);
  }

  // ============================================
  // TEST 2: Read allPools array with different patterns
  // ============================================
  console.log("\n📝 TEST 2: Reading allPools array with different patterns...");
  
  const totalPools = Number(await poolManager.totalPools());
  console.log(`   Total pools: ${totalPools}`);
  
  if (totalPools > 0) {
    // Pattern 1: Sequential reads
    console.log("\n   Pattern 1: Sequential reads");
    const start1 = Date.now();
    const sequentialIds: string[] = [];
    for (let i = 0; i < Math.min(totalPools, 10); i++) {
      try {
        const poolId = await poolManager.allPools(i);
        sequentialIds.push(ethers.hexlify(poolId));
      } catch (error: any) {
        console.error(`   Error at index ${i}:`, error.message);
      }
    }
    const time1 = Date.now() - start1;
    console.log(`   ✅ Fetched ${sequentialIds.length} pools in ${time1}ms`);
    
    // Pattern 2: Parallel reads with Promise.all
    console.log("\n   Pattern 2: Parallel reads (Promise.all)");
    const start2 = Date.now();
    const indices = Array.from({ length: Math.min(totalPools, 10) }, (_, i) => i);
    const parallelPromises = indices.map(i => poolManager.allPools(i));
    const parallelResults = await Promise.all(parallelPromises);
    const parallelIds = parallelResults.map(poolId => ethers.hexlify(poolId));
    const time2 = Date.now() - start2;
    console.log(`   ✅ Fetched ${parallelIds.length} pools in ${time2}ms`);
    
    // Pattern 3: Parallel reads with Promise.allSettled (handles failures)
    console.log("\n   Pattern 3: Parallel reads (Promise.allSettled)");
    const start3 = Date.now();
    const settledPromises = indices.map(i => poolManager.allPools(i));
    const settledResults = await Promise.allSettled(settledPromises);
    const settledIds = settledResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => ethers.hexlify(r.value));
    const time3 = Date.now() - start3;
    console.log(`   ✅ Fetched ${settledIds.length} pools in ${time3}ms`);
    
    // Compare results
    const allMatch = sequentialIds.length === parallelIds.length && 
                     sequentialIds.every((id, i) => id.toLowerCase() === parallelIds[i]?.toLowerCase());
    console.log(`\n   ✅ Results match: ${allMatch ? 'Yes' : 'No'}`);
    console.log(`   ⚡ Speed comparison: Sequential=${time1}ms, Parallel=${time2}ms, Settled=${time3}ms`);
  }

  // ============================================
  // TEST 3: Read getAllReceivableIds with retries
  // ============================================
  console.log("\n📝 TEST 3: Reading getAllReceivableIds with multiple attempts...");
  const receivableResults: string[][] = [];
  for (let i = 0; i < 3; i++) {
    try {
      const receivables = await receivableFactory.getAllReceivableIds();
      const ids = receivables.map(id => ethers.hexlify(id));
      receivableResults.push(ids);
      console.log(`   Attempt ${i + 1}: ${ids.length} receivables`);
    } catch (error: any) {
      console.error(`   Attempt ${i + 1} failed:`, error.message);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  if (receivableResults.length > 0) {
    const allSameReceivables = receivableResults.every(arr => 
      arr.length === receivableResults[0].length &&
      arr.every((id, i) => id.toLowerCase() === receivableResults[0][i]?.toLowerCase())
    );
    console.log(`✅ Consistency: ${allSameReceivables ? 'All values match' : 'Values differ!'}`);
  }

  // ============================================
  // TEST 4: Read getPoolsPaginated with different batch sizes
  // ============================================
  console.log("\n📝 TEST 4: Reading getPoolsPaginated with different batch sizes...");
  
  if (totalPools > 0) {
    const batchSizes = [1, 5, 10, 20, 50];
    for (const batchSize of batchSizes) {
      try {
        const start = Date.now();
        const [pools, total] = await poolManager.getPoolsPaginated(0, batchSize);
        const time = Date.now() - start;
        console.log(`   Batch size ${batchSize}: ${pools.length} pools in ${time}ms`);
      } catch (error: any) {
        console.error(`   Batch size ${batchSize} failed:`, error.message);
      }
    }
  }

  // ============================================
  // TEST 5: Stress test - multiple rapid reads
  // ============================================
  console.log("\n📝 TEST 5: Stress test - rapid sequential reads...");
  const stressTestCount = 20;
  let successCount = 0;
  let failCount = 0;
  const startStress = Date.now();
  
  for (let i = 0; i < stressTestCount; i++) {
    try {
      await poolManager.totalPools();
      successCount++;
    } catch (error: any) {
      failCount++;
      console.error(`   Read ${i + 1} failed:`, error.message);
    }
    // No delay - rapid fire
  }
  
  const stressTime = Date.now() - startStress;
  console.log(`   ✅ Success: ${successCount}/${stressTestCount} (${(successCount/stressTestCount*100).toFixed(1)}%)`);
  console.log(`   ⏱️  Total time: ${stressTime}ms (avg: ${(stressTime/stressTestCount).toFixed(0)}ms per read)`);

  // ============================================
  // TEST 6: Compare getPoolsPaginated vs allPools getter
  // ============================================
  console.log("\n📝 TEST 6: Comparing getPoolsPaginated vs allPools getter...");
  
  if (totalPools > 0) {
    let time1 = 0, time2 = 0, time3 = 0;
    
    // Method 1: getPoolsPaginated
    const start1 = Date.now();
    try {
      const [poolsPaginated, totalPaginated] = await poolManager.getPoolsPaginated(0, totalPools);
      time1 = Date.now() - start1;
      console.log(`   getPoolsPaginated: ${poolsPaginated.length} pools in ${time1}ms`);
    } catch (error: any) {
      console.error(`   getPoolsPaginated failed:`, error.message);
    }
    
    // Method 2: allPools getter (sequential)
    const start2 = Date.now();
    const poolIdsGetter: string[] = [];
    for (let i = 0; i < Math.min(totalPools, 50); i++) {
      try {
        const poolId = await poolManager.allPools(i);
        poolIdsGetter.push(ethers.hexlify(poolId));
      } catch (error: any) {
        console.error(`   Error at index ${i}:`, error.message);
      }
    }
    time2 = Date.now() - start2;
    console.log(`   allPools getter (sequential): ${poolIdsGetter.length} pools in ${time2}ms`);
    
    // Method 3: allPools getter (parallel)
    const start3 = Date.now();
    const indices = Array.from({ length: Math.min(totalPools, 50) }, (_, i) => i);
    const parallelGetterPromises = indices.map(i => poolManager.allPools(i));
    const parallelGetterResults = await Promise.allSettled(parallelGetterPromises);
    const poolIdsParallel = parallelGetterResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => ethers.hexlify(r.value));
    time3 = Date.now() - start3;
    console.log(`   allPools getter (parallel): ${poolIdsParallel.length} pools in ${time3}ms`);
    
    if (time1 > 0) {
      console.log(`\n   ⚡ Performance: Paginated=${time1}ms, Sequential=${time2}ms, Parallel=${time3}ms`);
      console.log(`   🏆 Fastest: ${time1 < time2 && time1 < time3 ? 'getPoolsPaginated' : time2 < time3 ? 'Sequential' : 'Parallel'}`);
    }
  }

  console.log("\n✅ Persistence tests completed!");
  console.log("\n📊 Recommendations:");
  console.log("   1. Use retry logic for all contract reads");
  console.log("   2. Use Promise.allSettled for parallel reads");
  console.log("   3. Batch reads in groups of 10-20 for optimal performance");
  console.log("   4. Use getPoolsPaginated for large datasets (if available)");
  console.log("   5. Use allPools getter with parallel execution for small datasets");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

