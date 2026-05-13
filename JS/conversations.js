// ---------------------------------------------------------
//  conversations.js — version améliorée avec auto-complétion
// ---------------------------------------------------------

let currentUser = null;
let usersCache = {}; // pour éviter de recharger les users

auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadConversations();
});

// ---------------------------------------------------------
// 1. Charger les conversations existantes
// ---------------------------------------------------------
async function loadConversations() {
  const list = document.getElementById("conversations-list");
  list.innerHTML = "";

  db.collection("conversations")
    .where("members", "array-contains", currentUser.uid)
    .onSnapshot(async snapshot => {
      list.innerHTML = "";

      for (const doc of snapshot.docs) {
        const conv = doc.data();
        const div = document.createElement("div");
        div.className = "conversation-item";

        const avatar = document.createElement("div");
        avatar.className = "conversation-avatar";

        const main = document.createElement("div");
        main.className = "conversation-main";

        if (conv.type === "group") {
          avatar.textContent = (conv.groupName || "G")[0].toUpperCase();
          main.innerHTML = `
            <span>${conv.groupName}</span>
            <span>${conv.members.length} membres</span>
          `;
        } else {
          const other = conv.members.find(m => m !== currentUser.uid);
          const userData = await getUser(other);
          avatar.textContent = (userData.name || "U")[0].toUpperCase();
          main.innerHTML = `
            <span>${userData.name}</span>
            <span>Message privé</span>
          `;
        }

        div.appendChild(avatar);
        div.appendChild(main);

        div.onclick = () => {
          window.location.href = `chat.html?id=${doc.id}`;
        };

        list.appendChild(div);
      }
    });
}

// ---------------------------------------------------------
// 2. Récupérer un utilisateur (avec cache)
// ---------------------------------------------------------
async function getUser(uid) {
  if (usersCache[uid]) return usersCache[uid];
  const doc = await db.collection("users").doc(uid).get();
  const data = doc.data() || {};
  usersCache[uid] = data;
  return data;
}

// ---------------------------------------------------------
// 3. POPUP MP — auto-complétion
// ---------------------------------------------------------
document.getElementById("new-mp-btn").onclick = () => {
  document.getElementById("popup-mp").style.display = "flex";
};

document.getElementById("close-mp").onclick = () => {
  document.getElementById("popup-mp").style.display = "none";
};

document.getElementById("mp-search").addEventListener("input", async e => {
  const search = e.target.value.toLowerCase();
  const results = document.getElementById("mp-results");
  results.innerHTML = "";

  if (search.length < 1) return;

  const snap = await db.collection("users").get();

  snap.forEach(doc => {
    const data = doc.data();
    if (doc.id === currentUser.uid) return;
    if ((data.name || "").toLowerCase().includes(search)) {
      const btn = document.createElement("button");
      btn.className = "btn btn-full";
      btn.textContent = data.name;
      btn.onclick = () => createMP(doc.id);
      results.appendChild(btn);
    }
  });
});

async function createMP(otherUid) {
  const conv = await db.collection("conversations").add({
    type: "mp",
    members: [currentUser.uid, otherUid],
    customNames: {},
    hiddenFor: []
  });

  window.location.href = `chat.html?id=${conv.id}`;
}

// ---------------------------------------------------------
// 4. POPUP GROUPE — auto-complétion + multi-sélection
// ---------------------------------------------------------
let selectedMembers = [];

document.getElementById("create-group-btn").onclick = () => {
  selectedMembers = [currentUser.uid];
  updateSelectedMembers();
  document.getElementById("popup-group").style.display = "flex";
};

document.getElementById("close-group").onclick = () => {
  document.getElementById("popup-group").style.display = "none";
};

document.getElementById("group-search").addEventListener("input", async e => {
  const search = e.target.value.toLowerCase();
  const results = document.getElementById("group-results");
  results.innerHTML = "";

  if (search.length < 1) return;

  const snap = await db.collection("users").get();

  snap.forEach(doc => {
    const data = doc.data();
    if ((data.name || "").toLowerCase().includes(search)) {
      if (!selectedMembers.includes(doc.id)) {
        const btn = document.createElement("button");
        btn.className = "btn btn-full";
        btn.textContent = data.name;
        btn.onclick = () => {
          selectedMembers.push(doc.id);
          updateSelectedMembers();
        };
        results.appendChild(btn);
      }
    }
  });
});

function updateSelectedMembers() {
  const div = document.getElementById("group-selected");
  div.innerHTML = "";

  selectedMembers.forEach(async uid => {
    const user = await getUser(uid);
    const tag = document.createElement("div");
    tag.className = "btn";
    tag.textContent = user.name;
    div.appendChild(tag);
  });
}

document.getElementById("create-group-final").onclick = async () => {
  const name = document.getElementById("group-name-input").value.trim();
  if (!name) return alert("Nom du groupe obligatoire");

  const conv = await db.collection("conversations").add({
    type: "group",
    groupName: name,
    members: selectedMembers,
    customNames: {},
    hiddenFor: []
  });

  window.location.href = `chat.html?id=${conv.id}`;
};
