const API_URL = "https://ahpcgx6peg.execute-api.us-east-1.amazonaws.com/chat";

// ── Attached file state ──
let attachedFile = null;  // { name, content (base64 or text), mimeType }

// ─────────────────────────────────────────
// FILE HANDLING
// ─────────────────────────────────────────

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxBytes = 4 * 1024 * 1024; // 4 MB guard
    if (file.size > maxBytes) {
        alert("File too large. Please attach a file under 4 MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    // Text-based files → read as plain text for inline injection
    const textTypes = [
        "text/plain", "text/csv", "text/html", "text/css",
        "application/json", "application/xml", "text/markdown",
        "text/x-python", "application/javascript"
    ];
    const isText = textTypes.includes(file.type) || /\.(txt|csv|json|md|py|js|ts|html|css|xml|yaml|yml|log|sh)$/i.test(file.name);

    if (isText) {
        reader.onload = (e) => {
            attachedFile = { name: file.name, content: e.target.result, mimeType: file.type || "text/plain", encoding: "text" };
            showFilePreview(file.name);
        };
        reader.readAsText(file);
    } else {
        // Binary (PDF etc.) → base64
        reader.onload = (e) => {
            const base64 = e.target.result.split(",")[1];
            attachedFile = { name: file.name, content: base64, mimeType: file.type || "application/octet-stream", encoding: "base64" };
            showFilePreview(file.name);
        };
        reader.readAsDataURL(file);
    }

    // Reset input so same file can be re-selected
    event.target.value = "";
}

function showFilePreview(name) {
    document.getElementById("filePreviewName").textContent = name;
    document.getElementById("filePreviewBar").style.display = "flex";
    document.querySelector(".attach-btn").classList.add("has-file");
}

function removeAttachedFile() {
    attachedFile = null;
    document.getElementById("filePreviewBar").style.display = "none";
    document.querySelector(".attach-btn").classList.remove("has-file");
}

// ─────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────

async function sendMessage() {
    const inputElement = document.getElementById('userInput');
    const sendButton = document.getElementById('sendBtn');
    const promptText = inputElement.value.trim();

    if (!promptText && !attachedFile) return;

    // Build display text for user bubble
    const displayText = promptText || `(Uploaded: ${attachedFile.name})`;
    appendUserMessage(displayText, attachedFile ? attachedFile.name : null);

    const capturedFile = attachedFile;
    inputElement.value = '';
    removeAttachedFile();

    inputElement.disabled = true;
    sendButton.disabled = true;

    const loadingBubbleId = appendMessage("", 'bot-loading');

    // Build request payload
    const payload = { prompt: promptText || "Please analyse and summarise this file." };
    if (capturedFile) {
        payload.file = {
            name: capturedFile.name,
            mimeType: capturedFile.mimeType,
            encoding: capturedFile.encoding,
            content: capturedFile.content
        };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Network failure state: ${response.status}`);

        const data = await response.json();
        document.getElementById(loadingBubbleId).remove();

        if (data.error) {
            appendMessage("Engine Fault: " + data.error, 'bot');
        } else if (data.type === 'image') {
            appendImage(data.content);
        } else if (data.type === 'download') {
            // Bot is sending a downloadable file
            appendDownloadMessage(data.content, data.filename, data.mimeType || "application/octet-stream");
        } else {
            appendMessage(data.content, 'bot');
        }
    } catch (err) {
        if (document.getElementById(loadingBubbleId)) {
            document.getElementById(loadingBubbleId).remove();
        }
        appendMessage("Transit Error: Failed to acquire valid execution frames from endpoint proxy.", 'bot');
        console.error(err);
    } finally {
        inputElement.disabled = false;
        sendButton.disabled = false;
        inputElement.focus();
    }
}

// ─────────────────────────────────────────
// MESSAGE RENDERING
// ─────────────────────────────────────────

function appendUserMessage(text, fileName) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg user';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    if (fileName) {
        const badge = document.createElement('div');
        badge.className = 'file-attached-badge';
        badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> ${escapeHtml(fileName)}`;
        contentDiv.appendChild(badge);
    }

    if (text && text !== `(Uploaded: ${fileName})`) {
        const textNode = document.createElement('div');
        textNode.textContent = text;
        contentDiv.appendChild(textNode);
    }

    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(text, sender) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    const uniqueId = 'msg-' + Math.random().toString(36).substr(2, 9);

    msgDiv.id = uniqueId;
    msgDiv.className = `msg ${sender}`;

    if (sender === 'bot-loading') {
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return uniqueId;
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    if (text.includes("```")) {
        const parts = text.split("```");
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) {
                const codeElement = document.createElement('pre-code');
                codeElement.innerText = parts[i].trim();
                contentDiv.appendChild(codeElement);
            } else {
                if (parts[i].trim()) {
                    const textNode = document.createElement('span');
                    textNode.innerText = parts[i];
                    contentDiv.appendChild(textNode);
                }
            }
        }
    } else {
        contentDiv.innerHTML = text.replace(/\n/g, '<br>');
    }

    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return uniqueId;
}

function appendImage(base64Data) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg bot';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    const caption = document.createElement('div');
    caption.className = 'image-container-caption';
    caption.innerText = "✦ Synthesized Asset";

    const imgElement = document.createElement('img');
    imgElement.className = 'generated-image';
    imgElement.src = `data:image/png;base64,${base64Data}`;

    contentDiv.appendChild(caption);
    contentDiv.appendChild(imgElement);
    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Renders a bot message with a download button.
 * The Lambda can return { type: "download", content: "<base64>", filename: "result.zip", mimeType: "application/zip" }
 */
function appendDownloadMessage(base64Content, filename, mimeType) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg bot';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    const label = document.createElement('div');
    label.style.marginBottom = '6px';
    label.textContent = `Your file is ready:`;

    // Build a blob URL so the user can download it directly
    const bytes = atob(base64Content);
    const byteArray = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) byteArray[i] = bytes.charCodeAt(i);
    const blob = new Blob([byteArray], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.className = 'download-link';
    link.href = blobUrl;
    link.download = filename || 'download';
    link.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download ${escapeHtml(filename || 'file')}`;

    contentDiv.appendChild(label);
    contentDiv.appendChild(link);
    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
