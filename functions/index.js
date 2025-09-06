import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";

initializeApp();
const db = getFirestore();
const storage = getStorage().bucket();

function toSlug(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const importArticleFromUrl = onCall(
  { region: "europe-west1", cors: true, memory: "256MiB", timeoutSeconds: 20 },
  async (req) => {
    const { url } = req.data || {};
    const uid = req.auth?.uid;

    if (!uid) throw new HttpsError("unauthenticated", "Connecte-toi.");
    if (!url || typeof url !== "string")
      throw new HttpsError("invalid-argument", "URL manquante.");

    try {
      // 1) Télécharger la page source
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new HttpsError("failed-precondition", `HTTP ${res.status}`);
      const html = await res.text();

      // 2) Extraire meta og:title / og:description / og:image (fallback <title> / meta description)
      const pick = (re) => (html.match(re)?.[1] || "").trim();
      const og = (p) =>
        pick(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']+)`, "i")) ||
        pick(new RegExp(`<meta[^>]+name=["']og:${p}["'][^>]+content=["']([^"']+)`, "i"));

      const title = og("title") || pick(/<title[^>]*>([^<]+)/i);
      const description =
        og("description") ||
        pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
      let image = og("image");

      if (!title) throw new HttpsError("failed-precondition", "Impossible de lire le titre.");

      // 3) Importer l’image OG (si dispo) dans Storage (publique via URL signée longue durée)
      let imageUrl = "";
      if (image) {
        try {
          const abs = new URL(image, url).toString();
          const imgRes = await fetch(abs);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            const contentType = imgRes.headers.get("content-type") || "image/jpeg";
            const ext = contentType.split("/").pop() || "jpg";
            const path = `articles/og-${Date.now()}.${ext}`;
            await storage.file(path).save(buf, { contentType, resumable: false, public: true });
            const [signed] = await storage.file(path).getSignedUrl({
              action: "read",
              expires: "2100-01-01",
            });
            imageUrl = signed;
          }
        } catch (e) {
          logger.warn("Image OG non importée", e);
        }
      }

      // 4) Construire l’objet Firestore
      const summary = (description || "").slice(0, 300);
      const slug = toSlug(title);
      const doc = {
        title,
        summary,
        category: "Import",
        slug,
        sourceUrl: url,
        imageUrl: imageUrl || image || "",
        content: "",
        author: req.auth?.token?.email || uid,
        authorUid: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        published: true,
      };

      // 5) Sauvegarder
      const ref = await db.collection("articles").add(doc);
      return { id: ref.id, ...doc };
    } catch (e) {
      logger.error(e);
      throw e instanceof HttpsError ? e : new HttpsError("internal", e.message);
    }
  }
);
