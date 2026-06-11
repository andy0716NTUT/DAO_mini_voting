const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const distDir = path.join(rootDir, "dist");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
copyDirectory(frontendDir, distDir);

const tokenAddress = process.env.VITE_MVT_TOKEN_ADDRESS || process.env.MVT_TOKEN_ADDRESS;
const votingAddress = process.env.VITE_MINI_DAO_VOTING_ADDRESS || process.env.MINI_DAO_VOTING_ADDRESS;
const chainId = process.env.VITE_CHAIN_ID || process.env.CHAIN_ID;
const networkName = process.env.VITE_NETWORK_NAME || process.env.NETWORK_NAME;

if (tokenAddress && votingAddress) {
  const config = `window.MINI_DAO_CONFIG = {
  tokenAddress: "${tokenAddress}",
  votingAddress: "${votingAddress}",
  networkName: "${networkName || ""}",
  chainId: ${Number(chainId || 11155111)},
  hiddenPollIds: [],
  deployedAt: "${new Date().toISOString()}"
};
`;

  fs.writeFileSync(path.join(distDir, "config.js"), config);
}

console.log("Frontend copied to dist.");

function copyDirectory(sourceDir, targetDir) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}
