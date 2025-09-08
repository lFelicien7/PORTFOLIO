// === Firebase (SDK modulaire) ===
// Remplace la config ci-dessous par TES identifiants Firebase
// (apiKey, authDomain, projectId, etc.)
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAuKbCg8c6y17uwpD0hhRTw3jgjanuPThs",
  authDomain: "portfolio-f82af.firebaseapp.com",
  projectId: "portfolio-f82af",
  storageBucket: "portfolio-f82af.firebasestorage.app",
  messagingSenderId: "23291907449",
  appId: "1:23291907449:web:87c2f036466019bceb73a8",
  measurementId: "G-YGMW3XPBC5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// === Mini "auth" admin par prompt (remplace par tes valeurs) ===
const ADMIN_LOGIN = "felicien.lantoine@gmail.com";        // <-- remplace ici
const ADMIN_PASSWORD = "Felicien81";   // <-- remplace ici

// === Noms des collections Firestore ===
const COLLECTION_IA = "articles-IA";
const COLLECTION_CYBER = "articles-cyber";

// === Rendu d'un article dans un conteneur ===
function renderArticle(containerId, article) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const el = document.createElement("article");
  el.className = "article-flex";
  el.innerHTML = `
    <img src="${article.image || 'img/placeholder.png'}" alt="${article.title || 'Image'}" />
    <div class="article-content">
      <h3><a href="${article.url || '#'}" target="_blank" rel="noopener">${article.title || 'Titre indisponible'}</a></h3>
      <p>${article.summary || ''}</p>
    </div>
  `;

  // Prépend (dernier ajouté en haut)
  if (container.firstChild) container.insertBefore(el, container.firstChild);
  else container.appendChild(el);
}

// === Chargement d'une collection et affichage ===
async function loadCollection(collectionName, containerId) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    snap.forEach(doc => renderArticle(containerId, doc.data()));
  } catch (e) {
    console.error(`Erreur chargement ${collectionName}:`, e);
  }
}

// === Récupération métadonnées via Microlink ===
async function fetchMeta(url) {
  const apiURL = `https://api.microlink.io/?url=${encodeURIComponent(url)}&audio=false&video=false&iframe=false`;
  const res = await fetch(apiURL);
  const data = await res.json();
  if (data.status !== "success") throw new Error("Microlink error");
  return data.data;
}

// === Ajout d'un article (avec auto-génération titre/résumé/image) ===
async function addArticleTo(collectionName, containerId) {
  // pseudo-auth simple
  const login = prompt("Identifiant ?");
  if (login !== ADMIN_LOGIN) return alert("Identifiant incorrect.");
  const pwd = prompt("Mot de passe ?");
  if (pwd !== ADMIN_PASSWORD) return alert("Mot de passe incorrect.");

  const url = (prompt("Colle l'URL de l'article :") || "").trim();
  if (!url) return alert("URL vide.");

  // Date courte pour préfixer le résumé
  const now = new Date();
  const dateStr = `(${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()})`;

  try {
    const info = await fetchMeta(url);

    const docData = {
      image: info.image?.url || "img/5G.png",
      summary: `${dateStr} – ${info.description || "Description non disponible"}`,
      title: info.title || "Titre non disponible",
      url: info.url || url
      // (tu peux ajouter createdAt/serverTimestamp() si tu veux trier par date ajout)
    };

    await addDoc(collection(db, collectionName), docData);
    renderArticle(containerId, docData);
    alert("Article ajouté ✅");
  } catch (e) {
    console.error(e);
    alert("Impossible de récupérer les métadonnées ou d'ajouter l'article.");
  }
}

// === Écouteurs boutons (assure-toi d'avoir ces IDs dans le HTML) ===
document.getElementById("add-ia")?.addEventListener("click", () => {
  addArticleTo(COLLECTION_IA, "list-ia");
});
document.getElementById("add-cyber")?.addEventListener("click", () => {
  addArticleTo(COLLECTION_CYBER, "list-cyber");
});

// === Chargement initial (assure-toi d'avoir #list-ia et #list-cyber) ===
window.addEventListener("load", () => {
  loadCollection(COLLECTION_IA, "list-ia");
  loadCollection(COLLECTION_CYBER, "list-cyber");
});
