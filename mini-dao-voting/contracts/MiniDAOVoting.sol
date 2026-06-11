// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Mini DAO Voting System
/// @notice ERC-20 token voting with deadlines, weighted allocations, and on-chain soft deletion.
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
        uint256 createdAt;
        uint256 endTime;
        bool resultsVisibleBeforeClose;
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

    event PollCreated(uint256 indexed pollId, string title, uint256 endTime, bool resultsVisibleBeforeClose);
    event Voted(uint256 indexed pollId, address indexed voter, uint256 optionIndex, uint256 voteWeight);
    event PollClosed(uint256 indexed pollId);
    event PollDeleted(uint256 indexed pollId);

    constructor(address tokenAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Voting: token is zero address");
        votingToken = IERC20(tokenAddress);
    }

    function createPoll(
        string calldata title,
        string calldata description,
        string[] calldata options,
        uint256 endTime,
        bool resultsVisibleBeforeClose
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Voting: title required");
        require(bytes(description).length > 0, "Voting: description required");
        require(options.length >= 2, "Voting: at least two options");
        require(options.length <= 10, "Voting: too many options");
        require(endTime > block.timestamp, "Voting: end time must be future");

        uint256 pollId = pollCount;
        Poll storage poll = polls[pollId];
        poll.pollId = pollId;
        poll.title = title;
        poll.description = description;
        poll.createdAt = block.timestamp;
        poll.endTime = endTime;
        poll.resultsVisibleBeforeClose = resultsVisibleBeforeClose;

        for (uint256 i = 0; i < options.length; i++) {
            require(bytes(options[i]).length > 0, "Voting: empty option");
            poll.options.push(options[i]);
            poll.voteCounts.push(0);
        }

        pollCount++;
        emit PollCreated(pollId, title, endTime, resultsVisibleBeforeClose);
        return pollId;
    }

    /// @notice Vote once per poll, optionally splitting MVT across multiple options.
    /// @dev The total vote weight is transferred from the voter into this contract.
    function vote(
        uint256 pollId,
        uint256[] calldata optionIndices,
        uint256[] calldata voteWeights
    ) external {
        Poll storage poll = _getExistingPoll(pollId);
        require(!_isClosed(poll), "Voting: poll is closed");
        require(!hasVoted[pollId][msg.sender], "Voting: already voted");
        require(optionIndices.length > 0, "Voting: vote required");
        require(optionIndices.length == voteWeights.length, "Voting: length mismatch");
        require(optionIndices.length <= poll.options.length, "Voting: too many allocations");

        uint256 totalWeight = 0;
        bool[] memory seenOptions = new bool[](poll.options.length);

        for (uint256 i = 0; i < optionIndices.length; i++) {
            uint256 optionIndex = optionIndices[i];
            uint256 voteWeight = voteWeights[i];

            require(optionIndex < poll.options.length, "Voting: invalid option");
            require(!seenOptions[optionIndex], "Voting: duplicate option");
            require(voteWeight > 0, "Voting: vote weight required");

            seenOptions[optionIndex] = true;
            totalWeight += voteWeight;
        }

        uint256 balance = votingToken.balanceOf(msg.sender);
        require(balance > 0, "Voting: no voting power");
        require(totalWeight <= balance, "Voting: insufficient voting power");
        require(votingToken.transferFrom(msg.sender, address(this), totalWeight), "Voting: token transfer failed");

        hasVoted[pollId][msg.sender] = true;

        for (uint256 i = 0; i < optionIndices.length; i++) {
            uint256 optionIndex = optionIndices[i];
            uint256 voteWeight = voteWeights[i];

            poll.voteCounts[optionIndex] += voteWeight;
            poll.totalVotes += voteWeight;
            voteRecords[pollId].push(VoteRecord(msg.sender, optionIndex, voteWeight));

            emit Voted(pollId, msg.sender, optionIndex, voteWeight);
        }
    }

    function closePoll(uint256 pollId) external onlyOwner {
        Poll storage poll = _getExistingPoll(pollId);
        require(!_isClosed(poll), "Voting: already closed");
        poll.isClosed = true;
        emit PollClosed(pollId);
    }

    function deletePoll(uint256 pollId) external onlyOwner {
        Poll storage poll = _getExistingPoll(pollId);
        require(_isClosed(poll), "Voting: close poll first");
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
            uint256 totalVotes,
            uint256 createdAt,
            uint256 endTime,
            bool resultsVisibleBeforeClose
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
            poll.resultsVisibleBeforeClose
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
            closedStatuses[resultIndex] = _isClosed(poll);
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
        Poll storage poll = _getExistingPoll(pollId);
        return _isClosed(poll);
    }

    function _getExistingPoll(uint256 pollId) internal view returns (Poll storage) {
        require(pollId < pollCount, "Voting: poll not found");
        require(!polls[pollId].isDeleted, "Voting: poll deleted");
        return polls[pollId];
    }

    function _isClosed(Poll storage poll) internal view returns (bool) {
        return poll.isClosed || block.timestamp >= poll.endTime;
    }
}
