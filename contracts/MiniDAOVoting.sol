// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Mini DAO Voting System
/// @notice ERC-20 token voting with deadlines, weighted allocations, and on-chain soft deletion.
contract MiniDAOVoting is Ownable {
    // 用於投票加權的 ERC-20 代幣合約實例 (例如 MVT)
    IERC20 public immutable votingToken;

    // 投票活動結構體
    struct Poll {
        uint256 pollId;                  // 投票活動的 ID
        string title;                    // 投票標題
        string description;              // 投票詳細描述
        string[] options;                // 投票候選選項清單
        uint256[] voteCounts;            // 各選項累積的票數 (與 options 一一對應)
        bool isClosed;                   // 是否手動關閉
        bool isDeleted;                  // 是否已軟刪除 (隱藏)
        uint256 totalVotes;              // 此投票活動的總累積票數
        uint256 createdAt;               // 投票建立的區塊時間戳記
        uint256 endTime;                 // 投票截止的區塊時間戳記
        bool resultsVisibleBeforeClose;  // 投票未結束前是否公開結果
        uint256 minVote;                 // 單一帳戶投票總額的最低限制 (0 表示不限制)
        uint256 maxVote;                 // 單一帳戶投票總額的最高限制 (0 表示不限制)
    }

    // 投票明細紀錄結構體
    struct VoteRecord {
        address voter;                   // 投票者錢包地址
        uint256 optionIndex;             // 投給的選項索引值
        uint256 voteWeight;              // 投給該選項的票數權重 (代幣量)
    }

    // 總投票活動數量計數器 (同時作為下一個建立的投票 ID)
    uint256 public pollCount;

    // 投票 ID 到投票詳細資訊的映射表
    mapping(uint256 => Poll) private polls;
    // 投票 ID 到「錢包地址是否已投過票」的對映表 (每個錢包單一投票只能投一次，但可多選分配)
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    // 投票 ID 到所有投票明細紀錄的陣列映射表
    mapping(uint256 => VoteRecord[]) private voteRecords;

    // 建立新投票活動時觸發的事件
    event PollCreated(uint256 indexed pollId, string title, uint256 endTime, bool resultsVisibleBeforeClose, uint256 minVote, uint256 maxVote);
    // 用戶投出選票時觸發的事件 (支援多次分配則會發出多次)
    event Voted(uint256 indexed pollId, address indexed voter, uint256 optionIndex, uint256 voteWeight);
    // 管理者手動關閉投票活動時觸發的事件
    event PollClosed(uint256 indexed pollId);
    // 管理者軟刪除投票活動時觸發的事件
    event PollDeleted(uint256 indexed pollId);

    /// @notice 建構子，初始化加權投票所需的 ERC-20 代幣合約地址，並指定合約擁有人
    /// @param tokenAddress ERC-20 代幣的合約地址
    constructor(address tokenAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Voting: token is zero address");
        votingToken = IERC20(tokenAddress);
    }

    /// @notice 建立新的投票活動
    /// @param title 投票標題
    /// @param description 投票詳情描述
    /// @param options 候選選項陣列 (限制在 2 ~ 10 個選項)
    /// @param endTime 投票截止時間戳記 (必須大於當前區塊時間)
    /// @param resultsVisibleBeforeClose 是否允許在截止前公開投票統計結果
    /// @param minVote 單次投票最低票數限制 (18位精度，0 表示不設下限)
    /// @param maxVote 單次投票最高票數限制 (18位精度，0 表示不設上限)
    /// @return pollId 新建立的投票 ID
    function createPoll(
        string calldata title,
        string calldata description,
        string[] calldata options,
        uint256 endTime,
        bool resultsVisibleBeforeClose,
        uint256 minVote,
        uint256 maxVote
    ) external returns (uint256) {
        // 驗證基本輸入參數
        require(bytes(title).length > 0, "Voting: title required");
        require(bytes(description).length > 0, "Voting: description required");
        require(options.length >= 2, "Voting: at least two options");
        require(options.length <= 10, "Voting: too many options");
        require(endTime > block.timestamp, "Voting: end time must be future");
        require(maxVote == 0 || maxVote >= minVote, "Voting: invalid min/max vote limits");

        uint256 pollId = pollCount;
        Poll storage poll = polls[pollId];
        poll.pollId = pollId;
        poll.title = title;
        poll.description = description;
        poll.createdAt = block.timestamp;
        poll.endTime = endTime;
        poll.resultsVisibleBeforeClose = resultsVisibleBeforeClose;
        poll.minVote = minVote;
        poll.maxVote = maxVote;

        // 寫入選項並初始化計數為 0
        for (uint256 i = 0; i < options.length; i++) {
            require(bytes(options[i]).length > 0, "Voting: empty option");
            poll.options.push(options[i]);
            poll.voteCounts.push(0);
        }

        pollCount++;
        emit PollCreated(pollId, title, endTime, resultsVisibleBeforeClose, minVote, maxVote);
        return pollId;
    }

    /// @notice Vote once per poll, optionally splitting MVT across multiple options.
    /// @dev The total vote weight is transferred from the voter into this contract.
    /// @notice 進行投票，支援將個人的 MVT 投票權重分配至多個不同的選項中
    /// @dev 投票總額會透過 transferFrom 轉入此合約託管，請在呼叫前先授權 (approve)
    /// @param pollId 目標投票活動的 ID
    /// @param optionIndices 欲投給的選項索引陣列
    /// @param voteWeights 欲分配給各個選項的票數 (與 optionIndices 一一對應)
    function vote(
        uint256 pollId,
        uint256[] calldata optionIndices,
        uint256[] calldata voteWeights
    ) external {
        Poll storage poll = _getExistingPoll(pollId);
        // 確保投票未結束且該地址尚未投過票
        require(!_isClosed(poll), "Voting: poll is closed");
        require(!hasVoted[pollId][msg.sender], "Voting: already voted");
        require(optionIndices.length > 0, "Voting: vote required");
        require(optionIndices.length == voteWeights.length, "Voting: length mismatch");
        require(optionIndices.length <= poll.options.length, "Voting: too many allocations");

        uint256 totalWeight = 0;
        bool[] memory seenOptions = new bool[](poll.options.length);

        // 遍歷所有分配的票數，做基本驗證
        for (uint256 i = 0; i < optionIndices.length; i++) {
            uint256 optionIndex = optionIndices[i];
            uint256 voteWeight = voteWeights[i];

            require(optionIndex < poll.options.length, "Voting: invalid option");
            require(!seenOptions[optionIndex], "Voting: duplicate option");
            require(voteWeight > 0, "Voting: vote weight required");

            seenOptions[optionIndex] = true;
            totalWeight += voteWeight;
        }

        // 驗證本次投票總額是否符合最低與最高投票額度限制
        require(totalWeight >= poll.minVote, "Voting: vote weight below minimum limit");
        require(poll.maxVote == 0 || totalWeight <= poll.maxVote, "Voting: vote weight exceeds maximum limit");

        // 驗證錢包額度並扣除代幣
        uint256 balance = votingToken.balanceOf(msg.sender);
        require(balance > 0, "Voting: no voting power");
        require(totalWeight <= balance, "Voting: insufficient voting power");
        require(votingToken.transferFrom(msg.sender, address(this), totalWeight), "Voting: token transfer failed");

        // 標記該用戶在此投票已投過票
        hasVoted[pollId][msg.sender] = true;

        // 寫入得票統計並記錄明細
        for (uint256 i = 0; i < optionIndices.length; i++) {
            uint256 optionIndex = optionIndices[i];
            uint256 voteWeight = voteWeights[i];

            poll.voteCounts[optionIndex] += voteWeight;
            poll.totalVotes += voteWeight;
            voteRecords[pollId].push(VoteRecord(msg.sender, optionIndex, voteWeight));

            emit Voted(pollId, msg.sender, optionIndex, voteWeight);
        }
    }

    /// @notice 手動關閉投票活動 (限管理者/Owner)
    /// @param pollId 欲關閉的投票 ID
    function closePoll(uint256 pollId) external onlyOwner {
        Poll storage poll = _getExistingPoll(pollId);
        require(!_isClosed(poll), "Voting: already closed");
        poll.isClosed = true;
        emit PollClosed(pollId);
    }

    /// @notice 軟刪除已結束的投票活動，使其從列表中隱藏 (限管理者/Owner)
    /// @param pollId 欲刪除的投票 ID
    function deletePoll(uint256 pollId) external onlyOwner {
        Poll storage poll = _getExistingPoll(pollId);
        require(_isClosed(poll), "Voting: close poll first");
        poll.isDeleted = true;
        emit PollDeleted(pollId);
    }

    /// @notice 獲取單一投票活動的詳細欄位
    /// @param pollId 欲查詢的投票 ID
    function getPoll(uint256 pollId)
        external
        view
        returns (
            uint256 id,
            string memory title,
            string memory description,
            string[] memory options,
            uint256[] memory voteCounts,
            bool isClosed,
            uint256 totalVotes,
            uint256 createdAt,
            uint256 endTime,
            bool resultsVisibleBeforeClose,
            uint256 minVote,
            uint256 maxVote
        )
    {
        Poll storage poll = _getExistingPoll(pollId);
        return (
            poll.pollId,
            poll.title,
            poll.description,
            poll.options,
            poll.voteCounts,
            _isClosed(poll),
            poll.totalVotes,
            poll.createdAt,
            poll.endTime,
            poll.resultsVisibleBeforeClose,
            poll.minVote,
            poll.maxVote
        );
    }

    /// @notice 獲取所有未刪除投票的簡要列表
    /// @return ids 投票 ID 列表
    /// @return titles 投票標題列表
    /// @return descriptions 投票說明列表
    /// @return closedStatuses 各投票是否已關閉
    /// @return totalVotesList 各投票總得票數列表
    function getAllPolls()
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory titles,
            string[] memory descriptions,
            bool[] memory closedStatuses,
            uint256[] memory totalVotesList
        )
    {
        uint256 activeCount = 0;

        // 計算未刪除的投票活動總數
        for (uint256 i = 0; i < pollCount; i++) {
            if (!polls[i].isDeleted) {
                activeCount++;
            }
        }

        ids = new uint256[](activeCount);
        titles = new string[](activeCount);
        descriptions = new string[](activeCount);
        closedStatuses = new bool[](activeCount);
        totalVotesList = new uint256[](activeCount);

        uint256 resultIndex = 0;
        // 填充未刪除的投票簡要資料
        for (uint256 i = 0; i < pollCount; i++) {
            Poll storage poll = polls[i];
            if (poll.isDeleted) {
                continue;
            }

            ids[resultIndex] = poll.pollId;
            titles[resultIndex] = poll.title;
            descriptions[resultIndex] = poll.description;
            closedStatuses[resultIndex] = _isClosed(poll);
            totalVotesList[resultIndex] = poll.totalVotes;
            resultIndex++;
        }
    }

    /// @notice 獲取特定投票活動的所有選民投票記錄清單
    /// @param pollId 投票 ID
    /// @return voters 投票者錢包地址列表
    /// @return optionIndices 投票所選的選項索引列表
    /// @return voteWeights 投票權重 (票數) 列表
    function getVoterRecords(uint256 pollId)
        external
        view
        returns (
            address[] memory voters,
            uint256[] memory optionIndices,
            uint256[] memory voteWeights
        )
    {
        _getExistingPoll(pollId);

        VoteRecord[] storage records = voteRecords[pollId];
        voters = new address[](records.length);
        optionIndices = new uint256[](records.length);
        voteWeights = new uint256[](records.length);

        for (uint256 i = 0; i < records.length; i++) {
            voters[i] = records[i].voter;
            optionIndices[i] = records[i].optionIndex;
            voteWeights[i] = records[i].voteWeight;
        }
    }

    /// @notice 獲取特定投票的所有候選選項文字列表
    function getOptions(uint256 pollId) external view returns (string[] memory) {
        return _getExistingPoll(pollId).options;
    }

    /// @notice 獲取特定投票所有選項的當前得票統計陣列
    function getVoteCounts(uint256 pollId) external view returns (uint256[] memory) {
        return _getExistingPoll(pollId).voteCounts;
    }

    /// @notice 獲取特定投票中單一選項的得票數
    function getOptionVoteCount(uint256 pollId, uint256 optionIndex) external view returns (uint256) {
        Poll storage poll = _getExistingPoll(pollId);
        require(optionIndex < poll.options.length, "Voting: invalid option");
        return poll.voteCounts[optionIndex];
    }

    /// @notice 查詢特定投票是否已截止或已手動關閉
    function isPollClosed(uint256 pollId) external view returns (bool) {
        Poll storage poll = _getExistingPoll(pollId);
        return _isClosed(poll);
    }

    /// @dev 內部共用函數，獲取存在的且未被刪除的投票，否則拋出異常
    function _getExistingPoll(uint256 pollId) internal view returns (Poll storage) {
        require(pollId < pollCount, "Voting: poll not found");
        require(!polls[pollId].isDeleted, "Voting: poll deleted");
        return polls[pollId];
    }

    /// @dev 內部共用函數，判斷投票是否關閉 (手動關閉或截止時間已過)
    function _isClosed(Poll storage poll) internal view returns (bool) {
        return poll.isClosed || block.timestamp >= poll.endTime;
    }
}
