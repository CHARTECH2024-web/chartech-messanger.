// ===== FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyCLMupkpdNWZPt4sntDsFvnoyBWVmX5KAc",
    authDomain: "ch-app-b3b94.firebaseapp.com",
    databaseURL: "https://ch-app-b3b94-default-rtdb.firebaseio.com/",
    projectId: "ch-app-b3b94",
    storageBucket: "ch-app-b3b94.firebasestorage.app",
    messagingSenderId: "794629229663",
    appId: "1:794629229663:web:ccadc48d796618be9bdfea",
    measurementId: "G-7ZV2HF52EK"
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

// ===== NOTIFICATIONS =====
if (Notification.permission !== 'granted') Notification.requestPermission();

// ===== THÈMES =====
window.setTheme = function(theme) {
    document.body.className = 'theme-' + theme;
    localStorage.setItem('theme', theme);
};

// Charger le thème sauvegardé
const savedTheme = localStorage.getItem('theme');
if (savedTheme) setTheme(savedTheme);

// ===== FONCTIONS AUDIO =====
function playMessageSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // La aigu
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
}

// ===== CONNEXION =====
window.login = function() {
    const email = document.getElementById('loginEmail').value.trim();
    const pseudo = document.getElementById('loginPseudo').value.trim();
    if (!email || !pseudo) return alert("Remplis tous les champs !");

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
    return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

    // Son si message reçu (pas de nous)
    if (msg.senderEmail !== currentUserEmail && containerId !== 'aiMessages') {
        playMessageSound();
        // Notification
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
    if (snap.exists()) {
        snap.forEach(child => {
            const data = child.val();
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.textContent = '💬 ' + data.other;
            div.onclick = () => openChat('private', child.key, data.other);
            list.appendChild(div);
        });
    } else list.innerHTML = '<p style="color:#aaa; text-align:center;">Aucune conversation</p>';
}

async function loadGroups() {
    if (!currentUserEmail) return;
    const clean = currentUserEmail.replace(/\./g, ',');
    const snap = await db.ref('userGroups/' + clean).once('value');
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
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
    } else list.innerHTML = '<p style="color:#aaa; text-align:center;">Aucun groupe</p>';
}

window.startPrivateChat = async function() {
    const r = document.getElementById('recipientEmail').value.trim();
    if (!r) return;
    const cleanR = r.replace(/\./g, ',');
    const exists = await db.ref('users/' + cleanR).once('value');
    if (!exists.exists()) return alert("Email non enregistré");

    const parts = [currentUserEmail.replace(/\./g, ','), cleanR].sort();
    const chatId = parts.join('_');

    await db.ref('userChats/' + currentUserEmail.replace(/\./g, ',') + '/' + chatId).set({
        type: 'private', other: exists.val().pseudo || r, otherEmail: r
    });
    await db.ref('userChats/' + cleanR + '/' + chatId).set({
        type: 'private', other: currentUserPseudo, otherEmail: currentUserEmail
    });
    alert('Conversation créée !');
    loadPrivateChats();
    document.getElementById('recipientEmail').value = '';
};

window.createGroup = async function() {
    const name = document.getElementById('groupName').value.trim();
    const members = document.getElementById('groupMembers').value.split(',').map(e => e.trim().replace(/\./g, ','));
    if (!name || !members.length) return;
    const creator = currentUserEmail.replace(/\./g, ',');
    if (!members.includes(creator)) members.push(creator);
    const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
    await db.ref('groups/' + groupId).set({ name, creator, members, createdAt: Date.now() });
    for (let m of members) await db.ref('userGroups/' + m + '/' + groupId).set(true);
    alert('Groupe créé !');
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
    if (!text || !currentChatId) return alert("Sélectionne une conversation !");
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

// ===== IA =====
function initAI() {
    aiMessagesDiv = document.getElementById('aiMessages');
    // Créer une entrée AI dans la base si nécessaire
    const aiEmail = 'ai@chartech.com';
    const cleanAI = aiEmail.replace(/\./g, ',');
    db.ref('users/' + cleanAI).set({ pseudo: 'CHARTECH AI', email: aiEmail });
    // Écouter les messages AI pour cet utilisateur
    const aiChatId = 'ai_' + currentUserEmail.replace(/\./g, ',');
    db.ref('aiMessages/' + aiChatId).off();
    db.ref('aiMessages/' + aiChatId).on('child_added', snap => {
        const msg = snap.val();
        if (msg.senderEmail !== currentUserEmail) {
            displayMessage(msg, 'aiMessages');
            playMessageSound();
        } else {
            displayMessage(msg, 'aiMessages');
        }
    });
}

window.sendAIMessage = function() {
    const input = document.getElementById('aiInput');
    const text = input.value.trim();
    if (!text) return;
    const aiChatId = 'ai_' + currentUserEmail.replace(/\./g, ',');
    const aiEmail = 'ai@chartech.com';
    db.ref('aiMessages/' + aiChatId).push({
        senderEmail: currentUserEmail,
        senderPseudo: currentUserPseudo,
        text: text,
        timestamp: Date.now()
    });
    input.value = '';

    // Simuler une réponse de l'IA après un délai
    setTimeout(() => {
        const responses = [
            "Intéressant ! Dis-m'en plus.",
            "Je vois. Et toi, qu'en penses-tu ?",
            "C'est une bonne idée !",
            "Peux-tu préciser ?",
            "Je suis là pour t'aider.",
            "Super ! Continuez comme ça.",
            "Hmm, laisse-moi réfléchir...",
            "Voici une information : le Congo est un pays aux richesses immenses."
        ];
        const reply = responses[Math.floor(Math.random() * responses.length)];
        db.ref('aiMessages/' + aiChatId).push({
            senderEmail: aiEmail,
            senderPseudo: 'CHARTECH AI',
            text: reply,
            timestamp: Date.now()
        });
    }, 1000);
};

// ===== APPEL =====
function loadContactsForCall() {
    if (!currentUserEmail) return;
    const clean = currentUserEmail.replace(/\./g, ',');
    db.ref('userChats/' + clean).once('value', snap => {
        const select = document.getElementById('callContactSelect');
        select.innerHTML = '<option value="">Choisir un contact</option>';
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
    if (!contactEmail) return alert("Choisis un contact !");
    const contactPseudo = select.options[select.selectedIndex].text;

    document.getElementById('callStatus').textContent = `Appel en cours vers ${contactPseudo}...`;
    ringtone.play();

    // Simuler un appel entrant après 3 secondes
    incomingCallTimeout = setTimeout(() => {
        document.getElementById('callStatus').textContent = `Appel entrant de ${contactPseudo}`;
        document.getElementById('answerBtn').style.display = 'inline-block';
        document.getElementById('hangupBtn').style.display = 'inline-block';
    }, 3000);
};

window.answerCall = function() {
    ringtone.pause();
    ringtone.currentTime = 0;
    document.getElementById('callStatus').textContent = 'Appel en cours...';
    document.getElementById('answerBtn').style.display = 'none';
    // Simuler une conversation
    setTimeout(() => {
        document.getElementById('callStatus').textContent = 'Appel terminé';
        document.getElementById('hangupBtn').style.display = 'none';
    }, 10000);
};

window.hangupCall = function() {
    ringtone.pause();
    ringtone.currentTime = 0;
    clearTimeout(incomingCallTimeout);
    document.getElementById('callStatus').textContent = 'Appel terminé';
    document.getElementById('answerBtn').style.display = 'none';
    document.getElementById('hangupBtn').style.display = 'none';
};
