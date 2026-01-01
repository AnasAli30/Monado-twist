import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying WinnerVault contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MON\n");

  // Deploy WinnerVault
  console.log("⏳ Deploying WinnerVault...");
  const WinnerVault = await ethers.getContractFactory("WinnerVault");
  const vault = await WinnerVault.deploy();

  await vault.waitForDeployment();
  const address = await vault.getAddress();

  console.log("\n✅ WinnerVault deployed successfully!");
  console.log("📍 Contract address:", address);
  console.log("👤 Owner:", await vault.owner());
  
  // Test contract
  console.log("\n🧪 Testing contract...");
  const contractBalance = await vault.getContractBalance();
  console.log("💵 Contract balance:", ethers.formatEther(contractBalance), "MON");

  // Display environment variable
  console.log("\n" + "=".repeat(60));
  console.log("📋 ADD THIS TO YOUR .env.local FILE:");
  console.log("=".repeat(60));
  console.log(`NEXT_PUBLIC_WINNER_VAULT_ADDRESS=${address}`);
  console.log("=".repeat(60));

  // Display verification command
  console.log("\n📝 To verify contract on block explorer, run:");
  console.log(`npx hardhat verify --network monadTestnet ${address}`);

  // Display next steps
  console.log("\n✨ Next steps:");
  console.log("1. Update NEXT_PUBLIC_WINNER_VAULT_ADDRESS in .env.local");
  console.log("2. Ensure backend wallets (WALLET_PRIVATE_KEY_1, etc.) have MON");
  console.log("3. Test a deposit: contract.depositFor(userAddress, amount, { value: amount })");
  console.log("4. Test a withdrawal: contract.withdraw()");
  console.log("5. Monitor events: Deposited and Withdrawn");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
