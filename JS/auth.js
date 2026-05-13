// ---------------------------------------------------------
//  AUTH.JS — Gestion de l'inscription et connexion
//  Version commentée et corrigée
// ---------------------------------------------------------

// ---------------------------------------------------------
// 1. INSCRIPTION D'UN NOUVEL UTILISATEUR
// ---------------------------------------------------------
document.getElementById("signup-btn").onclick = async () => {

    // Récupération des champs du formulaire
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const name = document.getElementById("signup-name").value;
    const color = document.getElementById("signup-color").value;

    // Vérification basique
    if (!email || !password || !name) {
        alert("Merci de remplir tous les champs !");
        return;
    }

    try {
        // Création du compte Firebase Auth
        const userCred = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCred.user;

        // ---------------------------------------------------------
        // IMPORTANT :
        // On crée un document Firestore pour l'utilisateur
        // avec les champs nécessaires au fonctionnement du chat :
        // - name : surnom
        // - color : couleur du pseudo
        // - email : pour info
        // - hiddenGroups : liste des groupes cachés
        // ---------------------------------------------------------
        await db.collection("users").doc(user.uid).set({
            name: name,
            color: color,
            email: email,
            hiddenGroups: []
        });

        alert("Compte créé avec succès !");
        window.location.href = "conversations.html";

    } catch (error) {
        alert("Erreur : " + error.message);
    }
};

// ---------------------------------------------------------
// 2. CONNEXION D'UN UTILISATEUR EXISTANT
// ---------------------------------------------------------
document.getElementById("login-btn").onclick = async () => {

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        // Connexion Firebase Auth
        await auth.signInWithEmailAndPassword(email, password);

        // Redirection vers la liste des conversations
        window.location.href = "conversations.html";

    } catch (error) {
        alert("Erreur : " + error.message);
    }
};
