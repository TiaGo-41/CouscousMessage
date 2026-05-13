// conversations.js

let currentUser = null;

auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  initPage();
});

function initPage() {
  document.getElementById('logout-btn').onclick = () => auth.signOut();
  document.getElementById('new-mp-btn').onclick = createMp;
  document.getElementById('create-group-btn').onclick = createGroup;

  loadConversations();
}

async function loadConversations() {
  const container = document.getElementById('conversations-list');

  db.collection('conversations')
    .where('members', 'array-contains', currentUser.uid)
    .onSnapshot(snapshot => {
      container.innerHTML = '';

      snapshot.forEach(doc => {
        const data = doc.data();

        // Si la conv est cachée pour moi → on l’ignore
        if ((data.hiddenFor || []).includes(currentUser.uid)) return;

        const div = document.createElement('div');
        div.className = 'conversation-item';

        let title = '';
        if (data.type === 'mp') {
          title = "MP avec " + getOtherMemberName(data.members);
        } else {
          title = "Groupe : " + (data.groupName || "Sans nom");
        }

        div.textContent = title;
        div.onclick = () => {
          window.location.href = `chat.html?id=${doc.id}`;
        };

        container.appendChild(div);
      });
    });
}

function getOtherMemberName(members) {
  const other = members.find(m => m !== currentUser.uid);
  return other ? other : "Inconnu";
}

async function createMp() {
  const otherId = document.getElementById('new-member-id').value.trim();
  if (!otherId) {
    alert("Entre l'ID de l'autre utilisateur.");
    return;
  }
  if (otherId === currentUser.uid) {
    alert("Tu ne peux pas créer un MP avec toi-même.");
    return;
  }

  const convRef = await db.collection('conversations').add({
    type: 'mp',
    members: [currentUser.uid, otherId],
    groupName: null,
    customNames: {},
    hiddenFor: []
  });

  window.location.href = `chat.html?id=${convRef.id}`;
}

async function createGroup() {
  const name = document.getElementById('group-name').value.trim();
  const membersRaw = document.getElementById('group-members').value.trim();

  if (!name || !membersRaw) {
    alert("Nom + membres obligatoires");
    return;
  }

  const members = membersRaw.split(",").map(m => m.trim());
  if (!members.includes(currentUser.uid)) {
    members.push(currentUser.uid);
  }

  const convRef = await db.collection('conversations').add({
    type: "group",
    members,
    groupName: name,
    customNames: {},
    hiddenFor: []
  });

  window.location.href = `chat.html?id=${convRef.id}`;
}
