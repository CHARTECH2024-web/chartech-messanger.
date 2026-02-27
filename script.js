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
let aiMemory = [];
let aiMood = "motivé";
let currentLanguage = 'fr'; // par défaut

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

// ===== FONCTION DE CHANGEMENT DE LANGUE =====
window.setLanguage = function(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updateUITexts();
};

// Mettre à jour tous les textes de l'interface
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
    document.querySelector('#aiTab .ai-input button').textContent = t.send;
    
    document.querySelector('#callTab h4').textContent = '📞 ' + t.call;
    document.getElementById('callContactSelect').options[0].text = t.selectContact;
    document.querySelector('.call-contacts button').textContent = t.startCall;
    
    document.getElementById('currentChatHeader').textContent = t.selectConversation;
    document.getElementById('chatInput').placeholder = t.messagePlaceholder;
}

// Charger la langue sauvegardée
const savedLang = localStorage.getItem('language');
if (savedLang) setLanguage(savedLang);

// ===== NOTIFICATIONS =====
if (Notification.permission !== 'granted') Notification.requestPermission();

// ===== THÈMES =====
window.setTheme = function(theme) {
    document.body.className = 'theme-' + theme;
    localStorage.setItem('theme', theme);
};
const savedTheme = localStorage.getItem('theme');
if (savedTheme) setTheme(savedTheme);

// ===== FONCTIONS AUDIO =====
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
    updateUITexts(); // pour être sûr
};

// ===== ONGLETS =====
window.showTab = function(tabName, e) {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
};

// ===== FORMAT HEURE =====
function formatTime(t) {
    return new Date(t).toLocaleTimeString(currentLanguage === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

// ===== AFFICHER MESSAGE =====
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
        snap.forEach(async child => {
            const g = await db.ref('groups/' + child.key).once('value');
            if (g.exists()) {
                const div = document.createElement('div');
                div.className = 'group-item';
                div.textContent = '👥 ' + g.val().name;
                div.onclick = () => openChat('group', child.key, g.val().name);
                list.appendChild(div);
            }
        });
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

// ===== IA AVANCÉE (bilingue) =====
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
    });
}

// Base de connaissances multilingue
const knowledgeBase = {
    fr: {
        programmation: [
            "La programmation, c'est l'art de donner des instructions à un ordinateur. Tu utilises JavaScript, HTML, CSS...",
            "Tu veux apprendre un langage ? Python est parfait pour commencer.",
            "Les algorithmes sont le cœur de la programmation. Veux-tu que je t'explique un tri ?"
        ],
        math: [
            "Les mathématiques sont partout ! Dans tes avions, dans le code, dans la nature.",
            "L'algèbre linéaire est essentielle pour la 3D et l'IA.",
            "Les équations différentielles décrivent le mouvement. Essentiel pour ton CH-01 !"
        ],
        medecine: [
            "La médecine utilise beaucoup de tech aujourd'hui : l'imagerie, les robots chirurgicaux.",
            "Savais-tu que l'IA peut détecter des maladies sur des radios ?",
            "Les équipements médicaux que tu veux fabriquer pourront sauver des vies."
        ],
        physique: [
            "La physique régit le vol de tes avions : portance, traînée, poussée.",
            "Newton et ses lois : action/réaction, inertie...",
            "L'électromagnétisme est crucial pour les moteurs et batteries."
        ],
        defaut: [
            "Intéressant ! Peux-tu développer ?",
            "Je vois. Quel est ton objectif ?",
            "Veux-tu que je cherche des informations sur ce sujet ?",
            "Je réfléchis... une seconde.",
            "Super ! Continue comme ça."
        ]
    },
    en: {
        programmation: [
            "Programming is the art of giving instructions to a computer. You use JavaScript, HTML, CSS...",
            "Want to learn a language? Python is great to start.",
            "Algorithms are the heart of programming. Want me to explain sorting?"
        ],
        math: [
            "Mathematics is everywhere! In your planes, in code, in nature.",
            "Linear algebra is essential for 3D and AI.",
            "Differential equations describe motion. Essential for your CH-01!"
        ],
        medecine: [
            "Medicine uses a lot of tech today: imaging, surgical robots.",
            "Did you know AI can detect diseases on X-rays?",
            "The medical equipment you want to build can save lives."
        ],
        physique: [
            "Physics governs the flight of your planes: lift, drag, thrust.",
            "Newton and his laws: action/reaction, inertia...",
            "Electromagnetism is crucial for motors and batteries."
        ],
        defaut: [
            "Interesting! Can you elaborate?",
            "I see. What's your goal?",
            "Want me to look up information on this topic?",
            "Thinking... one moment.",
            "Great! Keep going."
        ]
    }
};

// Fonction pour obtenir une réponse intelligente
function getAIResponse(userMessage, lang) {
    const lower = userMessage.toLowerCase();
    const kb = knowledgeBase[lang];
    
    // Détection de mots-clés
    if (lower.includes('programmation') || lower.includes('code') || lower.includes('javascript') || lower.includes('python')) {
        return kb.programmation[Math.floor(Math.random() * kb.programmation.length)];
    }
    if (lower.includes('math') || lower.includes('algèbre') || lower.includes('equation') || lower.includes('calcul')) {
        return kb.math[Math.floor(Math.random() * kb.math.length)];
    }
    if (lower.includes('médecine') || lower.includes('medecine') || lower.includes('santé') || lower.includes('hopital')) {
        return kb.medecine[Math.floor(Math.random() * kb.medecine.length)];
    }
    if (lower.includes('physique') || lower.includes('newton') || lower.includes('moteur') || lower.includes('force')) {
        return kb.physique[Math.floor(Math.random() * kb.physique.length)];
    }
    // Si c'est une question sur toi ou le contexte
    if (lower.includes('qui es-tu') || lower.includes('who are you')) {
        return lang === 'fr' ? "Je suis CHARTECH IA, ton assistant personnel." : "I am CHARTECH AI, your personal assistant.";
    }
    if (lower.includes('merci') || lower.includes('thanks')) {
        return lang === 'fr' ? "Avec plaisir !" : "You're welcome!";
    }
    if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('hello')) {
        return lang === 'fr' ? "Bonjour Charles ! Comment vas-tu ?" : "Hello Charles! How are you?";
    }
    // Par défaut
    return kb.defaut[Math.floor(Math.random() * kb.defaut.length)];
}

window.sendAIMessage = async function() {
    const input = document.getElementById('aiInput');
    const text = input.value.trim();
    const t = translations[currentLanguage];
    if (!text) return;

    const aiChatId = 'ai_' + currentUserEmail.replace(/\./g, ',');
    const aiEmail = 'ai@chartech.com';
    
    // Message de l'utilisateur
    db.ref('aiMessages/' + aiChatId).push({
        senderEmail: currentUserEmail,
        senderPseudo: currentUserPseudo,
        text: text,
        timestamp: Date.now()
    });
    input.value = '';

    // Afficher l'animation de réflexion
    const thinkingDiv = document.getElementById('aiThinking');
    thinkingDiv.style.display = 'block';
    thinkingDiv.innerHTML = `🤖 ${t.aiThinking} <span>.</span><span>.</span><span>.</span>`;

    // Simuler un temps de réflexion
    const delay = Math.floor(Math.random() * 1500) + 500; // 0.5-2s
    setTimeout(() => {
        // Cacher l'animation
        thinkingDiv.style.display = 'none';
        
        // Obtenir la réponse intelligente
        const reply = getAIResponse(text, currentLanguage);
        
        // Envoyer la réponse
        db.ref('aiMessages/' + aiChatId).push({
            senderEmail: aiEmail,
            senderPseudo: 'CHARTECH AI',
            text: reply,
            timestamp: Date.now()
        });
    }, delay);
};

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

let currentCall = null;

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
