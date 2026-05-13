// chat.js

const params = new URLSearchParams(window.location.search);
const conversationId = params.get('id');

let currentUser = null;
let conversationData = null;
let usersCache = {};

auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  initChat();
});

function initChat() {
  document.getElementById('back-btn').onclick = () => {
    window.location.href = "conversations.html";
  };

  document.getElementById('send-btn').onclick = sendMessage;
  document.getElementById('edit-nickname-btn').onclick = editNickname;
  document.getElementById('edit-group-name-btn').onclick = editGroupName;
  document.getElementById('hide-btn').onclick = hideForUser;
  document.getElementById('unhide-btn').onclick = unhideForUser;

  const convRef = db.collection('conversations').doc(conversationId);

  convRef.onSnapshot(doc => {
    conversationData = doc.data();
    if (!conversationData) return;

    const titleEl = document.getElementById('conv-title');
    if (conversationData.type === 'group') {
      titleEl.textContent = conversationData.groupName || "Groupe";
    } else {
      titleEl.textContent = "MP";
    }
  });

  convRef.collection('messages')
    .orderBy('timestamp')
    .onSnapshot(async snapshot => {
      const container = document.getElementById('messages');
      container.innerHTML = '';

      for (const doc of snapshot.docs) {
        const msg = doc.data();
        const userData = await getUser(msg.author);
        const pseudo = getDisplayName(userData, msg.author);
        const color = userData.color || '#ffffff';

        const line = document.createElement('div');
        line.className = 'message-line';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = pseudo + ": ";
        nameSpan.style.color = color;

        const textSpan = document.createElement('span');
        textSpan.textContent = msg.text || '';

        line.appendChild(nameSpan);
        line.appendChild(textSpan);

        container.appendChild(line);
      }

      container.scrollTop = container.scrollHeight;
    });
}

async function getUser(uid) {
  if (usersCache[uid]) return usersCache[uid];
  const doc = await db.collection('users').doc(uid).get();
  const data = doc.data() || {};
  usersCache[uid] = data;
  return data;
}

function getDisplayName(userData, uid) {
  if (!conversationData) return userData.name || uid;
  const custom = (conversationData.customNames || {})[uid];
  return custom || userData.name || uid;
}

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;

  await db.collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .add({
      author: currentUser.uid,
      text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = '';
}

// --- Surnom personnalisé ---
async function editNickname() {
  if (conversationData.type !== "group") {
    alert("Les surnoms personnalisés sont seulement pour les groupes.");
    return;
  }

  const newName = prompt("Ton surnom dans ce groupe :");
  if (!newName) return;

  const convRef = db.collection("conversations").doc(conversationId);

  await convRef.update({
    [`customNames.${currentUser.uid}`]: newName
  });

  alert("Surnom mis à jour !");
}

// --- Renommer le groupe ---
async function editGroupName() {
  if (conversationData.type !== "group") {
    alert("Ce n'est pas un groupe.");
    return;
  }

  const newName = prompt("Nouveau nom du groupe :");
  if (!newName) return;

  await db.collection("conversations").doc(conversationId).update({
    groupName: newName
  });

  alert("Nom du groupe mis à jour !");
}

// --- Cacher / Décacher ---
async function hideForUser() {
  const targetId = prompt("UID de la personne à cacher cette conversation pour :");
  if (!targetId) return;

  const convRef = db.collection("conversations").doc(conversationId);
  const userRef = db.collection("users").doc(targetId);

  await convRef.update({
    hiddenFor: firebase.firestore.FieldValue.arrayUnion(targetId)
  });

  await userRef.update({
    hiddenGroups: firebase.firestore.FieldValue.arrayUnion(conversationId)
  });

  alert("Conversation cachée pour " + targetId);
}

async function unhideForUser() {
  const targetId = prompt("UID de la personne à DÉcacher :");
  if (!targetId) return;

  const convRef = db.collection("conversations").doc(conversationId);
  const userRef = db.collection("users").doc(targetId);

  await convRef.update({
    hiddenFor: firebase.firestore.FieldValue.arrayRemove(targetId)
  });

  await userRef.update({
    hiddenGroups: firebase.firestore.FieldValue.arrayRemove(conversationId)
  });

  alert("Décaché. La conversation réapparaîtra pour cette personne dans ~20 secondes.");
}
