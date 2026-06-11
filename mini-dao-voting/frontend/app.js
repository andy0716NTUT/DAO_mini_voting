const TOKEN_ABI = [
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Transfer", type: "event" }
];

const VOTING_ABI = [
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pollCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }, { name: "voter", type: "address" }], name: "hasVoted", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "title", type: "string" }, { name: "description", type: "string" }, { name: "options", type: "string[]" }], name: "createPoll", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }, { name: "optionIndex", type: "uint256" }], name: "vote", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "closePoll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "deletePoll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "isPollClosed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "getPoll", outputs: [{ name: "id", type: "uint256" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "options", type: "string[]" }, { name: "voteCounts", type: "uint256[]" }, { name: "isClosed", type: "bool" }, { name: "totalVotes", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "getVoterRecords", outputs: [{ name: "voters", type: "address[]" }, { name: "optionIndices", type: "uint256[]" }, { name: "voteWeights", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "pollId", type: "uint256" }, { indexed: false, name: "title", type: "string" }], name: "PollCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "pollId", type: "uint256" }, { indexed: true, name: "voter", type: "address" }, { indexed: false, name: "optionIndex", type: "uint256" }, { indexed: false, name: "voteWeight", type: "uint256" }], name: "Voted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "pollId", type: "uint256" }], name: "PollClosed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "pollId", type: "uint256" }], name: "PollDeleted", type: "event" }
];

const state = {
  provider: null,
  signer: null,
  account: "",
  owner: "",
  tokenOwner: "",
  token: null,
  voting: null,
  polls: [],
  selectedPollId: null,
  hiddenPollIds: new Set(),
  listenersActive: false,
  refreshTimer: null
};

const config = window.MINI_DAO_CONFIG || {};

const dom = {
  connectWalletBtn: document.getElementById("connectWalletBtn"),
  adminPageBtn: document.getElementById("adminPageBtn"),
  addTokenBtn: document.getElementById("addTokenBtn"),
  walletInfo: document.getElementById("walletInfo"),
  walletAddress: document.getElementById("walletAddress"),
  networkName: document.getElementById("networkName"),
  tokenBalance: document.getElementById("tokenBalance"),
  contractStatus: document.getElementById("contractStatus"),
  contractAddresses: document.getElementById("contractAddresses"),
  createPollForm: document.getElementById("createPollForm"),
  transferForm: document.getElementById("transferForm"),
  refreshPollsBtn: document.getElementById("refreshPollsBtn"),
  pollList: document.getElementById("pollList"),
  votePanel: document.getElementById("votePanel"),
  resultPanel: document.getElementById("resultPanel"),
  selectedPollHint: document.getElementById("selectedPollHint"),
  adminSection: document.getElementById("adminSection"),
  adminCloseBtn: document.getElementById("adminCloseBtn"),
  adminAuthStatus: document.getElementById("adminAuthStatus"),
  mintForm: document.getElementById("mintForm"),
  mintReceiver: document.getElementById("mintReceiver"),
  mintAmount: document.getElementById("mintAmount"),
  adminDeletePollSelect: document.getElementById("adminDeletePollSelect"),
  deletePollBtn: document.getElementById("deletePollBtn"),
  adminRecordPollSelect: document.getElementById("adminRecordPollSelect"),
  refreshRecordsBtn: document.getElementById("refreshRecordsBtn"),
  voteRecordsList: document.getElementById("voteRecordsList"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),
  toastContainer: document.getElementById("toastContainer")
};

init();

function init() {
  updateContractStatus();
  bindEvents();
}

function bindEvents() {
  dom.connectWalletBtn.addEventListener("click", connectWallet);
  dom.adminPageBtn.addEventListener("click", openAdminPage);
  dom.addTokenBtn.addEventListener("click", addTokenToMetaMask);
  dom.refreshPollsBtn.addEventListener("click", loadPolls);
  dom.createPollForm.addEventListener("submit", createPoll);
  dom.transferForm.addEventListener("submit", transferToken);
  dom.adminCloseBtn.addEventListener("click", () => dom.adminSection.classList.add("hidden"));
  dom.mintForm.addEventListener("submit", mintTokens);
  dom.deletePollBtn.addEventListener("click", deleteClosedPoll);
  dom.refreshRecordsBtn.addEventListener("click", () => loadAdminVoteRecords());
  dom.adminRecordPollSelect.addEventListener("change", () => loadAdminVoteRecords());

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  }

  window.addEventListener("focus", () => {
    if (state.signer) {
      refreshWalletInfo().catch(() => {});
      loadPolls(false).catch(() => {});
    }
  });
}

function updateContractStatus() {
  if (!config.tokenAddress || !config.votingAddress) {
    dom.contractStatus.textContent = "尚未偵測到合約地址";
    dom.contractAddresses.textContent = "請先執行 npx hardhat run scripts/deploy.js --network localhost";
    return;
  }

  dom.contractStatus.textContent = "已連接 Sepolia 合約";
  dom.contractAddresses.textContent = `代幣 ${shortAddress(config.tokenAddress)}｜投票 ${shortAddress(config.votingAddress)}`;
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      showToast("請先安裝 MetaMask 再使用投票功能。", "error");
      return;
    }

    ensureConfig();
    showLoading("連接 MetaMask...");

    state.provider = new ethers.BrowserProvider(window.ethereum);
    await state.provider.send("eth_requestAccounts", []);
    state.signer = await state.provider.getSigner();
    state.account = await state.signer.getAddress();

    state.token = new ethers.Contract(config.tokenAddress, TOKEN_ABI, state.signer);
    state.voting = new ethers.Contract(config.votingAddress, VOTING_ABI, state.signer);
    await assertContractsExist();
    state.hiddenPollIds = loadHiddenPollIds();
    state.owner = await state.voting.owner();
    state.tokenOwner = await state.token.owner().catch(() => "");
    setupRealtimeUpdates();

    dom.connectWalletBtn.textContent = "已連接";
    dom.walletInfo.classList.remove("hidden");

    await refreshWalletInfo();
    await loadPolls();
    updateAdminStatus();
    showToast("錢包連線成功。", "success");
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function refreshWalletInfo() {
  ensureConnected();

  const network = await state.provider.getNetwork();
  const balance = await state.token.balanceOf(state.account);

  dom.walletAddress.textContent = `錢包：${shortAddress(state.account)}`;
  dom.networkName.textContent = `網路：${network.name || "未知"} (${network.chainId})`;
  dom.tokenBalance.textContent = `MVT 餘額：${formatToken(balance)}`;

  if (config.chainId && Number(network.chainId) !== Number(config.chainId)) {
    showToast(`目前網路 Chain ID 是 ${network.chainId}，部署設定是 ${config.chainId}，請確認 MetaMask 網路。`, "warning");
  }
}

function setupRealtimeUpdates() {
  if (state.listenersActive) return;
  state.listenersActive = true;

  const refreshUserBalance = (from, to) => {
    if (!state.account) return;
    const account = state.account.toLowerCase();
    if (from?.toLowerCase() === account || to?.toLowerCase() === account) {
      refreshWalletInfo().catch(() => {});
    }
  };

  const refreshPollData = debounce(() => {
    refreshWalletInfo().catch(() => {});
    loadPolls(false).catch(() => {});
    if (!dom.adminSection.classList.contains("hidden")) {
      updateAdminStatus();
      loadAdminVoteRecords().catch(() => {});
    }
  }, 800);

  state.token.on("Transfer", refreshUserBalance);
  state.voting.on("PollCreated", refreshPollData);
  state.voting.on("Voted", refreshPollData);
  state.voting.on("PollClosed", refreshPollData);
  state.voting.on("PollDeleted", refreshPollData);

  state.refreshTimer = window.setInterval(() => {
    refreshWalletInfo().catch(() => {});
  }, 15000);
}

async function loadPolls(showLoader = true) {
  try {
    ensureConnected();
    if (showLoader) showLoading("讀取鏈上投票...");

    const count = Number(await state.voting.pollCount());
    const polls = [];

    for (let i = 0; i < count; i++) {
      try {
        const poll = await state.voting.getPoll(i);
        const normalizedPoll = normalizePoll(poll);
        if (!state.hiddenPollIds.has(normalizedPoll.id)) {
          polls.push(normalizedPoll);
        }
      } catch {
        // 新版合約的已刪除投票會在 getPoll revert，前端直接略過。
      }
    }

    state.polls = polls;
    renderPollList();
    updateAdminPollSelectors();

    if (state.selectedPollId !== null && state.polls.some((poll) => poll.id === state.selectedPollId)) {
      selectPoll(state.selectedPollId);
    } else if (state.polls.length > 0) {
      selectPoll(state.polls[0].id);
    } else {
      renderEmptyPanels();
    }
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    if (showLoader) hideLoading();
  }
}

function normalizePoll(poll) {
  return {
    id: Number(poll[0]),
    title: poll[1],
    description: poll[2],
    options: [...poll[3]],
    voteCounts: [...poll[4]],
    isClosed: poll[5],
    totalVotes: poll[6]
  };
}

function renderPollList() {
  if (state.polls.length === 0) {
    dom.pollList.innerHTML = `<div class="empty-state">目前沒有投票活動，來建立第一個投票吧。</div>`;
    return;
  }

  dom.pollList.innerHTML = state.polls
    .map((poll) => {
      const active = poll.id === state.selectedPollId ? "active" : "";
      const statusClass = poll.isClosed ? "closed" : "open";
      const statusText = poll.isClosed ? "已關閉" : "進行中";
      return `
        <button class="poll-card ${active}" type="button" data-poll-id="${poll.id}">
          <h3>${escapeHtml(poll.title)}</h3>
          <p>${escapeHtml(poll.description)}</p>
          <div class="poll-meta">
            <span class="pill ${statusClass}">${statusText}</span>
            <span class="pill">投票 #${poll.id}</span>
            <span class="pill">總票數 ${formatToken(poll.totalVotes)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".poll-card").forEach((card) => {
    card.addEventListener("click", () => selectPoll(Number(card.dataset.pollId)));
  });
}

async function selectPoll(pollId) {
  state.selectedPollId = pollId;
  const poll = state.polls.find((item) => item.id === pollId);
  if (!poll) return;

  renderPollList();
  dom.selectedPollHint.textContent = `投票 #${poll.id}｜${poll.isClosed ? "已關閉" : "可投票"}`;

  let alreadyVoted = false;
  try {
    alreadyVoted = state.account ? await state.voting.hasVoted(poll.id, state.account) : false;
  } catch {
    alreadyVoted = false;
  }

  renderVotePanel(poll, alreadyVoted);
  renderResultPanel(poll);
}

function renderVotePanel(poll, alreadyVoted) {
  const disabled = poll.isClosed || alreadyVoted;
  const reason = poll.isClosed ? "投票已結束" : alreadyVoted ? "你已經投過票" : "選擇此選項投票";
  const closeButton = isOwner()
    ? `<button class="danger-btn full-btn" type="button" id="closePollBtn" ${poll.isClosed ? "disabled" : ""}>關閉投票</button>`
    : "";

  dom.votePanel.innerHTML = `
    ${poll.options
      .map((option, index) => `
        <div class="vote-option">
          <strong>${escapeHtml(option)}</strong>
          <button class="primary-btn vote-btn" type="button" data-option-index="${index}" ${disabled ? "disabled" : ""}>
            投票
          </button>
        </div>
      `)
      .join("")}
    <div class="empty-state">${reason}</div>
    ${closeButton}
  `;

  document.querySelectorAll(".vote-btn").forEach((button) => {
    button.addEventListener("click", () => vote(Number(button.dataset.optionIndex)));
  });

  const closePollBtn = document.getElementById("closePollBtn");
  if (closePollBtn) {
    closePollBtn.addEventListener("click", closeSelectedPoll);
  }
}

function renderResultPanel(poll) {
  const total = BigInt(poll.totalVotes);

  dom.resultPanel.innerHTML = poll.options
    .map((option, index) => {
      const count = BigInt(poll.voteCounts[index]);
      const percent = total === 0n ? 0 : Number((count * 10000n) / total) / 100;
      return `
        <div class="result-row">
          <div class="result-top">
            <strong>${escapeHtml(option)}</strong>
            <span>${percent.toFixed(2)}% | ${formatToken(count)} MVT</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderEmptyPanels() {
  dom.votePanel.innerHTML = `<div class="empty-state">請從左側投票列表選擇投票。</div>`;
  dom.resultPanel.innerHTML = `<div class="empty-state">尚未選擇投票。</div>`;
}

async function createPoll(event) {
  event.preventDefault();

  try {
    ensureConnected();
    const title = document.getElementById("pollTitle").value.trim();
    const description = document.getElementById("pollDescription").value.trim();
    const options = [...document.querySelectorAll(".poll-option")]
      .map((input) => input.value.trim())
      .filter(Boolean);

    if (options.length < 2) {
      showToast("請至少填寫兩個投票選項。", "warning");
      return;
    }

    showLoading("建立投票交易送出中...");
    const tx = await state.voting.createPoll(title, description, options);
    showToast(`交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    dom.createPollForm.reset();
    showToast("投票建立成功。", "success");
    await loadPolls();
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function vote(optionIndex) {
  try {
    ensureConnected();
    const balance = await state.token.balanceOf(state.account);
    if (balance === 0n) {
      showToast("你的 MVT 餘額不足，無法投票。", "warning");
      return;
    }

    showLoading("投票交易送出中...");
    const tx = await state.voting.vote(state.selectedPollId, optionIndex);
    showToast(`投票交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    showToast("投票成功，結果已寫入區塊鏈。", "success");
    await refreshWalletInfo();
    await loadPolls();
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function closeSelectedPoll() {
  try {
    ensureConnected();
    if (state.selectedPollId === null) return;

    showLoading("關閉投票交易送出中...");
    const tx = await state.voting.closePoll(state.selectedPollId);
    showToast(`關閉投票交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    showToast("投票已關閉。", "success");
    await loadPolls();
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function transferToken(event) {
  event.preventDefault();

  try {
    ensureConnected();
    const receiver = document.getElementById("receiverAddress").value.trim();
    const amount = document.getElementById("transferAmount").value.trim();

    if (!ethers.isAddress(receiver)) {
      showToast("接收地址格式不正確。", "warning");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showToast("請輸入大於 0 的轉帳數量。", "warning");
      return;
    }

    const parsedAmount = ethers.parseEther(amount);
    const balance = await state.token.balanceOf(state.account);
    if (balance < parsedAmount) {
      showToast("MVT 餘額不足，無法發送代幣。", "warning");
      return;
    }

    showLoading("代幣轉帳交易送出中...");
    const tx = await state.token.transfer(receiver, parsedAmount);
    showToast(`轉帳交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    dom.transferForm.reset();
    showToast("MVT 轉帳成功。", "success");
    await refreshWalletInfo();
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function openAdminPage() {
  try {
    ensureConnected();

    if (!isOwner()) {
      dom.adminSection.classList.add("hidden");
      showToast("沒有權限。", "error");
      return;
    }

    dom.adminSection.classList.remove("hidden");
    updateAdminStatus();
    updateAdminPollSelectors();
    await loadAdminVoteRecords();
    dom.adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  }
}

function updateAdminStatus() {
  if (!state.account) {
    dom.adminAuthStatus.textContent = "請先連接錢包。";
    return;
  }

  if (isOwner()) {
    dom.adminAuthStatus.textContent = `驗證成功：${shortAddress(state.account)}`;
  } else {
    dom.adminAuthStatus.textContent = "驗證失敗。";
  }
}

function updateAdminPollSelectors() {
  const recordOptions = state.polls
    .map((poll) => `<option value="${poll.id}">#${poll.id} ${escapeHtml(poll.title)}</option>`)
    .join("");
  const closedOptions = state.polls
    .filter((poll) => poll.isClosed)
    .map((poll) => `<option value="${poll.id}">#${poll.id} ${escapeHtml(poll.title)}</option>`)
    .join("");

  dom.adminRecordPollSelect.innerHTML = recordOptions || `<option value="">沒有可查看的投票</option>`;
  dom.adminDeletePollSelect.innerHTML = closedOptions || `<option value="">沒有已關閉投票</option>`;
  dom.deletePollBtn.disabled = !closedOptions;
  dom.refreshRecordsBtn.disabled = !recordOptions;
}

async function mintTokens(event) {
  event.preventDefault();

  try {
    ensureConnected();
    ensureAdmin();

    if (state.tokenOwner && state.tokenOwner.toLowerCase() !== state.account.toLowerCase()) {
      showToast("沒有權限。", "error");
      return;
    }

    const receiver = dom.mintReceiver.value.trim();
    const amount = dom.mintAmount.value.trim();

    if (!ethers.isAddress(receiver)) {
      showToast("接收地址格式不正確。", "warning");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showToast("請輸入大於 0 的發行數量。", "warning");
      return;
    }

    showLoading("發行 MVT 交易送出中...");
    const tx = await state.token.mint(receiver, ethers.parseEther(amount));
    showToast(`發行交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    dom.mintForm.reset();
    showToast("MVT 發行成功。", "success");
    await refreshWalletInfo();
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function deleteClosedPoll() {
  try {
    ensureConnected();
    ensureAdmin();

    const pollIdValue = dom.adminDeletePollSelect.value;
    if (pollIdValue === "") {
      showToast("目前沒有可隱藏的已關閉投票。", "warning");
      return;
    }

    const pollId = Number(pollIdValue);
    state.hiddenPollIds.add(pollId);
    saveHiddenPollIds();

    if (state.selectedPollId === pollId) {
      state.selectedPollId = null;
    }

    showToast("投票已從網站列表隱藏，鏈上資料仍保留。", "success");
    await loadPolls(false);
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function loadAdminVoteRecords() {
  if (!state.voting || dom.adminSection.classList.contains("hidden")) return;

  const pollIdValue = dom.adminRecordPollSelect.value;
  if (pollIdValue === "") {
    dom.voteRecordsList.className = "record-list empty-state";
    dom.voteRecordsList.textContent = "目前沒有可查看的投票。";
    return;
  }

  const pollId = Number(pollIdValue);
  const poll = state.polls.find((item) => item.id === pollId);
  if (!poll) return;

  dom.voteRecordsList.className = "record-list empty-state";
  dom.voteRecordsList.textContent = "讀取投票紀錄中...";

  let records = [];
  try {
    records = await getVoteRecordsFromContract(pollId);
  } catch {
    records = await getVoteRecordsFromEvents(pollId);
  }

  if (records.length === 0) {
    dom.voteRecordsList.className = "record-list empty-state";
    dom.voteRecordsList.textContent = "目前沒有投票紀錄。";
    return;
  }

  dom.voteRecordsList.className = "record-list";
  dom.voteRecordsList.innerHTML = records
    .map((record) => {
      const optionName = poll.options[record.optionIndex] || `選項 ${record.optionIndex + 1}`;
      return `
        <div class="record-row">
          <span><strong>錢包</strong><br>${shortAddress(record.voter)}</span>
          <span><strong>選項</strong><br>${escapeHtml(optionName)}</span>
          <span><strong>票權</strong><br>${formatToken(record.voteWeight)} MVT</span>
        </div>
      `;
    })
    .join("");
}

async function getVoteRecordsFromContract(pollId) {
  const records = await state.voting.getVoterRecords(pollId);
  return records.voters.map((voter, index) => ({
    voter,
    optionIndex: Number(records.optionIndices[index]),
    voteWeight: records.voteWeights[index]
  }));
}

async function getVoteRecordsFromEvents(pollId) {
  const filter = state.voting.filters.Voted(pollId);
  const events = await state.voting.queryFilter(filter, 0, "latest");
  return events.map((event) => ({
    voter: event.args.voter,
    optionIndex: Number(event.args.optionIndex),
    voteWeight: event.args.voteWeight
  }));
}

async function addTokenToMetaMask() {
  try {
    if (!window.ethereum) {
      showToast("請先安裝 MetaMask。", "error");
      return;
    }

    ensureConfig();

    const provider = state.provider || new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (config.chainId && Number(network.chainId) !== Number(config.chainId)) {
      showToast(`請先把 MetaMask 切到 Chain ID ${config.chainId}，目前是 ${network.chainId}。`, "warning");
      return;
    }

    const added = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: config.tokenAddress,
          symbol: "MVT",
          decimals: 18
        }
      }
    });

    if (added) {
      showToast("MVT 已加入 MetaMask。", "success");
    } else {
      showToast("你取消了加入 MVT。", "warning");
    }
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  }
}

function ensureConfig() {
  if (!config.tokenAddress || !config.votingAddress) {
    throw new Error("尚未設定合約地址，請先執行部署腳本產生 frontend/config.js。");
  }
}

function ensureConnected() {
  ensureConfig();
  if (!state.signer || !state.token || !state.voting) {
    throw new Error("請先連接 MetaMask 錢包。");
  }
}

function ensureAdmin() {
  if (!isOwner()) {
    throw new Error("沒有權限。");
  }
}

function loadHiddenPollIds() {
  try {
    const configuredIds = Array.isArray(config.hiddenPollIds) ? config.hiddenPollIds : [];
    const storedValue = window.localStorage.getItem(hiddenPollStorageKey());
    const ids = storedValue ? JSON.parse(storedValue) : [];
    return new Set([...configuredIds, ...ids].map((id) => Number(id)));
  } catch {
    const configuredIds = Array.isArray(config.hiddenPollIds) ? config.hiddenPollIds : [];
    return new Set(configuredIds.map((id) => Number(id)));
  }
}

function saveHiddenPollIds() {
  window.localStorage.setItem(
    hiddenPollStorageKey(),
    JSON.stringify([...state.hiddenPollIds])
  );
}

function hiddenPollStorageKey() {
  return `mini-dao-hidden-polls:${config.chainId}:${config.votingAddress?.toLowerCase()}`;
}

async function assertContractsExist() {
  const network = await state.provider.getNetwork();

  if (config.chainId && Number(network.chainId) !== Number(config.chainId)) {
    throw new Error(`WRONG_NETWORK:${network.chainId}:${config.chainId}`);
  }

  const [tokenCode, votingCode] = await Promise.all([
    state.provider.getCode(config.tokenAddress),
    state.provider.getCode(config.votingAddress)
  ]);

  if (tokenCode === "0x" || votingCode === "0x") {
    throw new Error("CONTRACT_NOT_FOUND");
  }
}

function isOwner() {
  return state.account && state.owner && state.account.toLowerCase() === state.owner.toLowerCase();
}

function showLoading(text) {
  dom.loadingText.textContent = text;
  dom.loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  dom.loadingOverlay.classList.add("hidden");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5200);
}

function toFriendlyError(error) {
  const raw = [
    error?.reason,
    error?.shortMessage,
    error?.info?.error?.message,
    error?.message
  ]
    .filter(Boolean)
    .join(" | ");

  if (error?.code === "ACTION_REJECTED" || raw.includes("user rejected")) return "你已取消交易。";
  if (raw.includes("already voted")) return "這個錢包已經投過此投票，不能重複投票。";
  if (raw.includes("no voting power")) return "你沒有 MVT 代幣，無法投票。";
  if (raw.includes("poll is closed")) return "投票已結束，不能再投票。";
  if (raw.includes("Ownable")) return "沒有權限。";
  if (raw.includes("WRONG_NETWORK")) {
    const [, currentChainId, expectedChainId] = raw.match(/WRONG_NETWORK:(\d+):(\d+)/) || [];
    return `MetaMask 目前 Chain ID 是 ${currentChainId || "未知"}，但此網站設定需要 Chain ID ${expectedChainId || config.chainId}。請切換到正確網路後再連線。`;
  }
  if (raw.includes("CONTRACT_NOT_FOUND")) {
    return "目前網路找不到合約。請確認 Hardhat node 已啟動並重新部署，或把 config.js 改成 Sepolia 合約地址。";
  }
  if (raw.includes("could not decode result data")) return "目前地址沒有可讀取的合約資料，通常是合約尚未部署到此網路或 MetaMask 連錯網路。";
  if (raw.includes("insufficient funds")) return "ETH Gas 費不足，請確認錢包餘額。";
  if (raw.includes("could not coalesce error")) return "RPC 或網路發生錯誤，請確認 Hardhat node 與 MetaMask 網路。";
  if (raw.includes("network changed")) return "MetaMask 網路已切換，請重新連線。";
  if (raw.includes("missing revert data")) return "交易失敗，請確認網路、合約地址與輸入資料。";
  if (raw) return raw;
  return "發生未知錯誤，請稍後再試。";
}

function formatToken(value) {
  const formatted = ethers.formatEther(value);
  const [whole, decimal = ""] = formatted.split(".");
  const trimmed = decimal.slice(0, 4).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function shortAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortHash(hash) {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function debounce(callback, waitMs) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), waitMs);
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
