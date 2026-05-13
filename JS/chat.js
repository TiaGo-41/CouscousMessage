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

  // ajout membre
  document.getElementById('add-member-btn').onclick = openAddMemberPopup;
  document.getElementById('close-add-member-popup').onclick = closeAddMemberPopup;
  document.getElementById('member-search').addEventListener('input', onMemberSearchInput);

  const convRef = db.collection('conversations').doc(conversationId);

  convRef.onSnapshot(doc => {
    conversationData = doc.data();
    if (!conversationData) return;

    const titleEl = document.getElementById('conv-title');
    const subtitleEl = document.getElementById('conv-subtitle');
    const avatarEl = document.getElementById('conv-avatar');

    if (conversationData.type === 'group') {
      const name = conversationData.groupName || "Groupe";
      titleEl.textContent = name;
      subtitleEl.textContent = "Groupe";
      avatarEl.textContent = name.charAt(0).toUpperCase();
    } else {
      titleEl.textContent = "MP";
      subtitleEl.textContent = "Message privé";
      avatarEl.textContent = "MP";
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
        if (msg.author === currentUser.uid) line.classList.add('me');

        // swipe reply (mobile)
        let startX = null;
        line.addEventListener('touchstart', e => {
          startX = e.touches[0].clientX;
        });
        line.addEventListener('touchend', e => {
          if (startX === null) return;
          const endX = e.changedTouches[0].clientX;
          if (startX - endX > 60) {
            const input = document.getElementById('msg-input');
            input.value = `@${pseudo} ` + input.value;
            input.focus();
          }
          startX = null;
        });

        const authorSpan = document.createElement('span');
        authorSpan.className = 'message-author';
        authorSpan.textContent = pseudo;
        authorSpan.style.color = color;

        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        textSpan.textContent = msg.text || '';

        let dateText = '';
        if (msg.timestamp) {
          const d = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
          dateText = d.toLocaleString('fr-FR');
        }
        const dateSpan = document.createElement('span');
        dateSpan.className = 'message-date';
        dateSpan.textContent = dateText;

        line.appendChild(authorSpan);
        line.appendChild(textSpan);
        line.appendChild(dateSpan);

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
  const btn = document.getElementById('send-btn');
  const text = input.value.trim();
  if (!text) return;

  btn.disabled = true;
  btn.style.opacity = '0.6';

  await db.collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .add({
      author: currentUser.uid,
      text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = '';
  btn.disabled = false;
  btn.style.opacity = '1';
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

// --- Ajout de membre dans un groupe existant ---
function openAddMemberPopup() {
  if (!conversationData || conversationData.type !== 'group') {
    alert("Tu peux ajouter des membres seulement dans un groupe.");
    return;
  }
  document.getElementById('member-search').value = '';
  document.getElementById('member-results').innerHTML = '';
  document.getElementById('add-member-popup').style.display = 'flex';
}

function closeAddMemberPopup() {
  document.getElementById('add-member-popup').style.display = 'none';
}

async function onMemberSearchInput(e) {
  const search = e.target.value.toLowerCase();
  const resultsDiv = document.getElementById('member-results');
  resultsDiv.innerHTML = '';

  if (search.length < 1) return;

  const snap = await db.collection('users').get();

  snap.forEach(doc => {
    const data = doc.data();
    const name = (data.name || '').toLowerCase();

    if (name.includes(search)) {
      if ((conversationData.members || []).includes(doc.id)) return;

      const btn = document.createElement('button');
      btn.textContent = data.name;
      btn.style.display = 'block';
      btn.onclick = () => addMemberToGroup(doc.id, data.name);
      resultsDiv.appendChild(btn);
    }
  });
}

async function addMemberToGroup(uid, name) {
  await db.collection('conversations').doc(conversationId).update({
    members: firebase.firestore.FieldValue.arrayUnion(uid)
  });

  alert(`Membre ajouté : ${name}`);
  closeAddMemberPopup();
}
