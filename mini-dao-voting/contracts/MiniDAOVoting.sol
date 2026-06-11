// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Mini DAO Voting System
/// @notice 使用 ERC-20 代幣餘額作為投票權重的鏈上投票合約。
contract MiniDAOVoting is Ownable {
    IERC20 public immutable votingToken;

    struct Poll {
        uint256 pollId;
        string title;
        string description;
        string[] options;
        uint256[] voteCounts;
        bool isClosed;
        bool isDeleted;
        uint256 totalVotes;
    }

    struct VoteRecord {
        address voter;
        uint256 optionIndex;
        uint256 voteWeight;
    }

    uint256 public pollCount;

    mapping(uint256 => Poll) private polls;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => VoteRecord[]) private voteRecords;

    event PollCreated(uint256 indexed pollId, string title);
    event Voted(
        uint256 indexed pollId,
        address indexed voter,
        uint256 optionIndex,
        uint256 voteWeight
    );
    event PollClosed(uint256 indexed pollId);
    event PollDeleted(uint256 indexed pollId);

    /// @param tokenAddress MemeVote Token 合約地址。
    constructor(address tokenAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Voting: token is zero address");
        votingToken = IERC20(tokenAddress);
    }

    /// @notice 建立一個新的投票活動。
    /// @dev options 與 voteCounts 會一一對應，建立後不能修改選項。
    function createPoll(
        string calldata title,
        string calldata description,
        string[] calldata options
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Voting: title required");
        require(bytes(description).length > 0, "Voting: description required");
        require(options.length >= 2, "Voting: at least two options");
        require(options.length <= 10, "Voting: too many options");

        uint256 pollId = pollCount;
        Poll storage poll = polls[pollId];
        poll.pollId = pollId;
        poll.title = title;
        poll.description = description;

        for (uint256 i = 0; i < options.length; i++) {
            require(bytes(options[i]).length > 0, "Voting: empty option");
            poll.options.push(options[i]);
            poll.voteCounts.push(0);
        }

        pollCount++;
        emit PollCreated(pollId, title);
        return pollId;
    }

    /// @notice 使用投票當下持有的 MVT 餘額作為票數權重。
    function vote(uint256 pollId, uint256 optionIndex) external {
        Poll storage poll = _getExistingPoll(pollId);
        require(!poll.isClosed, "Voting: poll is closed");
        require(optionIndex < poll.options.length, "Voting: invalid option");
        require(!hasVoted[pollId][msg.sender], "Voting: already voted");

        uint256 voteWeight = votingToken.balanceOf(msg.sender);
        require(voteWeight > 0, "Voting: no voting power");

        hasVoted[pollId][msg.sender] = true;
        poll.voteCounts[optionIndex] += voteWeight;
        poll.totalVotes += voteWeight;
        voteRecords[pollId].push(VoteRecord(msg.sender, optionIndex, voteWeight));

        emit Voted(pollId, msg.sender, optionIndex, voteWeight);
    }

    /// @notice 僅 Owner 可關閉投票。關閉後仍可查詢結果，但不可再投票。
    function closePoll(uint256 pollId) external onlyOwner {
        Poll storage poll = _getExistingPoll(pollId);
        require(!poll.isClosed, "Voting: already closed");
        poll.isClosed = true;
        emit PollClosed(pollId);
    }

    /// @notice 僅 Owner 可刪除已關閉投票。這是軟刪除，歷史交易與事件仍可在區塊鏈上查到。
    function deletePoll(uint256 pollId) external onlyOwner {
        Poll storage poll = _getExistingPoll(pollId);
        require(poll.isClosed, "Voting: close poll first");
        poll.isDeleted = true;
        emit PollDeleted(pollId);
    }

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
            uint256 totalVotes
        )
    {
        Poll storage poll = _getExistingPoll(pollId);
        return (
            poll.pollId,
            poll.title,
            poll.description,
            poll.options,
            poll.voteCounts,
            poll.isClosed,
            poll.totalVotes
        );
    }

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
        for (uint256 i = 0; i < pollCount; i++) {
            Poll storage poll = polls[i];
            if (poll.isDeleted) {
                continue;
            }

            ids[resultIndex] = poll.pollId;
            titles[resultIndex] = poll.title;
            descriptions[resultIndex] = poll.description;
            closedStatuses[resultIndex] = poll.isClosed;
            totalVotesList[resultIndex] = poll.totalVotes;
            resultIndex++;
        }
    }

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

    function getOptions(uint256 pollId) external view returns (string[] memory) {
        return _getExistingPoll(pollId).options;
    }

    function getVoteCounts(uint256 pollId) external view returns (uint256[] memory) {
        return _getExistingPoll(pollId).voteCounts;
    }

    function getOptionVoteCount(uint256 pollId, uint256 optionIndex) external view returns (uint256) {
        Poll storage poll = _getExistingPoll(pollId);
        require(optionIndex < poll.options.length, "Voting: invalid option");
        return poll.voteCounts[optionIndex];
    }

    function isPollClosed(uint256 pollId) external view returns (bool) {
        return _getExistingPoll(pollId).isClosed;
    }

    function _getExistingPoll(uint256 pollId) internal view returns (Poll storage) {
        require(pollId < pollCount, "Voting: poll not found");
        require(!polls[pollId].isDeleted, "Voting: poll deleted");
        return polls[pollId];
    }
}
