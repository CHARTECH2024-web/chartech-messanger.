// ===== FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyCLMupkpdNWZPt4sntDsFvnoyBWvmX5KAc",
    authDomain: "ch-app-b3b94.firebaseapp.com",
    databaseURL: "https://ch-app-b3b94-default-rtdb.firebaseio.com/",
    projectId: "ch-app-b3b94",
    storageBucket: "ch-app-b3b94.firebasestorage.app",
    messagingSenderId: "794629229663",
    appId: "1:794629229663:web:ccadc48d796618be9bdfea",
    measurementId: "G-ZV2HF52EK"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// ===== VARIABLES GLOBALES =====
let currentUserEmail = null;
let currentUserPseudo = null;
let currentChatId = null;
let currentChatType = null; // 'private' ou 'group'
let aiMessagesDiv = null;
let callStatusDiv = null;
let ringtone = document.getElementById('ringtone');
let incomingCallTimeout = null;
let aiLongTermMemory = [];
let aiStats = {
    questionsPosees: 0,
    reponsesDonnees: 0,
    sujetsPref: {},
    derniereInteraction: null
};
let currentLanguage = 'fr';
let deepThinkEnabled = false;
let webSearchEnabled = false;
let uploadedMedia = [];
let mediaUrls = [];

// ===== TRADUCTIONS =====
const translations = {
    fr: {
        loginPlaceholderEmail: "Ton email",
        loginPlaceholderPseudo: "Ton pseudo",
        loginButton: "Se connecter",
        privateTab: "Privé",
        groupsTab: "Groupes",
        aiTab: "IA",
        callTab: "Appel",
        newConversation: "Nouvelle conversation",
        start: "Démarrer",
        recentConversations: "Conversations récentes",
        createGroup: "Créer un groupe",
        groupName: "Nom du groupe",
        groupMembers: "Emails des membres",
        myGroups: "Mes groupes",
        aiAssistant: "Assistant IA CHARTECH",
        aiPlaceholder: "Pose ta question...",
        send: "Envoyer",
        call: "Appel",
        selectContact: "Choisir un contact",
        startCall: "Démarrer l'appel",
        calling: "Appel en cours vers",
        incomingCall: "Appel entrant de",
        answer: "Répondre",
        hangup: "Raccrocher",
        callEnded: "Appel terminé",
        selectConversation: "Sélectionnez une conversation",
        messagePlaceholder: "Écrire un message...",
        noConversation: "Aucune conversation",
        noGroup: "Aucun groupe",
        emailNotRegistered: "Email non enregistré",
        fillAllFields: "Remplis tous les champs !",
        conversationCreated: "Conversation créée !",
        groupCreated: "Groupe créé !",
        selectChatFirst: "Sélectionne une conversation !",
        aiThinking: "réfléchit"
    },
    en: {
        loginPlaceholderEmail: "Your email",
        loginPlaceholderPseudo: "Your username",
        loginButton: "Login",
        privateTab: "Private",
        groupsTab: "Groups",
        aiTab: "AI",
        callTab: "Call",
        newConversation: "New conversation",
        start: "Start",
        recentConversations: "Recent conversations",
        createGroup: "Create group",
        groupName: "Group name",
        groupMembers: "Member emails",
        myGroups: "My groups",
        aiAssistant: "CHARTECH AI Assistant",
        aiPlaceholder: "Ask your question...",
        send: "Send",
        call: "Call",
        selectContact: "Choose a contact",
        startCall: "Start call",
        calling: "Calling",
        incomingCall: "Incoming call from",
        answer: "Answer",
        hangup: "Hang up",
        callEnded: "Call ended",
        selectConversation: "Select a conversation",
        messagePlaceholder: "Type a message...",
        noConversation: "No conversation",
        noGroup: "No group",
        emailNotRegistered: "Email not registered",
        fillAllFields: "Fill all fields!",
        conversationCreated: "Conversation created!",
        groupCreated: "Group created!",
        selectChatFirst: "Select a conversation first!",
        aiThinking: "thinking"
    }
};

// ===== FONCTIONS DE BASE =====
function updateUITexts() {
    const t = translations[currentLanguage];
    document.getElementById('loginEmail').placeholder = t.loginPlaceholderEmail;
    document.getElementById('loginPseudo').placeholder = t.loginPlaceholderPseudo;
    document.querySelector('.login-box button').textContent = t.loginButton;
    
    const tabButtons = document.querySelectorAll('.tab-button');
    if (tabButtons[0]) tabButtons[0].textContent = '💬 ' + t.privateTab;
    if (tabButtons[1]) tabButtons[1].textContent = '👥 ' + t.groupsTab;
    if (tabButtons[2]) tabButtons[2].textContent = '🤖 ' + t.aiTab;
    if (tabButtons[3]) tabButtons[3].textContent = '📞 ' + t.callTab;
    
    document.querySelector('.private-form h4').textContent = t.newConversation;
    document.querySelector('.private-form button').textContent = t.start;
    document.querySelector('#privateTab h4:last-of-type').textContent = t.recentConversations;
    
    document.querySelector('.group-form h4').textContent = t.createGroup;
    document.getElementById('groupName').placeholder = t.groupName;
    document.getElementById('groupMembers').placeholder = t.groupMembers;
    document.querySelector('.group-form button').textContent = t.createGroup;
    document.querySelector('#groupsTab h4:last-of-type').textContent = t.myGroups;
    
    document.querySelector('#aiTab h4').textContent = t.aiAssistant;
    document.getElementById('aiInput').placeholder = t.aiPlaceholder;
    document.querySelector('#aiTab .ai-input-wrapper button').textContent = t.send;
    
    document.querySelector('#callTab h4').textContent = '📞 ' + t.call;
    document.getElementById('callContactSelect').options[0].text = t.selectContact;
    document.querySelector('.call-contacts button').textContent = t.startCall;
    
    document.getElementById('currentChatHeader').textContent = t.selectConversation;
    document.getElementById('chatInput').placeholder = t.messagePlaceholder;
}

function formatTime(t) {
    return new Date(t).toLocaleTimeString(currentLanguage === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

function playMessageSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
}

// ===== THÈMES ET LANGUE =====
window.setTheme = function(theme) {
    document.body.className = 'theme-' + theme;
    localStorage.setItem('theme', theme);
};
window.setLanguage = function(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updateUITexts();
};

const savedTheme = localStorage.getItem('theme');
if (savedTheme) setTheme(savedTheme);
const savedLang = localStorage.getItem('language');
if (savedLang) setLanguage(savedLang);

// ===== NOTIFICATIONS =====
if (Notification.permission !== 'granted') Notification.requestPermission();

// ===== CONNEXION =====
window.login = function() {
    const email = document.getElementById('loginEmail').value.trim();
    const pseudo = document.getElementById('loginPseudo').value.trim();
    const t = translations[currentLanguage];
    if (!email || !pseudo) return alert(t.fillAllFields);

    const cleanEmail = email.replace(/\./g, ',');
    db.ref('users/' + cleanEmail).set({ pseudo, email });

    currentUserEmail = email;
    currentUserPseudo = pseudo;

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('chatApp').classList.remove('hidden');
    loadPrivateChats();
    loadGroups();
    loadContactsForCall();
    initAI();
    updateUITexts();
};

// ===== ONGLETS =====
window.showTab = function(tabName, e) {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
};

// ===== AFFICHER MESSAGE (pour chat normal) =====
function displayMessage(msg, containerId = 'chatMessages') {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = `message ${msg.senderEmail === currentUserEmail ? 'sent' : 'received'}`;

    if (msg.imageUrl) {
        const img = document.createElement('img');
        img.src = msg.imageUrl;
        img.style.maxWidth = '200px';
        img.style.borderRadius = '10px';
        div.appendChild(img);
    } else {
        div.textContent = `${msg.senderPseudo}: ${msg.text}`;
    }

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(msg.timestamp);
    div.appendChild(time);

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (msg.senderEmail !== currentUserEmail && containerId !== 'aiMessages') {
        playMessageSound();
        if (document.hidden && Notification.permission === 'granted') {
            new Notification(msg.senderPseudo, { body: msg.text || '📷 Photo' });
        }
    }
}

// ===== PRIVÉ =====
async function loadPrivateChats() {
    if (!currentUserEmail) return;
    const clean = currentUserEmail.replace(/\./g, ',');
    const snap = await db.ref('userChats/' + clean).once('value');
    const list = document.getElementById('privateChatList');
    list.innerHTML = '';
    const t = translations[currentLanguage];
    if (snap.exists()) {
        snap.forEach(child => {
            const data = child.val();
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.textContent = '💬 ' + data.other;
            div.onclick = () => openChat('private', child.key, data.other);
            list.appendChild(div);
        });
    } else list.innerHTML = `<p style="color:#aaa; text-align:center;">${t.noConversation}</p>`;
}

async function loadGroups() {
    if (!currentUserEmail) return;
    const clean = currentUserEmail.replace(/\./g, ',');
    const snap = await db.ref('userGroups/' + clean).once('value');
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
    const t = translations[currentLanguage];
    if (snap.exists()) {
        const promises = [];
        snap.forEach(child => {
            promises.push((async () => {
                const groupId = child.key;
                const groupSnapshot = await db.ref('groups/' + groupId).once('value');
                if (groupSnapshot.exists()) {
                    const groupData = groupSnapshot.val();
                    const div = document.createElement('div');
                    div.className = 'group-item';
                    div.textContent = '👥 ' + groupData.name;
                    div.onclick = () => openChat('group', groupId, groupData.name);
                    list.appendChild(div);
                }
            })());
        });
        await Promise.all(promises);
    } else list.innerHTML = `<p style="color:#aaa; text-align:center;">${t.noGroup}</p>`;
}

window.startPrivateChat = async function() {
    const r = document.getElementById('recipientEmail').value.trim();
    const t = translations[currentLanguage];
    if (!r) return;
    const cleanR = r.replace(/\./g, ',');
    const exists = await db.ref('users/' + cleanR).once('value');
    if (!exists.exists()) return alert(t.emailNotRegistered);

    const parts = [currentUserEmail.replace(/\./g, ','), cleanR].sort();
    const chatId = parts.join('_');

    await db.ref('userChats/' + currentUserEmail.replace(/\./g, ',') + '/' + chatId).set({
        type: 'private', other: exists.val().pseudo || r, otherEmail: r
    });
    await db.ref('userChats/' + cleanR + '/' + chatId).set({
        type: 'private', other: currentUserPseudo, otherEmail: currentUserEmail
    });
    alert(t.conversationCreated);
    loadPrivateChats();
    document.getElementById('recipientEmail').value = '';
};

window.createGroup = async function() {
    const name = document.getElementById('groupName').value.trim();
    const members = document.getElementById('groupMembers').value.split(',').map(e => e.trim().replace(/\./g, ','));
    const t = translations[currentLanguage];
    if (!name || !members.length) return;
    const creator = currentUserEmail.replace(/\./g, ',');
    if (!members.includes(creator)) members.push(creator);
    const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
    await db.ref('groups/' + groupId).set({ name, creator, members, createdAt: Date.now() });
    for (let m of members) await db.ref('userGroups/' + m + '/' + groupId).set(true);
    alert(t.groupCreated);
    loadGroups();
    document.getElementById('groupName').value = '';
    document.getElementById('groupMembers').value = '';
};

function openChat(type, chatId, displayName) {
    currentChatId = chatId;
    currentChatType = type;
    document.getElementById('currentChatHeader').textContent = '💬 ' + displayName;
    document.getElementById('chatMessages').innerHTML = '';

    const refPath = type === 'private' ? 'privateMessages' : 'groupMessages';
    db.ref(refPath + '/' + chatId).off();
    db.ref(refPath + '/' + chatId).on('child_added', snap => displayMessage(snap.val()));
}

window.sendCurrentChatMessage = function() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    const t = translations[currentLanguage];
    if (!text || !currentChatId) return alert(t.selectChatFirst);
    const refPath = currentChatType === 'private' ? 'privateMessages' : 'groupMessages';
    db.ref(refPath + '/' + currentChatId).push({
        senderEmail: currentUserEmail,
        senderPseudo: currentUserPseudo,
        text: text,
        timestamp: Date.now()
    });
    input.value = '';
};

document.getElementById('photoInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file || !currentChatId) return;
    const refPath = currentChatType === 'private' ? 'privateMessages' : 'groupMessages';
    const storageRef = storage.ref('chat_photos/' + Date.now() + '_' + file.name);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    db.ref(refPath + '/' + currentChatId).push({
        senderEmail: currentUserEmail,
        senderPseudo: currentUserPseudo,
        imageUrl: url,
        timestamp: Date.now()
    });
});

// ===== IA AVANCÉE =====
function analyzeTopics(text) {
    const topics = {
        programmation: ['code', 'javascript', 'python', 'programmer', 'algorithme'],
        math: ['math', 'calcul', 'équation', 'algèbre', 'géométrie'],
        physique: ['physique', 'force', 'mouvement', 'énergie', 'mécanique'],
        aviation: ['avion', 'drone', 'ch-01', 'vol', 'aile', 'moteur'],
        medecine: ['médecin', 'santé', 'hôpital', 'maladie', 'traitement'],
        russie: ['bauman', 'russie', 'moscou', 'russe'],
        dieu: ['dieu', 'prière', 'foi', 'seigneur', 'église']
    };
    const detected = [];
    const lower = text.toLowerCase();
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(k => lower.includes(k))) {
            detected.push(topic);
            aiStats.sujetsPref[topic] = (aiStats.sujetsPref[topic] || 0) + 1;
        }
    }
    return detected;
}

function getAIResponse(text, lang) {
    const lower = text.toLowerCase();
    const kb = {
        fr: {
            programmation: ["La programmation est l'art de donner des instructions à un ordinateur. Tu utilises JavaScript, HTML, CSS...", "Veux-tu apprendre un nouveau langage ?", "Les algorithmes sont essentiels."],
            math: ["Les mathématiques sont partout, surtout dans tes avions.", "L'algèbre linéaire est clé pour l'IA.", "Les équations différentielles décrivent le mouvement."],
            physique: ["La physique régit le vol : portance, traînée, poussée.", "Les lois de Newton sont fondamentales.", "L'électromagnétisme est crucial pour les moteurs."],
            aviation: ["Le CH-01 est un projet ambitieux !", "Parle-moi de l'autonomie de ton avion.", "La fibre de carbone est un bon choix."],
            medecine: ["Les équipements médicaux que tu veux fabriquer pourront sauver des vies.", "L'IA aide au diagnostic.", "La télémédecine se développe."],
            russie: ["Bauman est une excellente université.", "Apprends bien le russe !", "La Russie est forte en aérospatiale."],
            dieu: ["Dieu est avec toi dans tous tes projets.", "Continue à prier et à Le remercier.", "La foi est une force."]
        },
        en: {
            programmation: ["Programming is the art of giving instructions to a computer.", "Want to learn a new language?", "Algorithms are essential."],
            math: ["Mathematics is everywhere, especially in your planes.", "Linear algebra is key for AI.", "Differential equations describe motion."],
            physique: ["Physics governs flight: lift, drag, thrust.", "Newton's laws are fundamental.", "Electromagnetism is crucial for motors."],
            aviation: ["The CH-01 is an ambitious project!", "Tell me about your plane's range.", "Carbon fiber is a good choice."],
            medecine: ["The medical equipment you want to build can save lives.", "AI helps in diagnosis.", "Telemedicine is growing."],
            russie: ["Bauman is an excellent university.", "Learn Russian well!", "Russia is strong in aerospace."],
            dieu: ["God is with you in all your projects.", "Keep praying and thanking Him.", "Faith is a strength."]
        }
    };
    for (const [topic, keywords] of Object.entries({
        programmation: ['programmation', 'code', 'javascript', 'python'],
        math: ['math', 'maths', 'calcul', 'équation'],
        physique: ['physique', 'force', 'mouvement'],
        aviation: ['avion', 'drone', 'ch-01'],
        medecine: ['médecine', 'santé', 'médical'],
        russie: ['russie', 'bauman', 'moscou'],
        dieu: ['dieu', 'prière', 'foi']
    })) {
        if (keywords.some(k => lower.includes(k))) {
            const arr = kb[lang][topic] || kb[lang].programmation;
            return arr[Math.floor(Math.random() * arr.length)];
        }
    }
    const defaults = lang === 'fr' 
        ? ["Intéressant ! Peux-tu développer ?", "Je vois. Quel est ton objectif ?", "Veux-tu que je cherche des informations ?", "Je réfléchis..."]
        : ["Interesting! Can you elaborate?", "I see. What's your goal?", "Want me to look up information?", "Thinking..."];
    return defaults[Math.floor(Math.random() * defaults.length)];
}

async function callPythonAI(query, mediaUrls) {
    try {
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                media_urls: mediaUrls,
                deep_think: deepThinkEnabled,
                web_search: webSearchEnabled
            })
        });
        const data = await response.json();
        return data.answer;
    } catch (error) {
        console.error("Erreur connexion Python:", error);
        return "❌ IA locale non accessible. Vérifie que le serveur Python tourne.";
    }
}

window.toggleDeepThink = function() {
    deepThinkEnabled = !deepThinkEnabled;
    const btn = document.getElementById('deepThinkBtn');
    const status = document.getElementById('deepThinkStatus');
    btn.classList.toggle('active', deepThinkEnabled);
    status.classList.toggle('active', deepThinkEnabled);
    if (deepThinkEnabled) {
        document.getElementById('aiInput').classList.add('deep-thinking');
    } else {
        document.getElementById('aiInput').classList.remove('deep-thinking');
    }
};

window.toggleWebSearch = function() {
    webSearchEnabled = !webSearchEnabled;
    const btn = document.getElementById('webSearchBtn');
    const status = document.getElementById('webSearchStatus');
    btn.classList.toggle('active', webSearchEnabled);
    status.classList.toggle('active', webSearchEnabled);
};

document.getElementById('mediaInput').addEventListener('change', async function(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('mediaPreview');
    for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
            alert(`Fichier trop volumineux : ${file.name} (max 50MB)`);
            continue;
        }
        uploadedMedia.push(file);
        try {
            const storageRef = storage.ref('ai_media/' + Date.now() + '_' + file.name);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            mediaUrls.push({ url, type: file.type, name: file.name });
            const reader = new FileReader();
            reader.onload = function(event) {
                const div = document.createElement('div');
                div.className = 'preview-item';
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    div.appendChild(img);
                } else if (file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = event.target.result;
                    video.controls = true;
                    div.appendChild(video);
                }
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '✕';
                removeBtn.onclick = function() {
                    const index = uploadedMedia.indexOf(file);
                    if (index > -1) {
                        uploadedMedia.splice(index, 1);
                        mediaUrls.splice(index, 1);
                    }
                    div.remove();
                };
                div.appendChild(removeBtn);
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Erreur upload média:", error);
            alert(`Erreur lors de l'upload de ${file.name}`);
        }
    }
});

window.sendAIMessage = async function() {
    const input = document.getElementById('aiInput');
    const text = input.value.trim();
    if (!text && uploadedMedia.length === 0) return;

    const aiChatId = 'ai_' + currentUserEmail.replace(/\./g, ',');
    const aiEmail = 'ai@chartech.com';
    const topics = analyzeTopics(text);

    db.ref('aiMessages/' + aiChatId).push({
        senderEmail: currentUserEmail,
        senderPseudo: currentUserPseudo,
        text: text || "[Message avec média]",
        timestamp: Date.now(),
        topics: topics,
        hasMedia: uploadedMedia.length > 0,
        mediaCount: uploadedMedia.length
    });
    input.value = '';

    const thinkingDiv = document.getElementById('aiThinking');
    thinkingDiv.style.display = 'block';
    if (deepThinkEnabled) {
        thinkingDiv.innerHTML = `🧠 RÉFLEXION PROFONDE EN COURS <span>.</span><span>.</span><span>.</span>`;
        thinkingDiv.style.animation = 'gradient 2s linear infinite';
    } else {
        thinkingDiv.innerHTML = `🤖 ${translations[currentLanguage].aiThinking} <span>.</span><span>.</span><span>.</span>`;
    }

    const startTime = Date.now();
    let finalResponse = "";

    // Appel au serveur Python (si disponible)
    const mediaUrlsForPython = mediaUrls.map(m => m.url);
    const pythonResponse = await callPythonAI(text, mediaUrlsForPython);

    if (!pythonResponse.startsWith("❌")) {
        finalResponse = pythonResponse;
    } else {
        // Réponse locale de secours
        let baseResponse = getAIResponse(text, currentLanguage);
        if (deepThinkEnabled) {
            baseResponse = "🧠 **ANALYSE APPROFONDIE**\n\n" + baseResponse + "\n\nPoints clés développés :\n• Contexte technique\n• Étapes détaillées\n• Références";
        }
        if (mediaUrls.length > 0) {
            baseResponse += "\n\n📷 **MÉDIAS REÇUS** : " + mediaUrls.length + " fichier(s) à analyser.";
        }
        finalResponse = baseResponse;
    }

    const thinkingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    finalResponse += `\n\n_⏱️ Réflexion : ${thinkingTime}s_`;

    thinkingDiv.style.display = 'none';
    db.ref('aiMessages/' + aiChatId).push({
        senderEmail: aiEmail,
        senderPseudo: 'CHARTECH AI',
        text: finalResponse,
        timestamp: Date.now(),
        deepThink: deepThinkEnabled,
        webSearch: webSearchEnabled
    });

    // Réinitialiser les médias
    uploadedMedia = [];
    mediaUrls = [];
    document.getElementById('mediaPreview').innerHTML = '';
};

function initAI() {
    aiMessagesDiv = document.getElementById('aiMessages');
    const aiEmail = 'ai@chartech.com';
    const cleanAI = aiEmail.replace(/\./g, ',');
    db.ref('users/' + cleanAI).set({ pseudo: 'CHARTECH AI', email: aiEmail });
    const aiChatId = 'ai_' + currentUserEmail.replace(/\./g, ',');
    db.ref('aiMessages/' + aiChatId).off();
    db.ref('aiMessages/' + aiChatId).on('child_added', snap => {
        const msg = snap.val();
        displayMessage(msg, 'aiMessages');
        if (msg.senderEmail === aiEmail) {
            aiStats.reponsesDonnees++;
        } else {
            aiStats.questionsPosees++;
        }
        aiLongTermMemory.push(msg);
    });
}

// ===== APPEL =====
function loadContactsForCall() {
    if (!currentUserEmail) return;
    const clean = currentUserEmail.replace(/\./g, ',');
    db.ref('userChats/' + clean).once('value', snap => {
        const select = document.getElementById('callContactSelect');
        select.innerHTML = '<option value="">' + translations[currentLanguage].selectContact + '</option>';
        if (snap.exists()) {
            snap.forEach(child => {
                const data = child.val();
                const option = document.createElement('option');
                option.value = data.otherEmail;
                option.textContent = data.other;
                select.appendChild(option);
            });
        }
    });
}

window.startCall = function() {
    const select = document.getElementById('callContactSelect');
    const contactEmail = select.value;
    const t = translations[currentLanguage];
    if (!contactEmail) return alert("Choisis un contact !");
    const contactPseudo = select.options[select.selectedIndex].text;

    document.getElementById('callStatus').textContent = `${t.calling} ${contactPseudo}...`;
    ringtone.play();

    incomingCallTimeout = setTimeout(() => {
        document.getElementById('callStatus').textContent = `${t.incomingCall} ${contactPseudo}`;
        document.getElementById('answerBtn').style.display = 'inline-block';
        document.getElementById('hangupBtn').style.display = 'inline-block';
    }, 3000);
};

window.answerCall = function() {
    ringtone.pause();
    ringtone.currentTime = 0;
    document.getElementById('callStatus').textContent = translations[currentLanguage].callEnded;
    document.getElementById('answerBtn').style.display = 'none';
    document.getElementById('hangupBtn').style.display = 'none';
};

window.hangupCall = function() {
    ringtone.pause();
    ringtone.currentTime = 0;
    clearTimeout(incomingCallTimeout);
    document.getElementById('callStatus').textContent = translations[currentLanguage].callEnded;
    document.getElementById('answerBtn').style.display = 'none';
    document.getElementById('hangupBtn').style.display = 'none';
};
