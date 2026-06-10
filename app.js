// ==========================================
// CONFIGURATION: PASTE YOUR COMPLETED STAGE URL HERE
// ==========================================
// Example: "https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com/chat"
const API_URL = "https://ahpcgx6peg.execute-api.us-east-1.amazonaws.com/chat";

async function sendMessage() {
    const inputElement = document.getElementById('userInput');
    const sendButton = document.getElementById('sendBtn');
    const promptText = inputElement.value.trim();
    
    // Prevent execution if input field is null or only spaces
    if (!promptText) return;

    // 1. Render User message row instantly
    appendMessage(promptText, 'user');
    inputElement.value = '';
    
    // Lock controls during processing active window
    inputElement.disabled = true;
    sendButton.disabled = true;

    // 2. Generate and display animated temporary loading bubble
    const loadingBubbleId = appendMessage("Thinking...", 'bot-loading');

    try {
        // 3. Dispatch POST network query payload to API Gateway
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ prompt: promptText })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP network fault code: ${response.status}`);
        }

        const data = await response.json();
        
        // Remove temporary placeholder bubble elements
        document.getElementById(loadingBubbleId).remove();

        // 4. Handle logical multi-modal payload responses split
        if (data.error) {
            appendMessage("Engine Execution Exception: " + data.error, 'bot');
        } else if (data.type === 'image') {
            appendImage(data.content);
        } else {
            appendMessage(data.content, 'bot');
        }
    } catch (err) {
        // Safe clearance of active indicators on infrastructure errors
        if (document.getElementById(loadingBubbleId)) {
            document.getElementById(loadingBubbleId).remove();
        }
        appendMessage("Connection error: Unable to communicate with serverless entryway proxy. Check your Invoke endpoint URL configurations.", 'bot');
        console.error(err);
    } finally {
        // Restore controls
        inputElement.disabled = false;
        sendButton.disabled = false;
        inputElement.focus();
    }
}

function appendMessage(text, sender) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    const uniqueId = 'msg-' + Math.random().toString(36).substr(2, 9);
    
    msgDiv.id = uniqueId;
    // Maps to styles: .user, .bot, or .bot-loading
    msgDiv.className = `msg ${sender === 'user' ? 'user' : (sender === 'bot-loading' ? 'bot-loading' : 'bot')}`;
    
    // Evaluate if text response contains an uncompiled basic Markdown code-block wrap
    if (text.includes("```")) {
        const parts = text.split("```");
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) {
                // Odd indexes indicate code sequences wrapped between ticks
                const codeElement = document.createElement('pre-code');
                codeElement.innerText = parts[i].trim();
                msgDiv.appendChild(codeElement);
            } else {
                // Even indexes represent standard outer copy text block rows
                if (parts[i].trim()) {
                    const textNode = document.createElement('span');
                    textNode.innerText = parts[i];
                    msgDiv.appendChild(textNode);
                }
            }
        }
    } else {
        msgDiv.innerHTML = text.replace(/\n/g, '<br>');
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Keep viewport anchored to latest text line
    return uniqueId;
}

function appendImage(base64Data) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg bot';
    
    const caption = document.createElement('div');
    caption.className = 'image-container-caption';
    caption.innerText = "⚡ Synthesized Visual Asset:";
    
    const imgElement = document.createElement('img');
    imgElement.className = 'generated-image';
    // Reconstruct raw binary payload safely inside local image source data bounds
    imgElement.src = `data:image/png;base64,${base64Data}`;
    
    msgDiv.appendChild(caption);
    msgDiv.appendChild(imgElement);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}
