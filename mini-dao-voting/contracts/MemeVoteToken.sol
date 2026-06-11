// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MemeVote Token
/// @notice 沒有實際價值的 ERC-20 治理代幣，作為 Mini DAO 投票權憑證。
contract MemeVoteToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    /// @notice 部署時自動鑄造初始供給給部署者。
    constructor() ERC20("MemeVote Token", "MVT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Owner 可額外鑄造測試代幣，方便課堂展示或測試。
    /// @param to 接收代幣地址。
    /// @param amount 代幣數量，單位為 wei-like token units。
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MVT: mint to zero address");
        _mint(to, amount);
    }
}
