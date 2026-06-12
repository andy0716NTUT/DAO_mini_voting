const TOKEN_ABI = [
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Transfer", type: "event" }
];

const VOTING_ABI = [
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pollCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }, { name: "voter", type: "address" }], name: "hasVoted", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "title", type: "string" }, { name: "description", type: "string" }, { name: "options", type: "string[]" }, { name: "endTime", type: "uint256" }, { name: "resultsVisibleBeforeClose", type: "bool" }, { name: "minVote", type: "uint256" }, { name: "maxVote", type: "uint256" }], name: "createPoll", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }, { name: "optionIndices", type: "uint256[]" }, { name: "voteWeights", type: "uint256[]" }], name: "vote", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "closePoll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "deletePoll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "isPollClosed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "getPoll", outputs: [{ name: "id", type: "uint256" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "options", type: "string[]" }, { name: "voteCounts", type: "uint256[]" }, { name: "isClosed", type: "bool" }, { name: "totalVotes", type: "uint256" }, { name: "createdAt", type: "uint256" }, { name: "endTime", type: "uint256" }, { name: "resultsVisibleBeforeClose", type: "bool" }, { name: "minVote", type: "uint256" }, { name: "maxVote", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "pollId", type: "uint256" }], name: "getVoterRecords", outputs: [{ name: "voters", type: "address[]" }, { name: "optionIndices", type: "uint256[]" }, { name: "voteWeights", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "pollId", type: "uint256" }, { indexed: false, name: "title", type: "string" }, { indexed: false, name: "endTime", type: "uint256" }, { indexed: false, name: "resultsVisibleBeforeClose", type: "bool" }, { indexed: false, name: "minVote", type: "uint256" }, { indexed: false, name: "maxVote", type: "uint256" }], name: "PollCreated", type: "event" },
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
  pollFilter: "all",
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
  pollEndTime: document.getElementById("pollEndTime"),
  pollMinVote: document.getElementById("pollMinVote"),
  pollMaxVote: document.getElementById("pollMaxVote"),
  resultsVisibleBeforeClose: document.getElementById("resultsVisibleBeforeClose"),
  pollOptions: document.getElementById("pollOptions"),
  addOptionBtn: document.getElementById("addOptionBtn"),
  transferForm: document.getElementById("transferForm"),
  refreshPollsBtn: document.getElementById("refreshPollsBtn"),
  pollFilters: document.getElementById("pollFilters"),
  pollList: document.getElementById("pollList"),
  votePanel: document.getElementById("votePanel"),
  resultPanel: document.getElementById("resultPanel"),
  selectedPollHint: document.getElementById("selectedPollHint"),
  myVoteRecordsList: document.getElementById("myVoteRecordsList"),
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
  setDefaultPollEndTime();
  renderOptionInputs(["", ""]);
  bindEvents();
}

function bindEvents() {
  dom.connectWalletBtn.addEventListener("click", connectWallet);
  dom.adminPageBtn.addEventListener("click", openAdminPage);
  dom.addTokenBtn.addEventListener("click", addTokenToMetaMask);
  dom.refreshPollsBtn.addEventListener("click", loadPolls);
  dom.createPollForm.addEventListener("submit", createPoll);
  dom.addOptionBtn.addEventListener("click", addPollOptionInput);
  dom.transferForm.addEventListener("submit", transferToken);
  dom.adminCloseBtn.addEventListener("click", () => dom.adminSection.classList.add("hidden"));
  dom.mintForm.addEventListener("submit", mintTokens);
  dom.deletePollBtn.addEventListener("click", deleteClosedPoll);
  dom.refreshRecordsBtn.addEventListener("click", () => loadAdminVoteRecords());
  dom.adminRecordPollSelect.addEventListener("change", () => loadAdminVoteRecords());
  dom.pollFilters.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-btn");
    if (!button) return;
    state.pollFilter = button.dataset.filter;
    renderPollList();
  });

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
    dom.contractAddresses.textContent = "請先部署合約並更新 frontend/config.js";
    return;
  }

  dom.contractStatus.textContent = `已設定 ${config.networkName || "鏈上"} 合約`;
  dom.contractAddresses.textContent = `MVT ${shortAddress(config.tokenAddress)} / Voting ${shortAddress(config.votingAddress)}`;
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      showToast("請先安裝 MetaMask。", "error");
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
    showToast("錢包連接成功。", "success");
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
    showToast(`目前 Chain ID 是 ${network.chainId}，此網站設定需要 ${config.chainId}。`, "warning");
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
    if (showLoader) showLoading("讀取投票列表...");

    const count = Number(await state.voting.pollCount());
    const polls = [];

    for (let i = 0; i < count; i++) {
      try {
        const poll = normalizePoll(await state.voting.getPoll(i));
        if (!state.hiddenPollIds.has(poll.id)) {
          poll.hasCurrentUserVoted = await state.voting.hasVoted(poll.id, state.account).catch(() => false);
          polls.push(poll);
        }
      } catch {
        // Deleted polls revert from getPoll; skip them in the UI.
      }
    }

    state.polls = polls;
    renderPollList();
    updateAdminPollSelectors();
    await renderMyVoteRecords();

    const sharedPollId = readSharedPollId();
    if (sharedPollId !== null && state.polls.some((poll) => poll.id === sharedPollId)) {
      selectPoll(sharedPollId);
    } else if (state.selectedPollId !== null && state.polls.some((poll) => poll.id === state.selectedPollId)) {
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
    isClosed: Boolean(poll[5]),
    totalVotes: poll[6],
    createdAt: Number(poll[7] || 0),
    endTime: Number(poll[8] || 0),
    resultsVisibleBeforeClose: Boolean(poll[9]),
    minVote: poll[10],
    maxVote: poll[11],
    hasCurrentUserVoted: false
  };
}

function renderPollList() {
  updateFilterTabs();
  const visiblePolls = getFilteredPolls();

  if (visiblePolls.length === 0) {
    dom.pollList.innerHTML = `<div class="empty-state">目前沒有符合篩選條件的投票。</div>`;
    return;
  }

  dom.pollList.innerHTML = visiblePolls
    .map((poll) => {
      const active = poll.id === state.selectedPollId ? "active" : "";
      const statusClass = poll.isClosed ? "closed" : "open";
      const statusText = poll.isClosed ? "已結束" : "進行中";
      const endText = poll.endTime ? formatDateTime(poll.endTime) : "未設定";
      return `
        <button class="poll-card ${active}" type="button" data-poll-id="${poll.id}">
          <h3>${escapeHtml(poll.title)}</h3>
          <p>${escapeHtml(poll.description)}</p>
          <div class="poll-meta">
            <span class="pill ${statusClass}">${statusText}</span>
            <span class="pill">投票 #${poll.id}</span>
            <span class="pill">截止 ${endText}</span>
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

function getFilteredPolls() {
  if (state.pollFilter === "open") return state.polls.filter((poll) => !poll.isClosed);
  if (state.pollFilter === "closed") return state.polls.filter((poll) => poll.isClosed);
  if (state.pollFilter === "voted") return state.polls.filter((poll) => poll.hasCurrentUserVoted);
  return state.polls;
}

function updateFilterTabs() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.pollFilter);
  });
}

async function selectPoll(pollId) {
  state.selectedPollId = pollId;
  const poll = state.polls.find((item) => item.id === pollId);
  if (!poll) return;

  updatePollQueryParam(pollId);
  renderPollList();
  dom.selectedPollHint.textContent = `投票 #${poll.id}｜${poll.isClosed ? "已結束" : "可投票"}｜截止 ${formatDateTime(poll.endTime)}`;

  let alreadyVoted = false;
  try {
    alreadyVoted = state.account ? await state.voting.hasVoted(poll.id, state.account) : false;
    poll.hasCurrentUserVoted = alreadyVoted;
  } catch {
    alreadyVoted = false;
  }

  renderVotePanel(poll, alreadyVoted);
  renderResultPanel(poll);
}

function renderVotePanel(poll, alreadyVoted) {
  const disabled = poll.isClosed || alreadyVoted;
  
  let limitDesc = "可分配 MVT 到一個或多個選項";
  if (poll.minVote > 0n || poll.maxVote > 0n) {
    const minText = poll.minVote > 0n ? `最低限制 ${formatToken(poll.minVote)} MVT` : "";
    const maxText = poll.maxVote > 0n ? `最高限制 ${formatToken(poll.maxVote)} MVT` : "";
    const limits = [minText, maxText].filter(Boolean).join("，");
    limitDesc = `請分配 MVT 到一個或多個選項（此投票設有金額限制：${limits}）`;
  }

  const reason = poll.isClosed ? "投票已結束" : alreadyVoted ? "你已經投過票" : limitDesc;
  const closeButton = isOwner()
    ? `<button class="danger-btn full-btn" type="button" id="closePollBtn" ${poll.isClosed ? "disabled" : ""}>關閉投票</button>`
    : "";

  dom.votePanel.innerHTML = `
    ${poll.options
      .map((option, index) => `
        <div class="vote-option">
          <strong>${escapeHtml(option)}</strong>
          <div class="vote-action">
            <input class="vote-amount-input" type="number" min="0" step="0.0001" placeholder="票數 MVT" data-option-index="${index}" ${disabled ? "disabled" : ""} />
          </div>
        </div>
      `)
      .join("")}
    <button class="primary-btn full-btn" type="button" id="submitVoteBtn" ${disabled ? "disabled" : ""}>送出投票</button>
    <div class="share-row">
      <button class="ghost-btn" type="button" id="copyPollLinkBtn">複製連結</button>
      <button class="ghost-btn" type="button" id="sharePollBtn">分享投票</button>
    </div>
    <div class="empty-state">${reason}</div>
    ${closeButton}
  `;

  document.getElementById("submitVoteBtn")?.addEventListener("click", vote);
  document.getElementById("copyPollLinkBtn")?.addEventListener("click", copySelectedPollLink);
  document.getElementById("sharePollBtn")?.addEventListener("click", shareSelectedPoll);

  const closePollBtn = document.getElementById("closePollBtn");
  if (closePollBtn) {
    closePollBtn.addEventListener("click", closeSelectedPoll);
  }
}

function renderResultPanel(poll) {
  if (!poll.resultsVisibleBeforeClose && !poll.isClosed && !isOwner()) {
    dom.resultPanel.innerHTML = `<div class="empty-state">此投票設定為結束後才公開結果。</div>`;
    return;
  }

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
  dom.myVoteRecordsList.className = "record-list empty-state";
  dom.myVoteRecordsList.textContent = "目前沒有投票紀錄。";
}

async function createPoll(event) {
  event.preventDefault();

  try {
    ensureConnected();
    const title = document.getElementById("pollTitle").value.trim();
    const description = document.getElementById("pollDescription").value.trim();
    const options = getPollOptionValues();
    const endTime = Math.floor(new Date(dom.pollEndTime.value).getTime() / 1000);
    const resultsVisibleBeforeClose = dom.resultsVisibleBeforeClose.checked;

    const minVoteVal = dom.pollMinVote ? dom.pollMinVote.value.trim() : "0";
    const maxVoteVal = dom.pollMaxVote ? dom.pollMaxVote.value.trim() : "0";
    const minVote = ethers.parseEther(minVoteVal || "0");
    const maxVote = ethers.parseEther(maxVoteVal || "0");

    if (options.length < 2) {
      showToast("請至少填寫 2 個選項。", "warning");
      return;
    }

    if (options.length > 10) {
      showToast("最多只能建立 10 個選項。", "warning");
      return;
    }

    if (!endTime || endTime <= Math.floor(Date.now() / 1000)) {
      showToast("截止時間必須晚於現在。", "warning");
      return;
    }

    if (maxVote > 0n && maxVote < minVote) {
      showToast("最高投票限制不能小於最低限制。", "warning");
      return;
    }

    showLoading("建立投票交易送出中...");
    const tx = await state.voting.createPoll(title, description, options, endTime, resultsVisibleBeforeClose, minVote, maxVote);
    showToast(`交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    dom.createPollForm.reset();
    setDefaultPollEndTime();
    renderOptionInputs(["", ""]);
    showToast("投票建立成功。", "success");
    await loadPolls();
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

async function vote() {
  try {
    ensureConnected();
    if (state.selectedPollId === null) return;

    const allocations = getVoteAllocations();
    if (allocations.optionIndices.length === 0) {
      showToast("請至少在一個選項輸入大於 0 的票數。", "warning");
      return;
    }

    const totalWeight = allocations.voteWeights.reduce((sum, value) => sum + value, 0n);
    const balance = await state.token.balanceOf(state.account);
    if (balance === 0n) {
      showToast("你的 MVT 餘額不足，無法投票。", "warning");
      return;
    }

    if (totalWeight > balance) {
      showToast(`投票票數不能超過你的 MVT 餘額：${formatToken(balance)} MVT。`, "warning");
      return;
    }

    const poll = state.polls.find((item) => item.id === state.selectedPollId);
    if (poll) {
      if (poll.minVote > 0n && totalWeight < poll.minVote) {
        showToast(`投票總票數低於最低限制：${formatToken(poll.minVote)} MVT。`, "warning");
        return;
      }
      if (poll.maxVote > 0n && totalWeight > poll.maxVote) {
        showToast(`投票總票數高於最高限制：${formatToken(poll.maxVote)} MVT。`, "warning");
        return;
      }
    }

    const allowance = await state.token.allowance(state.account, config.votingAddress);
    if (allowance < totalWeight) {
      showLoading("授權 Voting 合約扣除 MVT...");
      const approveTx = await state.token.approve(config.votingAddress, totalWeight);
      showToast(`授權交易已送出：${shortHash(approveTx.hash)}`, "success");
      showLoading("等待授權確認...");
      await approveTx.wait();
    }

    showLoading("投票交易送出中...");
    const tx = await state.voting.vote(state.selectedPollId, allocations.optionIndices, allocations.voteWeights);
    showToast(`投票交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    showToast("投票成功，MVT 已從錢包扣除。", "success");
    await refreshWalletInfo();
    await loadPolls();
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

function getVoteAllocations() {
  const optionIndices = [];
  const voteWeights = [];

  document.querySelectorAll(".vote-amount-input").forEach((input) => {
    const amount = input.value.trim();
    if (!amount || Number(amount) <= 0) return;

    optionIndices.push(Number(input.dataset.optionIndex));
    voteWeights.push(ethers.parseEther(amount));
  });

  return { optionIndices, voteWeights };
}

async function closeSelectedPoll() {
  try {
    ensureConnected();
    if (state.selectedPollId === null) return;

    showLoading("關閉投票交易送出中...");
    const tx = await state.voting.closePoll(state.selectedPollId);
    showToast(`關閉交易已送出：${shortHash(tx.hash)}`, "success");

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
      showToast("MVT 餘額不足。", "warning");
      return;
    }

    showLoading("轉帳交易送出中...");
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

// 開啟管理者介面並載入管理者相關選單與投票記錄
async function openAdminPage() {
  try {
    ensureConnected();

    // 再次確認當前錢包帳戶是否為合約所有者 (Owner)
    if (!isOwner()) {
      dom.adminSection.classList.add("hidden");
      showToast("沒有權限。", "error");
      return;
    }

    dom.adminSection.classList.remove("hidden");
    updateAdminStatus();
    updateAdminPollSelectors();
    await loadAdminVoteRecords();
    // 平滑捲動畫面至管理者面板
    dom.adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  }
}

// 在管理者面板更新目前的驗證狀態文字
function updateAdminStatus() {
  if (!state.account) {
    dom.adminAuthStatus.textContent = "請先連接錢包。";
    return;
  }

  dom.adminAuthStatus.textContent = isOwner()
    ? `驗證成功：${shortAddress(state.account)}`
    : "驗證失敗。";
}

// 更新管理者下拉式選單 (可用於刪除選單與查詢記錄選單)
function updateAdminPollSelectors() {
  const recordOptions = state.polls
    .map((poll) => `<option value="${poll.id}">#${poll.id} ${escapeHtml(poll.title)}</option>`)
    .join("");
  const closedOptions = state.polls
    .filter((poll) => poll.isClosed)
    .map((poll) => `<option value="${poll.id}">#${poll.id} ${escapeHtml(poll.title)}</option>`)
    .join("");

  dom.adminRecordPollSelect.innerHTML = recordOptions || `<option value="">沒有可查看的投票</option>`;
  dom.adminDeletePollSelect.innerHTML = closedOptions || `<option value="">沒有已結束投票</option>`;
  dom.deletePollBtn.disabled = !closedOptions;
  dom.refreshRecordsBtn.disabled = !recordOptions;
}

// 發行代幣 (Mint)：向指定地址鑄造新的 MVT 代幣 (限合約 Owner 呼叫)
async function mintTokens(event) {
  event.preventDefault();

  try {
    ensureConnected();
    ensureAdmin();

    // 檢查代幣合約的擁有者是否與當前錢包一致
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
    // 呼叫 ERC-20 代幣合約進行 mint
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

// 軟刪除已結束投票：標記 isDeleted，從前台列表中過濾掉 (限合約 Owner 呼叫)
async function deleteClosedPoll() {
  try {
    ensureConnected();
    ensureAdmin();

    const pollIdValue = dom.adminDeletePollSelect.value;
    if (pollIdValue === "") {
      showToast("目前沒有可刪除的已結束投票。", "warning");
      return;
    }

    const pollId = Number(pollIdValue);

    showLoading("刪除投票交易送出中...");
    const tx = await state.voting.deletePoll(pollId);
    showToast(`刪除交易已送出：${shortHash(tx.hash)}`, "success");

    showLoading("等待區塊確認...");
    await tx.wait();

    if (state.selectedPollId === pollId) {
      state.selectedPollId = null;
    }

    showToast("已刪除投票，網站列表會略過此投票。", "success");
    await loadPolls(false);
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  } finally {
    hideLoading();
  }
}

// 渲染「我的投票記錄」區塊，向合約查詢當前錢包的歷史投票並列表
async function renderMyVoteRecords() {
  if (!state.voting || !state.account) return;

  const rows = [];
  // 遍歷所有載入的投票，篩選出當前帳號投過的
  for (const poll of state.polls) {
    if (!poll.hasCurrentUserVoted) continue;
    const records = await getVoteRecordsFromContract(poll.id).catch(() => []);
    const myRecords = records.filter((record) => record.voter.toLowerCase() === state.account.toLowerCase());

    myRecords.forEach((record) => {
      rows.push({ poll, record });
    });
  }

  if (rows.length === 0) {
    dom.myVoteRecordsList.className = "record-list empty-state";
    dom.myVoteRecordsList.textContent = "目前沒有投票紀錄。";
    return;
  }

  dom.myVoteRecordsList.className = "record-list";
  dom.myVoteRecordsList.innerHTML = rows
    .map(({ poll, record }) => {
      const optionName = poll.options[record.optionIndex] || `選項 ${record.optionIndex + 1}`;
      return `
        <div class="record-row">
          <span><strong>投票</strong><br>#${poll.id} ${escapeHtml(poll.title)}</span>
          <span><strong>選項</strong><br>${escapeHtml(optionName)}</span>
          <span><strong>票數</strong><br>${formatToken(record.voteWeight)} MVT</span>
        </div>
      `;
    })
    .join("");
}

// 管理者功能：載入並在列表渲染所選投票活動的所有選民投票記錄明細
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
    // 優先從合約 getter 函數載入明細
    records = await getVoteRecordsFromContract(pollId);
  } catch {
    // 若節點不支援直接呼叫，則退回透過 event log 查詢
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
          <span><strong>票數</strong><br>${formatToken(record.voteWeight)} MVT</span>
        </div>
      `;
    })
    .join("");
}

// 從投票合約調用 getVoterRecords 取回所有投票清單
async function getVoteRecordsFromContract(pollId) {
  const records = await state.voting.getVoterRecords(pollId);
  return records.voters.map((voter, index) => ({
    voter,
    optionIndex: Number(records.optionIndices[index]),
    voteWeight: records.voteWeights[index]
  }));
}

// 透過以太坊節點 queryFilter 過濾 Voted 事件歷史，拼裝出投票明細 (當合約陣列太長時的備用手段)
async function getVoteRecordsFromEvents(pollId) {
  const filter = state.voting.filters.Voted(pollId);
  const events = await state.voting.queryFilter(filter, 0, "latest");
  return events.map((event) => ({
    voter: event.args.voter,
    optionIndex: Number(event.args.optionIndex),
    voteWeight: event.args.voteWeight
  }));
}

// 調用 MetaMask 的 wallet_watchAsset 介面，將 MVT 治理代幣的圖標、符號與地址加入到錢包中
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
      showToast(`請先切換到 Chain ID ${config.chainId}。`, "warning");
      return;
    }

    // 發送錢包加入代幣請求
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

    showToast(added ? "MVT 已加入 MetaMask。" : "你取消了加入 MVT。", added ? "success" : "warning");
  } catch (error) {
    showToast(toFriendlyError(error), "error");
  }
}

// 設定建立投票頁面的截止時間預設值 (明天此刻)
function setDefaultPollEndTime() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setSeconds(0, 0);
  dom.pollEndTime.value = toDateTimeLocalValue(tomorrow);
}

// 在 DOM 中動態渲染建立投票所需的選項輸入欄位
function renderOptionInputs(values = []) {
  const normalizedValues = values.length >= 2 ? values : ["", ""];

  dom.pollOptions.innerHTML = normalizedValues
    .map((value, index) => `
      <div class="option-row">
        <label>選項 ${index + 1}
          <input class="poll-option" type="text" placeholder="${index === 0 ? "火鍋" : index === 1 ? "燒肉" : "新選項"}" value="${escapeHtml(value)}" required />
        </label>
        <button class="icon-btn remove-option-btn" type="button" title="移除選項" aria-label="移除選項" ${normalizedValues.length <= 2 ? "disabled" : ""}>×</button>
      </div>
    `)
    .join("");

  document.querySelectorAll(".remove-option-btn").forEach((button, index) => {
    button.addEventListener("click", () => removePollOptionInput(index));
  });

  dom.addOptionBtn.disabled = normalizedValues.length >= 10;
}

// 新增一個選項輸入欄位
function addPollOptionInput() {
  const values = getPollOptionValues(false);
  if (values.length >= 10) {
    showToast("最多只能建立 10 個選項。", "warning");
    return;
  }

  renderOptionInputs([...values, ""]);
}

// 移除一個選項輸入欄位
function removePollOptionInput(indexToRemove) {
  const values = getPollOptionValues(false);
  if (values.length <= 2) {
    showToast("至少需要 2 個選項。", "warning");
    return;
  }

  renderOptionInputs(values.filter((_, index) => index !== indexToRemove));
}

// 獲取目前輸入的所有選項字串陣列
function getPollOptionValues(trimEmpty = true) {
  const values = [...document.querySelectorAll(".poll-option")].map((input) => input.value.trim());
  return trimEmpty ? values.filter(Boolean) : values;
}

function copySelectedPollLink() {
  navigator.clipboard.writeText(buildPollUrl(state.selectedPollId))
    .then(() => showToast("投票連結已複製。", "success"))
    .catch(() => showToast("無法複製連結。", "error"));
}

async function shareSelectedPoll() {
  const poll = state.polls.find((item) => item.id === state.selectedPollId);
  const url = buildPollUrl(state.selectedPollId);

  if (navigator.share && poll) {
    await navigator.share({ title: poll.title, text: poll.description, url }).catch(() => {});
    return;
  }

  await navigator.clipboard.writeText(url);
  showToast("瀏覽器不支援分享，已改為複製連結。", "success");
}

function buildPollUrl(pollId) {
  const url = new URL(window.location.href);
  url.searchParams.set("poll", String(pollId));
  return url.toString();
}

function readSharedPollId() {
  const value = new URLSearchParams(window.location.search).get("poll");
  if (value === null) return null;
  const pollId = Number(value);
  return Number.isInteger(pollId) && pollId >= 0 ? pollId : null;
}

function updatePollQueryParam(pollId) {
  const url = new URL(window.location.href);
  url.searchParams.set("poll", String(pollId));
  window.history.replaceState({}, "", url);
}

function ensureConfig() {
  if (!config.tokenAddress || !config.votingAddress) {
    throw new Error("尚未設定合約地址，請更新 frontend/config.js。");
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
  if (raw.includes("vote required") || raw.includes("vote weight required")) return "請輸入大於 0 的投票票數。";
  if (raw.includes("duplicate option")) return "同一個選項只能填一筆票數。";
  if (raw.includes("length mismatch")) return "投票選項和票數資料不一致。";
  if (raw.includes("insufficient voting power")) return "投票票數不能超過你的 MVT 餘額。";
  if (raw.includes("token transfer failed") || raw.includes("ERC20InsufficientAllowance")) return "MVT 授權或扣款失敗，請重新授權後再試。";
  if (raw.includes("no voting power")) return "你沒有 MVT 代幣，無法投票。";
  if (raw.includes("poll is closed")) return "投票已結束，不能再投票。";
  if (raw.includes("end time must be future")) return "截止時間必須晚於現在。";
  if (raw.includes("close poll first")) return "請先關閉投票或等待截止，再刪除。";
  if (raw.includes("poll deleted")) return "這個投票已被刪除。";
  if (raw.includes("Ownable")) return "沒有權限。";
  if (raw.includes("vote weight below minimum limit")) return "投票總票數低於此投票規定的最低票數限制。";
  if (raw.includes("vote weight exceeds maximum limit")) return "投票總票數已超過此投票規定的最高票數限制。";
  if (raw.includes("invalid min/max vote limits")) return "最高投票限制不能低於最低投票限制。";
  if (raw.includes("WRONG_NETWORK")) {
    const [, currentChainId, expectedChainId] = raw.match(/WRONG_NETWORK:(\d+):(\d+)/) || [];
    return `MetaMask 目前 Chain ID 是 ${currentChainId || "未知"}，但此網站設定需要 Chain ID ${expectedChainId || config.chainId}。`;
  }
  if (raw.includes("CONTRACT_NOT_FOUND")) return "目前網路找不到設定的合約，請檢查 frontend/config.js 和 MetaMask 網路。";
  if (raw.includes("insufficient funds")) return "ETH Gas 餘額不足。";
  if (raw) return raw;
  return "發生未知錯誤，請稍後再試。";
}

function formatToken(value) {
  const formatted = ethers.formatEther(value);
  const [whole, decimal = ""] = formatted.split(".");
  const trimmed = decimal.slice(0, 4).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp * 1000).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateTimeLocalValue(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
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
