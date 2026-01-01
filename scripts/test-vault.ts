// Test script for WinnerVault contract
// Run with: npx hardhat run scripts/test-vault.ts --network monadTestnet

import { ethers } from "hardhat";

async function main() {
  const VAULT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS;
  
  if (!VAULT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_WINNER_VAULT_ADDRESS not set in environment");
  }

  console.log("🧪 Testing WinnerVault at:", VAULT_ADDRESS);
  console.log("");

  // Get signers
  const [deployer, testWinner] = await ethers.getSigners();
  
  console.log("👤 Deployer:", deployer.address);
  console.log("🎯 Test winner:", testWinner.address);
  console.log("");

  // Connect to deployed contract
  const vault = await ethers.getContractAt("WinnerVault", VAULT_ADDRESS);

  // Check owner
  const owner = await vault.owner();
  console.log("📋 Contract owner:", owner);
  console.log("");

  // Check contract balance
  const contractBalance = await vault.getContractBalance();
  console.log("💰 Contract balance:", ethers.formatEther(contractBalance), "MON");
  console.log("");

  // Check test winner's initial balance
  const initialVaultBalance = await vault.balances(testWinner.address);
  console.log("🎁 Test winner's vault balance:", ethers.formatEther(initialVaultBalance), "MON");
  console.log("");

  // Test deposit
  console.log("📥 Testing deposit...");
  const depositAmount = ethers.parseEther("0.01"); // 0.01 MON
  
  try {
    const depositTx = await vault.connect(deployer).depositFor(
      testWinner.address,
      depositAmount,
      { value: depositAmount }
    );
    
    console.log("⏳ Waiting for deposit transaction...");
    await depositTx.wait();
    console.log("✅ Deposit successful!");
    console.log("📍 Transaction hash:", depositTx.hash);
    console.log("");
  } catch (error: any) {
    console.error("❌ Deposit failed:", error.message);
    return;
  }

  // Check updated balance
  const updatedVaultBalance = await vault.balances(testWinner.address);
  console.log("🎁 Test winner's updated vault balance:", ethers.formatEther(updatedVaultBalance), "MON");
  console.log("");

  // Check updated contract balance
  const updatedContractBalance = await vault.getContractBalance();
  console.log("💰 Updated contract balance:", ethers.formatEther(updatedContractBalance), "MON");
  console.log("");

  // Test withdrawal (optional - uncomment to test)
  /*
  console.log("📤 Testing withdrawal...");
  const testWinnerWalletBalance = await ethers.provider.getBalance(testWinner.address);
  console.log("💵 Test winner's wallet balance before:", ethers.formatEther(testWinnerWalletBalance), "MON");
  
  try {
    const withdrawTx = await vault.connect(testWinner).withdraw();
    console.log("⏳ Waiting for withdrawal transaction...");
    await withdrawTx.wait();
    console.log("✅ Withdrawal successful!");
    console.log("📍 Transaction hash:", withdrawTx.hash);
    console.log("");
    
    const finalWalletBalance = await ethers.provider.getBalance(testWinner.address);
    const finalVaultBalance = await vault.balances(testWinner.address);
    
    console.log("💵 Test winner's wallet balance after:", ethers.formatEther(finalWalletBalance), "MON");
    console.log("🎁 Test winner's vault balance after:", ethers.formatEther(finalVaultBalance), "MON");
  } catch (error: any) {
    console.error("❌ Withdrawal failed:", error.message);
  }
  */

  console.log("");
  console.log("✨ Testing complete!");
  console.log("");
  console.log("📊 Summary:");
  console.log("- Contract address:", VAULT_ADDRESS);
  console.log("- Owner:", owner);
  console.log("- Total contract balance:", ethers.formatEther(updatedContractBalance), "MON");
  console.log("- Test winner balance:", ethers.formatEther(updatedVaultBalance), "MON");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
