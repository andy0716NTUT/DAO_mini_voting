const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mini DAO Voting System", function () {
  async function deployFixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    const MemeVoteToken = await ethers.getContractFactory("MemeVoteToken");
    const token = await MemeVoteToken.deploy();
    await token.waitForDeployment();

    const MiniDAOVoting = await ethers.getContractFactory("MiniDAOVoting");
    const voting = await MiniDAOVoting.deploy(await token.getAddress());
    await voting.waitForDeployment();

    await token.transfer(alice.address, ethers.parseEther("50"));
    await token.transfer(bob.address, ethers.parseEther("20"));

    return { token, voting, owner, alice, bob, charlie };
  }

  async function futureTimestamp(seconds = 3600) {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp + seconds;
  }

  it("deploys token with correct metadata and initial supply", async function () {
    const { token, owner } = await deployFixture();

    expect(await token.name()).to.equal("MemeVote Token");
    expect(await token.symbol()).to.equal("MVT");
    expect(await token.decimals()).to.equal(18);
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("999930"));
  });

  it("creates a poll with deadline and result visibility settings", async function () {
    const { voting } = await deployFixture();
    const options = ["火鍋", "燒肉", "義大利麵"];
    const endTime = await futureTimestamp();

    await expect(voting.createPoll("下一次聚餐吃什麼？", "請大家使用 MVT 投票", options, endTime, false))
      .to.emit(voting, "PollCreated")
      .withArgs(0, "下一次聚餐吃什麼？", endTime, false);

    const poll = await voting.getPoll(0);
    expect(poll.title).to.equal("下一次聚餐吃什麼？");
    expect(poll.options).to.deep.equal(options);
    expect(poll.isClosed).to.equal(false);
    expect(poll.totalVotes).to.equal(0);
    expect(poll.endTime).to.equal(endTime);
    expect(poll.resultsVisibleBeforeClose).to.equal(false);
  });

  it("splits custom vote weights across multiple options and deducts MVT", async function () {
    const { token, voting, alice } = await deployFixture();
    const endTime = await futureTimestamp();

    await voting.createPoll("多選分配票數", "可以把 MVT 分給多個選項", ["A", "B", "C"], endTime, true);
    await token.connect(alice).approve(await voting.getAddress(), ethers.parseEther("15"));

    await expect(
      voting.connect(alice).vote(0, [0, 2], [ethers.parseEther("10"), ethers.parseEther("5")])
    )
      .to.emit(voting, "Voted")
      .withArgs(0, alice.address, 0, ethers.parseEther("10"));

    expect(await voting.getOptionVoteCount(0, 0)).to.equal(ethers.parseEther("10"));
    expect(await voting.getOptionVoteCount(0, 2)).to.equal(ethers.parseEther("5"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("35"));

    const poll = await voting.getPoll(0);
    expect(poll.totalVotes).to.equal(ethers.parseEther("15"));
  });

  it("rejects duplicate options, zero votes, and votes above wallet balance", async function () {
    const { token, voting, bob } = await deployFixture();
    const endTime = await futureTimestamp();

    await voting.createPoll("票數限制測試", "投票票數不可超過錢包餘額", ["A", "B"], endTime, true);
    await token.connect(bob).approve(await voting.getAddress(), ethers.parseEther("30"));

    await expect(voting.connect(bob).vote(0, [0], [0])).to.be.revertedWith("Voting: vote weight required");
    await expect(
      voting.connect(bob).vote(0, [0, 0], [ethers.parseEther("1"), ethers.parseEther("1")])
    ).to.be.revertedWith("Voting: duplicate option");
    await expect(voting.connect(bob).vote(0, [1], [ethers.parseEther("20.0001")])).to.be.revertedWith(
      "Voting: insufficient voting power"
    );
  });

  it("prevents duplicate voting and zero-balance voting", async function () {
    const { token, voting, alice, charlie } = await deployFixture();
    const endTime = await futureTimestamp();

    await voting.createPoll("社團活動地點投票", "選出下一次活動地點", ["河濱公園", "桌遊店"], endTime, true);
    await token.connect(alice).approve(await voting.getAddress(), ethers.parseEther("10"));

    await voting.connect(alice).vote(0, [1], [ethers.parseEther("10")]);
    await expect(voting.connect(alice).vote(0, [0], [ethers.parseEther("1")])).to.be.revertedWith("Voting: already voted");
    await expect(voting.connect(charlie).vote(0, [0], [ethers.parseEther("1")])).to.be.revertedWith(
      "Voting: no voting power"
    );
  });

  it("allows only owner to close polls and blocks voting after close", async function () {
    const { token, voting, alice, bob } = await deployFixture();
    const endTime = await futureTimestamp();

    await voting.createPoll("班級趣味票選", "本週主題", ["A", "B"], endTime, true);
    await token.connect(bob).approve(await voting.getAddress(), ethers.parseEther("1"));

    await expect(voting.connect(alice).closePoll(0)).to.be.reverted;
    await expect(voting.closePoll(0)).to.emit(voting, "PollClosed").withArgs(0);
    expect(await voting.isPollClosed(0)).to.equal(true);
    await expect(voting.connect(bob).vote(0, [0], [ethers.parseEther("1")])).to.be.revertedWith("Voting: poll is closed");
  });

  it("records voters, selected options, and vote weights", async function () {
    const { token, voting, alice, bob } = await deployFixture();
    const endTime = await futureTimestamp();

    await voting.createPoll("下一次聚餐吃什麼？", "請大家使用 MVT 投票", ["火鍋", "燒肉", "義大利麵"], endTime, true);
    await token.connect(alice).approve(await voting.getAddress(), ethers.parseEther("12"));
    await token.connect(bob).approve(await voting.getAddress(), ethers.parseEther("6"));

    await voting.connect(alice).vote(0, [0, 2], [ethers.parseEther("8"), ethers.parseEther("4")]);
    await voting.connect(bob).vote(0, [1], [ethers.parseEther("6")]);

    const records = await voting.getVoterRecords(0);

    expect(records.voters).to.deep.equal([alice.address, alice.address, bob.address]);
    expect(records.optionIndices).to.deep.equal([0n, 2n, 1n]);
    expect(records.voteWeights).to.deep.equal([
      ethers.parseEther("8"),
      ethers.parseEther("4"),
      ethers.parseEther("6"),
    ]);
  });

  it("lets only owner delete closed polls", async function () {
    const { voting, alice } = await deployFixture();
    const endTime = await futureTimestamp();

    await voting.createPoll("班級趣味票選", "本週主題", ["A", "B"], endTime, true);
    await expect(voting.deletePoll(0)).to.be.revertedWith("Voting: close poll first");

    await voting.closePoll(0);
    await expect(voting.connect(alice).deletePoll(0)).to.be.reverted;
    await expect(voting.deletePoll(0)).to.emit(voting, "PollDeleted").withArgs(0);
    await expect(voting.getPoll(0)).to.be.revertedWith("Voting: poll deleted");

    const allPolls = await voting.getAllPolls();
    expect(allPolls.ids.length).to.equal(0);
  });
});
