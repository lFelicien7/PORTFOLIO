// automatisation.js — à charger avec <script type="module" …>

// 1) Firebase via CDN ESM
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import {
  getFirestore, collection, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// 2) TA CONFIG (celle que tu m’as donnée)
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
try { getAnalytics(app); } catch { /* ignore en HTTP */ }
const db = getFirestore(app);

// 3) Nom de collection pour cette page IA
const COLLECTION = "articles-IA"; // (sur la page Cyber, mets "articles-cyber")

// 4) Récupération des métadonnées depuis l’URL (Microlink)
async function fetchMeta(url) {
  const apiURL = `https://api.microlink.io/?url=${encodeURIComponent(url)}&audio=false&video=false&iframe=false`;
  const res = await fetch(apiURL);
  const json = await res.json();
  if (json.status !== "success") throw new Error("Microlink error");
  return json.data;
}

// 5) Construction du doc Firestore à partir des métadonnées
function buildDoc(info, urlFallback) {
  const now = new Date();
  const dateStr = `(${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()})`;
  return {
    title: info.title || "Titre non disponible",
    summary: `${dateStr} – ${info.description || "Description non disponible"}`,
    image: info.image?.url || "images/placeholder.png",
    url: info.url || urlFallback
  };
}

// 6) Rendu sur la page
function renderArticle(containerId, article) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const el = document.createElement("article");
  el.className = "article-flex";
  el.innerHTML = `
    <img src="${article.image}" alt="${article.title}" />
    <div class="article-content">
      <h3><a href="${article.url}" target="_blank" rel="noopener">${article.title}</a></h3>
      <p>${article.summary}</p>
    </div>
  `;
  container.prepend(el); // affichage instantané en haut de liste
}

// 7) Flux “Ajouter un article”
async function addArticleFlow() {
  const url = (prompt("Colle l'URL de l'article :") || "").trim();
  if (!url) return; // utilisateur a annulé ou vide

  try {
    const info = await fetchMeta(url);         // (2) récupérer données
    const docData = buildDoc(info, url);       // normaliser
    await addDoc(collection(db, COLLECTION), docData); // (2) -> Firestore
    renderArticle("list-ia", docData);         // (3) -> Page
    alert("Article ajouté ✅");
  } catch (e) {
    console.error(e);
    alert("Impossible de récupérer les métadonnées ou d'ajouter l'article.");
  }
}

// 8) Câblage bouton + chargement initial
document.addEventListener("DOMContentLoaded", async () => {
  // bouton “Ajouter un article (IA)”
  document.getElementById("add-ia")?.addEventListener("click", addArticleFlow);

  // au chargement, on liste ce qui est déjà dans Firestore
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    snap.forEach(doc => renderArticle("list-ia", doc.data()));
  } catch (e) {
    console.error("Erreur chargement initial :", e);
  }
});
