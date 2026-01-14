const { Client, AccountId, PrivateKey, TransferTransaction, AccountBalanceQuery } = require('@hashgraph/sdk');
require('dotenv').config();

async function transferAllHbar() {
  console.log('💰 Transferring all HBAR to 0.0.6916959');
  
  // Get configuration from environment
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const recipientId = '0.0.6916959';
  
  if (!accountId || !privateKey) {
    console.error('❌ Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in environment variables');
    process.exit(1);
  }
  
  try {
    // Initialize Hedera client
    const client = Client.forName(network);
    const operatorId = AccountId.fromString(accountId);
    const recipientAccountId = AccountId.fromString(recipientId);
    
    // Try ECDSA first, fallback to regular parsing
    let operatorKey;
    try {
      operatorKey = PrivateKey.fromStringECDSA(privateKey);
      console.log('✅ Using ECDSA key format');
    } catch (ecdsaError) {
      console.log('⚠️ ECDSA parsing failed, trying regular format');
      operatorKey = PrivateKey.fromString(privateKey);
      console.log('✅ Using regular key format');
    }
    
    client.setOperator(operatorId, operatorKey);
    
    // Check current balance
    console.log('\n🔄 Checking current balance...');
    const balanceQuery = new AccountBalanceQuery().setAccountId(operatorId);
    const balance = await balanceQuery.execute(client);
    const currentBalance = balance.hbars;
    
    console.log('📊 Current Balance:');
    console.log(`From Account (${accountId}): ${currentBalance.toString()} HBAR`);
    
    if (currentBalance.toTinybars() <= 0) {
      console.log('❌ No HBAR to transfer');
      return;
    }
    
    // Calculate transfer amount (leave some for gas fees)
    const gasReserve = 5; // Reserve 5 HBAR for gas fees
    const currentBalanceTinybars = currentBalance.toTinybars();
    const gasReserveTinybars = gasReserve * 100000000; // Convert to tinybars
    const transferAmountTinybars = currentBalanceTinybars - gasReserveTinybars;
    
    if (transferAmountTinybars <= 0) {
      console.log('❌ Insufficient balance after gas reserve');
      return;
    }
    
    const transferAmount = transferAmountTinybars / 100000000; // Convert back to HBAR
    
    console.log(`\n🔄 Transferring ${transferAmount} HBAR to ${recipientId}...`);
    console.log(`Gas Reserve: ${gasReserve} HBAR`);
    
    // Create transfer transaction
    const transferTx = new TransferTransaction()
      .addHbarTransfer(operatorId, -transferAmount)
      .addHbarTransfer(recipientAccountId, transferAmount)
      .setMaxTransactionFee(1000);
    
    // Execute transfer
    const transferResponse = await transferTx.execute(client);
    const transferReceipt = await transferResponse.getReceipt(client);
    
    console.log('✅ Transfer successful!');
    console.log(`Transaction ID: ${transferResponse.transactionId.toString()}`);
    console.log(`Status: ${transferReceipt.status.toString()}`);
    
    // Check final balances
    console.log('\n🔄 Checking final balances...');
    
    // Check sender balance
    const senderBalanceQuery = new AccountBalanceQuery().setAccountId(operatorId);
    const senderBalance = await senderBalanceQuery.execute(client);
    
    // Check recipient balance
    const recipientBalanceQuery = new AccountBalanceQuery().setAccountId(recipientAccountId);
    const recipientBalance = await recipientBalanceQuery.execute(client);
    
    console.log('\n📊 Final Balances:');
    console.log(`From Account (${accountId}): ${senderBalance.hbars.toString()} HBAR`);
    console.log(`To Account (${recipientId}): ${recipientBalance.hbars.toString()} HBAR`);
    
    console.log('\n🎉 Transfer Complete!');
    console.log(`Transferred: ${transferAmount} HBAR`);
    console.log(`Transaction ID: ${transferResponse.transactionId.toString()}`);
    console.log(`Hedera Explorer: https://testnet.hashio.io/transaction/${transferResponse.transactionId.toString()}`);
    
  } catch (error) {
    console.error('❌ Transfer failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

transferAllHbar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
