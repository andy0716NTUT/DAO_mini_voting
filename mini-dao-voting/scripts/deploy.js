const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying Mini DAO Voting System...");
  console.log("Deployer:", deployer.address);

  const MemeVoteToken = await hre.ethers.getContractFactory("MemeVoteToken");
  const token = await MemeVoteToken.deploy();
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("MemeVoteToken:", tokenAddress);

  const MiniDAOVoting = await hre.ethers.getContractFactory("MiniDAOVoting");
  const voting = await MiniDAOVoting.deploy(tokenAddress);
  await voting.waitForDeployment();

  const votingAddress = await voting.getAddress();
  console.log("MiniDAOVoting:", votingAddress);

  const sampleOptions = ["火鍋", "燒肉", "義大利麵", "韓式料理"];
  const tx = await voting.createPoll(
    "下一次聚餐吃什麼？",
    "請大家使用 MVT 投票，所有結果都會永久記錄在區塊鏈上。",
    sampleOptions
  );
  await tx.wait();
  console.log("Sample poll created.");

  await writeFrontendFiles(tokenAddress, votingAddress);

  console.log("\nDeployment complete.");
  console.log("Open frontend/index.html with Live Server or your browser.");
}

async function writeFrontendFiles(tokenAddress, votingAddress) {
  const frontendDir = path.join(__dirname, "..", "frontend");
  const abiDir = path.join(frontendDir, "abi");
  fs.mkdirSync(abiDir, { recursive: true });

  const tokenArtifact = await hre.artifacts.readArtifact("MemeVoteToken");
  const votingArtifact = await hre.artifacts.readArtifact("MiniDAOVoting");

  fs.writeFileSync(
    path.join(abiDir, "MemeVoteToken.json"),
    JSON.stringify(tokenArtifact.abi, null, 2)
  );

  fs.writeFileSync(
    path.join(abiDir, "MiniDAOVoting.json"),
    JSON.stringify(votingArtifact.abi, null, 2)
  );

  const chainId = hre.network.config.chainId || 31337;
  const networkName = hre.network.name;

  const config = `window.MINI_DAO_CONFIG = {
  tokenAddress: "${tokenAddress}",
  votingAddress: "${votingAddress}",
  networkName: "${networkName}",
  chainId: ${chainId},
  deployedAt: "${new Date().toISOString()}"
};
`;

  fs.writeFileSync(path.join(frontendDir, "config.js"), config);
  console.log("Frontend config and ABI files updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
