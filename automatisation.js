// automatisation.js  (module ESM dans ton HTML)

// Firebase via CDN ESM
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import {
  getFirestore, collection, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// -- TA CONFIG (inchangée) --
const firebaseConfig = {
  apiKey: "AIzaSyAuKbCg8c6y17uwpD0hhRTw3jgjanuPThs",
  authDomain: "portfolio-f82af.firebaseapp.com",
  projectId: "portfolio-f82af",
  storageBucket: "portfolio-f82af.firebasestorage.app",
  messagingSenderId: "23291907449",
  appId: "1:23291907449:web:87c2f036466019bceb73a8",
  measurementId: "G-YGMW3XPBC5"
};

const app = initializeApp(firebaseConfig);
// Analytics peut jeter en HTTP: on garde l'appli en vie
try { getAnalytics(app); } catch (e) { /* ignore */ }
const db = getFirestore(app);

// ⚠️ Mettre des identifiants en clair côté client n'est pas sûr.
// Garde ça temporaire si le site n'est pas public.
const ADMIN_LOGIN = "felicien.lantoine@gmail.com";
const ADMIN_PASSWORD = "Felicien81";

const COLLECTION_IA = "articles-IA";
const COLLECTION_CYBER = "articles-cyber";

function renderArticle(containerId, article) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const el = document.createElement("article");
  el.className = "article-flex";
  el.innerHTML = `
    <img src="${article.image || 'images/placeholder.png'}" alt="${article.title || 'Image'}" />
    <div class="article-content">
      <h3><a href="${article.url || '#'}" target="_blank" rel="noopener">${article.title || 'Titre indisponible'}</a></h3>
      <p>${article.summary || ''}</p>
    </div>
  `;
  container.prepend(el);
}

async function loadCollection(collectionName, containerId) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    snap.forEach(doc => renderArticle(containerId, doc.data()));
  } catch (e) {
    console.error(`Erreur chargement ${collectionName}:`, e);
  }
}

async function fetchMeta(url) {
  const apiURL = `https://api.microlink.io/?url=${encodeURIComponent(url)}&audio=false&video=false&iframe=false`;
  const res = await fetch(apiURL);
  const data = await res.json();
  if (data.status !== "success") throw new Error("Microlink error");
  return data.data;
}

async function addArticleTo(collectionName, containerId) {
  const login = prompt("Identifiant ?");
  if (login !== ADMIN_LOGIN) return alert("Identifiant incorrect.");
  const pwd = prompt("Mot de passe ?");
  if (pwd !== ADMIN_PASSWORD) return alert("Mot de passe incorrect.");

  const url = (prompt("Colle l'URL de l'article :") || "").trim();
  if (!url) return alert("URL vide.");

  const now = new Date();
  const dateStr = `(${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()})`;

  try {
    const info = await fetchMeta(url);
    const docData = {
      image: info.image?.url || "images/placeholder.png",
      summary: `${dateStr} – ${info.description || "Description non disponible"}`,
      title: info.title || "Titre non disponible",
      url: info.url || url
    };
    await addDoc(collection(db, collectionName), docData); // ➜ Firestore
    renderArticle(containerId, docData);                    // ➜ Page
    alert("Article ajouté ✅");
  } catch (e) {
    console.error(e);
    alert("Impossible de récupérer les métadonnées ou d'ajouter l'article.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // câblage boutons
  document.getElementById("add-ia")?.addEventListener("click", () => {
    addArticleTo(COLLECTION_IA, "list-ia");
  });
  document.getElementById("add-cyber")?.addEventListener("click", () => {
    addArticleTo(COLLECTION_CYBER, "list-cyber");
  });

  // chargement initial
  loadCollection(COLLECTION_IA, "list-ia");
  loadCollection(COLLECTION_CYBER, "list-cyber");
});
