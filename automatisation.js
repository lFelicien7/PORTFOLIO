// automatisation.js - a charger avec <script type="module" ...>

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAuKbCg8c6y17uwpD0hhRTw3jgjanuPThs",
  authDomain: "portfolio-f82af.firebaseapp.com",
  projectId: "portfolio-f82af",
  storageBucket: "portfolio-f82af.firebasestorage.app",
  messagingSenderId: "23291907449",
  appId: "1:23291907449:web:87c2f036466019bceb73a8",
  measurementId: "G-YGMW3XPBC5"
};

const COLLECTION = "articles-IA";
const ADMIN_EMAIL = "felicien.lantoine@gmail.com";

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch { /* ignore en HTTP */ }

const auth = getAuth(app);
const db = getFirestore(app);

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isAdmin(user) {
  return normalizeEmail(user?.email) === normalizeEmail(ADMIN_EMAIL);
}

function updateAddButton(button, user) {
  if (!button) return;

  const adminConnected = isAdmin(user);
  button.dataset.authState = adminConnected ? "admin" : "locked";
  button.title = adminConnected
    ? "Ajouter un article"
    : "Connexion administrateur requise";
  button.setAttribute(
    "aria-label",
    adminConnected ? "Ajouter un article" : "Connexion administrateur requise"
  );
}

function promptPassword() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "1rem";
    overlay.style.background = "rgba(9, 14, 25, 0.72)";
    overlay.style.backdropFilter = "blur(6px)";
    overlay.style.zIndex = "9999";

    const modal = document.createElement("div");
    modal.style.width = "100%";
    modal.style.maxWidth = "400px";
    modal.style.padding = "1.5rem";
    modal.style.borderRadius = "16px";
    modal.style.border = "1px solid rgba(30, 144, 255, 0.35)";
    modal.style.background = "linear-gradient(180deg, #1d1d1d 0%, #161f32 100%)";
    modal.style.boxShadow = "0 20px 45px rgba(0, 0, 0, 0.4)";
    modal.style.fontFamily = "'Poppins', sans-serif";
    modal.style.color = "#f5f5f5";

    modal.innerHTML = `
      <h2 style="margin: 0 0 0.45rem; font-size: 1.15rem; font-weight: 600; color: #ffffff;">Connexion administrateur</h2>
      <p style="margin: 0 0 1rem; color: rgba(245, 245, 245, 0.78); font-size: 0.95rem;">Entre ton mot de passe pour continuer.</p>
      <input
        type="password"
        id="admin-password-input"
        autocomplete="current-password"
        style="width: 100%; padding: 0.8rem 0.9rem; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 10px; outline: none; background: rgba(255, 255, 255, 0.08); color: #ffffff; box-sizing: border-box;"
      >
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
        <button type="button" data-action="cancel" style="border: 1px solid rgba(255, 255, 255, 0.16); background: rgba(255, 255, 255, 0.06); color: #f5f5f5; padding: 0.72rem 1rem; border-radius: 10px;">Annuler</button>
        <button type="button" data-action="confirm" style="border: none; background: #1e90ff; color: white; padding: 0.72rem 1rem; border-radius: 10px; box-shadow: 0 10px 20px rgba(30, 144, 255, 0.25);">Valider</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector("#admin-password-input");
    const cancelButton = modal.querySelector('[data-action="cancel"]');
    const confirmButton = modal.querySelector('[data-action="confirm"]');

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelButton.addEventListener("click", () => close(""));
    confirmButton.addEventListener("click", () => close(input.value));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close("");
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") close(input.value);
      if (event.key === "Escape") close("");
    });

    input.focus();
  });
}

async function requireAdmin() {
  if (isAdmin(auth.currentUser)) return true;

  const email = normalizeEmail(prompt("Email administrateur :"));
  if (!email) return false;

  const password = await promptPassword();
  if (!password) return false;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    alert("Connexion impossible.");
    return false;
  }

  if (!isAdmin(auth.currentUser)) {
    await signOut(auth);
    alert("Ce compte n'est pas autorise a ajouter des articles.");
    return false;
  }

  return true;
}

async function fetchMeta(url) {
  const apiURL = `https://api.microlink.io/?url=${encodeURIComponent(url)}&audio=false&video=false&iframe=false`;
  const res = await fetch(apiURL);
  const json = await res.json();

  if (json.status !== "success") {
    throw new Error("Microlink error");
  }

  return json.data;
}

function buildDoc(info, urlFallback) {
  return {
    title: info.title || "Titre non disponible",
    description: info.description || "Description non disponible",
    summary: info.description || "Description non disponible",
    image: info.image?.url || "images/placeholder.png",
    url: info.url || urlFallback,
    createdAt: serverTimestamp()
  };
}

function renderArticle(containerId, article) {
  if (!article || !article.title || !article.url) return;

  const grid = document.querySelector(".articles-grid");
  const target = grid || (containerId && document.getElementById(containerId));
  if (!target) return;

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <a href="${article.url}" target="_blank" rel="noopener">
      <img src="${article.image || "images/placeholder.png"}"
           class="card-img-top"
           alt="${article.title}">
    </a>
    <div class="card-body">
      <h5 class="card-title">${article.title}</h5>
      <p class="card-text">${article.summary || ""}</p>
    </div>
  `;

  const img = el.querySelector("img");
  img.addEventListener("error", () => {
    img.src = "images/placeholder.png";
  });

  target.prepend(el);
}

async function addArticleFlow() {
  const allowed = await requireAdmin();
  if (!allowed) return;

  const url = (prompt("Colle l'URL de l'article :") || "").trim();
  if (!url) return;

  try {
    const info = await fetchMeta(url);
    const docData = buildDoc(info, url);
    await addDoc(collection(db, COLLECTION), docData);
    renderArticle("list-ia", docData);
    alert("Article ajoute.");
  } catch (error) {
    console.error(error);
    alert("Impossible de recuperer les metadonnees ou d'ajouter l'article.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const addButton = document.getElementById("add-ia");

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Erreur persistance auth :", error);
  }

  onAuthStateChanged(auth, (user) => {
    updateAddButton(addButton, user);
  });

  addButton?.addEventListener("click", addArticleFlow);

  try {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    snap.forEach((doc) => renderArticle("list-ia", doc.data()));
  } catch (error) {
    console.error("Erreur chargement initial :", error);
  }
});
