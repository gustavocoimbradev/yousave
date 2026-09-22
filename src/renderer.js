const urlInput = document.getElementById("url");
const mp3Checkbox = document.getElementById("mp3");
const downloadBtn = document.getElementById("download");
const statusEl = document.getElementById("status");

function setStatus(type, html) {
  statusEl.className = `status show ${type}`;
  statusEl.innerHTML = html;
}

downloadBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus("error", "Cole um link do YouTube antes de baixar.");
    return;
  }

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Baixando...";
  setStatus("info", "Baixando, aguarde...");

  const result = await window.yousave.download({ url, mp3: mp3Checkbox.checked });

  downloadBtn.disabled = false;
  downloadBtn.textContent = "Baixar";

  if (result.ok) {
    setStatus(
      "success",
      `Concluído! Salvo em:<br><span class="path-link" id="openFolder">${result.filePath}</span>`
    );
    document.getElementById("openFolder").addEventListener("click", () => {
      window.yousave.showInFolder(result.filePath);
    });
    urlInput.value = "";
  } else {
    setStatus("error", `Falha ao baixar: ${result.error}`);
  }
});

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") downloadBtn.click();
});
