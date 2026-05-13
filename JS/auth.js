// auth.js

// Si déjà connecté → on va direct sur la liste des conversations
auth.onAuthStateChanged(user => {
  if (user) {
    window.location.href = "conversations.html";
  }
});

// Inscription
document.getElementById('signup-btn').onclick = async () => {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const name = document.getElementById('signup-name').value.trim();
  const color = document.getElementById('signup-color').value;

  if (!email || !password || !name) {
    alert("Remplis tous les champs d'inscription.");
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      name,
      color,
      hiddenGroups: []
    });
  } catch (e) {
    console.error(e);
    alert("Erreur inscription : " + e.message);
  }
};

// Connexion
document.getElementById('login-btn').onclick = async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    alert("Remplis email et mot de passe.");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    console.error(e);
    alert("Erreur connexion : " + e.message);
  }
};
