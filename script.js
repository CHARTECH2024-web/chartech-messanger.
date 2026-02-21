// script.js - CHARTECH avec Firebase en temps réel

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onChildAdded, 
    onValue,
    get,
    query,
    orderByChild,
    limitToLast
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCLMupkpdNWZPt4sntDsFvnoYBWvmX5KAc",
    authDomain: "ch-app-b3b94.firebaseapp.com",
    databaseURL: "https://ch-app-b3b94-default-rtdb.firebaseio.com",
    projectId: "ch-app-b3b94",
    storageBucket: "ch-app-b3b94.firebasestorage.app",
    messagingSenderId: "794629229663",
    appId: "1:794629229663:web:ccadc48d796618be9bdfea"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variables globales
let currentUserEmail = null;
let currentUserPseudo = null;
let currentUserClean = null;
let currentChatId = null;
let currentChatType = null;
let currentChatName = null;

// Références pour les listeners
let messagesListener = null;
let privateChatsListener = null;
let groupsListener = null;

/* ===== FONCTIONS UTILITAIRES ===== */
function cleanEmail(email) {
    return email.replace(/\./g, ',');
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

/* ===== AUTHENTIFICATION ===== */
window.login = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const pseudo = document.getElementById('loginPseudo').value.trim();

    if (!email || !pseudo) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    currentUserEmail = email;
    currentUserPseudo = pseudo;
    currentUserClean = cleanEmail(email);

    try {
        // Sauvegarder l'utilisateur dans Firebase
        await set(ref(db, 'users/' + currentUserClean), {
            pseudo: pseudo,
            email: email,
            lastSeen: Date.now(),
            online: true
        });

        // Mettre à jour l'affichage
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('chatApp').classList.remove('hidden');
        document.getElementById('currentUserDisplay').textContent = pseudo;

        // Charger les données
        loadPrivateChats();
        loadGroups();
        
        // Mettre à jour le statut en ligne
        updateUserStatus(true);
        
        // Gérer la déconnexion
        window.addEventListener('beforeunload', () => {
            updateUserStatus(false);
        });

    } catch (error) {
        console.error("Erreur de connexion :", error);
        alert("Erreur lors de la connexion : " + error.message);
    }
};

// Mettre à jour le statut utilisateur
async function updateUserStatus(online) {
    if (!currentUserClean) return;
    await set(ref(db, 'users/' + currentUserClean + '/lastSeen'), Date.now());
    await set(ref(db, 'users/' + currentUserClean + '/online'), online);
}

/* ===== GESTION DES ONGLETS ===== */
window.showTab = function(tabName, event) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
};

/* ===== CHARGEMENT DES CONVERSATIONS PRIVÉES ===== */
async function loadPrivateChats() {
    if (!currentUserClean) return;
    
    const userChatsRef = ref(db, 'userChats/' + currentUserClean);
    
    // Nettoyer l'ancien listener
    if (privateChatsListener) {
        privateChatsListener();
    }
    
    privateChatsListener = onValue(userChatsRef, async (snapshot) => {
        const listDiv = document.getElementById('privateChatList');
        listDiv.innerHTML = '';

        if (!snapshot.exists()) {
            listDiv.innerHTML = '<div class="conversation-item">Aucune conversation pour le moment</div>';
            return;
        }

        const chats = [];
        snapshot.forEach((child) => {
            chats.push({ id: child.key, ...child.val() });
        });

        // Charger les détails pour chaque conversation
        for (const chat of chats) {
            const otherEmail = chat.otherEmail;
            const otherClean = cleanEmail(otherEmail);
            
            // Récupérer les infos de l'autre utilisateur
            const userSnapshot = await get(ref(db, 'users/' + otherClean));
            const userData = userSnapshot.val() || { pseudo: otherEmail, online: false };
            
            // Récupérer le dernier message
            const messagesRef = ref(db, 'privateMessages/' + chat.id);
            const messagesSnapshot = await get(query(messagesRef, limitToLast(1)));
            
            let lastMessage = 'Pas encore de messages';
            let lastMessageTime = null;
            
            if (messagesSnapshot.exists()) {
                messagesSnapshot.forEach((msg) => {
                    lastMessage = msg.val().message || 'Message';
                    lastMessageTime = msg.val().timestamp;
                });
            }
            
            // Créer l'élément de conversation
            const div = document.createElement('div');
            div.className = 'conversation-item';
            div.innerHTML = `
                <div class="conversation-avatar ${userData.online ? 'online' : ''}">
                    ${getInitials(userData.pseudo || otherEmail)}
                </div>
                <div class="conversation-info">
                    <div class="conversation-name">${userData.pseudo || otherEmail}</div>
                    <div class="conversation-last-message">
                        <span>${lastMessage.substring(0, 30)}${lastMessage.length > 30 ? '...' : ''}</span>
                        <span class="message-time">${formatTime(lastMessageTime)}</span>
                    </div>
                </div>
            `;
            
            div.onclick = () => openChat('private', chat.id, userData.pseudo || otherEmail, otherEmail);
            listDiv.appendChild(div);
        }
    });
}

/* ===== CHARGEMENT DES GROUPES ===== */
async function loadGroups() {
    if (!currentUserClean) return;
    
    const userGroupsRef = ref(db, 'userGroups/' + currentUserClean);
    
    if (groupsListener) {
        groupsListener();
    }
    
    groupsListener = onValue(userGroupsRef, async (snapshot) => {
        const listDiv = document.getElementById('groupsList');
        listDiv.innerHTML = '';

        if (!snapshot.exists()) {
            listDiv.innerHTML = '<div class="conversation-item">Aucun groupe pour le moment</div>';
            return;
        }

        const groups = [];
        snapshot.forEach((child) => {
            groups.push(child.key);
        });

        for (const groupId of groups) {
            const groupSnapshot = await get(ref(db, 'groups/' + groupId));
            
            if (groupSnapshot.exists()) {
                const groupData = groupSnapshot.val();
                
                // Récupérer le dernier message
                const messagesRef = ref(db, 'groupMessages/' + groupId);
                const messagesSnapshot = await get(query(messagesRef, limitToLast(1)));
                
                let lastMessage = 'Pas encore de messages';
                let lastMessageTime = null;
                
                if (messagesSnapshot.exists()) {
                    messagesSnapshot.forEach((msg) => {
                        lastMessage = msg.val().message || 'Message';
                        lastMessageTime = msg.val().timestamp;
                    });
                }
                
                const div = document.createElement('div');
                div.className = 'conversation-item';
                div.innerHTML = `
                    <div class="conversation-avatar group">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-name">${groupData.name}</div>
                        <div class="conversation-last-message">
                            <span>${lastMessage.substring(0, 30)}${lastMessage.length > 30 ? '...' : ''}</span>
                            <span class="message-time">${formatTime(lastMessageTime)}</span>
                        </div>
                    </div>
                `;
                
                div.onclick = () => openChat('group', groupId, groupData.name);
                listDiv.appendChild(div);
            }
        }
    });
}

/* ===== CRÉER UNE CONVERSATION PRIVÉE ===== */
window.startPrivateChat = async function() {
    const recipient = document.getElementById('recipientEmail').value.trim();
    if (!recipient) return;

    const cleanRecipient = cleanEmail(recipient);
    
    // Vérifier si l'utilisateur existe
    const recipientSnapshot = await get(ref(db, 'users/' + cleanRecipient));

    if (!recipientSnapshot.exists()) {
        alert("Cet email n'est pas encore enregistré !");
        return;
    }

    const recipientData = recipientSnapshot.val();
    
    // Créer un ID unique pour la conversation
    const participants = [currentUserClean, cleanRecipient].sort();
    const chatId = participants.join('_');

    // Sauvegarder la conversation pour les deux utilisateurs
    await set(ref(db, 'userChats/' + currentUserClean + '/' + chatId), {
        type: 'private',
        otherEmail: recipient,
        lastUpdated: Date.now()
    });

    await set(ref(db, 'userChats/' + cleanRecipient + '/' + chatId), {
        type: 'private',
        otherEmail: currentUserEmail,
        lastUpdated: Date.now()
    });

    alert("Conversation créée !");
    document.getElementById('recipientEmail').value = '';
    
    // Ouvrir directement la conversation
    openChat('private', chatId, recipientData.pseudo || recipient, recipient);
};

/* ===== CRÉER UN GROUPE ===== */
window.createGroup = async function() {
    const groupName = document.getElementById('groupName').value.trim();
    const membersInput = document.getElementById('groupMembers').value;

    if (!groupName || !membersInput) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    // Traiter la liste des membres
    const membersEmails = membersInput.split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0)
        .map(e => cleanEmail(e));

    // Ajouter le créateur s'il n'est pas déjà dans la liste
    if (!membersEmails.includes(currentUserClean)) {
        membersEmails.push(currentUserClean);
    }

    // Créer un ID unique pour le groupe
    const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    // Sauvegarder les informations du groupe
    await set(ref(db, 'groups/' + groupId), {
        name: groupName,
        creator: currentUserClean,
        members: membersEmails,
        createdAt: Date.now()
    });

    // Ajouter le groupe pour chaque membre
    for (let member of membersEmails) {
        await set(ref(db, 'userGroups/' + member + '/' + groupId), {
            name: groupName,
            addedAt: Date.now()
        });
    }

    alert("Groupe créé avec succès !");
    document.getElementById('groupName').value = '';
    document.getElementById('groupMembers').value = '';
    
    // Passer à l'onglet groupes
    document.querySelector('.tab-button[onclick*="groups"]').click();
};

/* ===== OUVRIR UNE CONVERSATION ===== */
function openChat(type, chatId, displayName, otherEmail = null) {
    // Mettre à jour les variables globales
    currentChatId = chatId;
    currentChatType = type;
    currentChatName = displayName;
    
    // Mettre à jour l'interface
    document.getElementById('currentChatHeader').textContent = displayName;
    document.getElementById('chatMessages').innerHTML = '';
    
    // Mettre à jour l'avatar
    const avatarDiv = document.getElementById('currentChatAvatar');
    if (type === 'private') {
        avatarDiv.innerHTML = getInitials(displayName);
        updateChatStatus(otherEmail);
    } else {
        avatarDiv.innerHTML = '<i class="fas fa-users"></i>';
        document.getElementById('currentChatStatusText').textContent = 'Groupe';
    }
    
    // Nettoyer l'ancien listener
    if (messagesListener) {
        messagesListener();
    }
    
    // Écouter les nouveaux messages
    const messagesRef = ref(db, (type === 'private' ? 'privateMessages/' : 'groupMessages/') + chatId);
    
    messagesListener = onChildAdded(messagesRef, (snapshot) => {
        const msg = snapshot.val();
        displayMessage(msg, msg.senderEmail === currentUserEmail ? 'sent' : 'received');
    });
    
    // Charger les anciens messages
    loadPreviousMessages(chatId, type);
}

// Mettre à jour le statut du contact
async function updateChatStatus(otherEmail) {
    if (!otherEmail) return;
    
    const otherClean = cleanEmail(otherEmail);
    const userRef = ref(db, 'users/' + otherClean);
    
    onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            const isOnline = userData.online || false;
            const statusText = isOnline ? 'En ligne' : 'Hors ligne';
            document.getElementById('currentChatStatusText').textContent = statusText;
            document.getElementById('currentChatStatus').style.color = isOnline ? '#00ff88' : '#ff4444';
        }
    });
}

// Charger les anciens messages
async function loadPreviousMessages(chatId, type) {
    const messagesRef = ref(db, (type === 'private' ? 'privateMessages/' : 'groupMessages/') + chatId);
    const messagesSnapshot = await get(query(messagesRef, limitToLast(50)));
    
    if (messagesSnapshot.exists()) {
        const messages = [];
        messagesSnapshot.forEach((child) => {
            messages.push(child.val());
        });
        
        // Trier par timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Afficher les messages
        messages.forEach(msg => {
            displayMessage(msg, msg.senderEmail === currentUserEmail ? 'sent' : 'received');
        });
    }
}

// Afficher un message
function displayMessage(msg, type) {
    const messagesDiv = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = formatTime(msg.timestamp);
    const senderPseudo = msg.senderPseudo || 'Inconnu';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${getInitials(senderPseudo)}</div>
        <div class="message-bubble">
            <div class="message-sender">${senderPseudo}</div>
            <div class="message-text">${msg.message || msg.text}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* ===== ENVOYER UN MESSAGE ===== */
window.sendCurrentChatMessage = function() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();

    if (!text || !currentChatId) {
        alert("Sélectionnez d'abord une conversation !");
        return;
    }

    const messagesRef = ref(db, (currentChatType === 'private' ? 'privateMessages/' : 'groupMessages/') + currentChatId);

    // Envoyer le message
    push(messagesRef, {
        senderEmail: currentUserEmail,
        senderPseudo: currentUserPseudo,
        message: text,
        timestamp: Date.now()
    });

    // Mettre à jour la dernière activité de la conversation
    if (currentChatType === 'private') {
        const participants = currentChatId.split('_');
        const otherClean = participants.find(p => p !== currentUserClean);
        
        if (otherClean) {
            set(ref(db, 'userChats/' + currentUserClean + '/' + currentChatId + '/lastUpdated'), Date.now());
            set(ref(db, 'userChats/' + otherClean + '/' + currentChatId + '/lastUpdated'), Date.now());
        }
    }

    input.value = '';
};

/* ===== RECHERCHE EN TEMPS RÉEL ===== */
// Recherche d'utilisateurs (optionnel)
async function searchUsers(searchTerm) {
    if (!searchTerm || searchTerm.length < 3) return [];
    
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    const results = [];
    snapshot.forEach((child) => {
        const userData = child.val();
        if (userData.pseudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userData.email.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push(userData);
        }
    });
    
    return results;
}

console.log('✅ CHARTECH chargé avec succès !');
