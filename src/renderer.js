const urlInput = document.getElementById("url");
const mp3Checkbox = document.getElementById("mp3");
const downloadBtn = document.getElementById("download");
const inlineError = document.getElementById("inlineError");

const saveDirEl = document.getElementById("saveDir");
const changeDirBtn = document.getElementById("changeDir");

const overlay = document.getElementById("overlay");
const dialogIcon = document.getElementById("dialogIcon");
const dialogTitle = document.getElementById("dialogTitle");
const dialogSubtitle = document.getElementById("dialogSubtitle");
const progressTrack = document.querySelector("#overlay .progress-track");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const progressSpeed = document.getElementById("progressSpeed");
const dialogFolder = document.getElementById("dialogFolder");
const folderPathEl = document.getElementById("folderPath");
const dialogCancel = document.getElementById("dialogCancel");
const dialogOpenFolder = document.getElementById("dialogOpenFolder");
const dialogClose = document.getElementById("dialogClose");

const ICONS = {
  success:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4.5 4.5L19 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

let lastResult = null;

// ---------- Window controls ----------

document.getElementById("winMin").addEventListener("click", () => window.yousave.minimize());
document.getElementById("winClose").addEventListener("click", () => window.yousave.close());

// ---------- Save folder setting ----------

function showFolderText(el, fullPath) {
  el.textContent = fullPath;
  el.title = fullPath;
}

async function loadSettings() {
  const { downloadDir } = await window.yousave.getSettings();
  showFolderText(saveDirEl, downloadDir);
}

changeDirBtn.addEventListener("click", async () => {
  const result = await window.yousave.chooseFolder();
  if (!result.canceled) showFolderText(saveDirEl, result.downloadDir);
});

loadSettings();

// ---------- Inline validation ----------

function setInlineError(message) {
  if (!message) {
    inlineError.textContent = "";
    inlineError.classList.remove("show");
    return;
  }
  inlineError.textContent = message;
  inlineError.classList.add("show");
}

// ---------- Download dialog ----------

function setDialogState(state) {
  dialogIcon.className = "dialog-icon";
  if (state === "loading") {
    dialogIcon.innerHTML = '<div class="spinner"></div>';
  } else {
    dialogIcon.classList.add(state);
    dialogIcon.innerHTML = ICONS[state];
  }
}

function resetDialog(videoUrl) {
  setDialogState("loading");
  dialogTitle.textContent = "Preparando download…";
  dialogSubtitle.textContent = videoUrl;
  progressTrack.classList.remove("hidden");
  progressFill.style.width = "0%";
  progressPercent.textContent = "0%";
  progressSpeed.textContent = "";
  dialogFolder.classList.remove("show");
  dialogCancel.classList.remove("hidden");
  dialogOpenFolder.classList.add("hidden");
  dialogClose.classList.add("hidden");
  overlay.classList.add("show");
}

function closeDialog() {
  overlay.classList.remove("show");
}

window.yousave.onDownloadInfo(({ title }) => {
  if (title) dialogTitle.textContent = title;
  dialogSubtitle.textContent = "Baixando…";
});

window.yousave.onDownloadProgress(({ percent, speed }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  progressFill.style.width = `${clamped}%`;
  progressPercent.textContent = `${clamped.toFixed(0)}%`;
  progressSpeed.textContent = speed || "";
  dialogSubtitle.textContent = "Baixando…";
});

dialogCancel.addEventListener("click", async () => {
  await window.yousave.cancelDownload();
});

dialogOpenFolder.addEventListener("click", () => {
  if (lastResult?.filePath) window.yousave.showInFolder(lastResult.filePath);
});

dialogClose.addEventListener("click", () => closeDialog());

downloadBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setInlineError("Cole um link do YouTube antes de baixar.");
    return;
  }
  setInlineError(null);

  resetDialog(url);

  const result = await window.yousave.download({ url, mp3: mp3Checkbox.checked });
  lastResult = result;

  if (result.ok) {
    setDialogState("success");
    dialogTitle.textContent = "Download concluído!";
    dialogSubtitle.textContent = "";
    progressFill.style.width = "100%";
    progressPercent.textContent = "100%";
    progressSpeed.textContent = "";
    showFolderText(folderPathEl, result.folder);
    dialogFolder.classList.add("show");
    dialogCancel.classList.add("hidden");
    dialogOpenFolder.classList.remove("hidden");
    dialogClose.classList.remove("hidden");
    urlInput.value = "";
  } else {
    setDialogState("error");
    dialogTitle.textContent = result.canceled ? "Download cancelado" : "Falha no download";
    dialogSubtitle.textContent = result.error || "";
    progressTrack.classList.add("hidden");
    progressPercent.textContent = "";
    progressSpeed.textContent = "";
    dialogCancel.classList.add("hidden");
    dialogClose.classList.remove("hidden");
  }
});

dialogFolder.addEventListener("click", () => {
  if (lastResult?.filePath) window.yousave.showInFolder(lastResult.filePath);
});

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") downloadBtn.click();
});

// ---------- Auto update ----------

const updateOverlay = document.getElementById("updateOverlay");
const updateIcon = document.getElementById("updateIcon");
const updateTitle = document.getElementById("updateTitle");
const updateSubtitle = document.getElementById("updateSubtitle");
const updateProgressFill = document.getElementById("updateProgressFill");
const updateProgressPercent = document.getElementById("updateProgressPercent");
const updateActions = document.getElementById("updateActions");
const updateDismiss = document.getElementById("updateDismiss");

updateDismiss.addEventListener("click", () => updateOverlay.classList.remove("show"));

window.yousave.onUpdateStatus(({ state, version, message }) => {
  if (state === "available") {
    updateIcon.className = "dialog-icon";
    updateIcon.innerHTML = '<div class="spinner"></div>';
    updateTitle.textContent = `Atualizando para v${version}`;
    updateSubtitle.textContent = "Baixando atualização…";
    updateProgressFill.style.width = "0%";
    updateProgressPercent.textContent = "0%";
    updateActions.classList.add("hidden");
    updateOverlay.classList.add("show");
  } else if (state === "downloaded") {
    updateIcon.className = "dialog-icon success";
    updateIcon.innerHTML = ICONS.success;
    updateTitle.textContent = "Atualização concluída!";
    updateSubtitle.textContent = "Reiniciando o YouSave…";
    updateProgressFill.style.width = "100%";
    updateProgressPercent.textContent = "100%";
  } else if (state === "error") {
    updateIcon.className = "dialog-icon error";
    updateIcon.innerHTML = ICONS.error;
    updateTitle.textContent = "Não foi possível atualizar";
    updateSubtitle.textContent = message || "Tente novamente mais tarde.";
    updateActions.classList.remove("hidden");
  }
});

window.yousave.onUpdateProgress(({ percent }) => {
  const clamped = Math.max(0, Math.min(100, percent || 0));
  updateProgressFill.style.width = `${clamped}%`;
  updateProgressPercent.textContent = `${clamped.toFixed(0)}%`;
});
