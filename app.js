const API_URL = "https://ahpcgx6peg.execute-api.us-east-1.amazonaws.com/chat";

async function sendMessage() {
    const inputElement = document.getElementById('userInput');
    const sendButton = document.getElementById('sendBtn');
    const promptText = inputElement.value.trim();
    
    if (!promptText) return;

    appendMessage(promptText, 'user');
    inputElement.value = '';
    
    inputElement.disabled = true;
    sendButton.disabled = true;

    const loadingBubbleId = appendMessage("", 'bot-loading');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ prompt: promptText })
        });
        
        if (!response.ok) {
            throw new Error(`Network failure state: ${response.status}`);
        }

        const data = await response.json();
        
        document.getElementById(loadingBubbleId).remove();

        if (data.error) {
            appendMessage("Engine Fault: " + data.error, 'bot');
        } else if (data.type === 'image') {
            appendImage(data.content);
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
