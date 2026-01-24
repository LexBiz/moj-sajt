import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { nanoid } from "nanoid";

const app = express();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0"; // on VPS prefer "127.0.0.1" behind reverse proxy
const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
const SITES_DIR = path.join(DATA_DIR, "sites");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || "").trim().toLowerCase(); // e.g. "example.com"
const ADMIN_HOSTNAMES = String(process.env.ADMIN_HOSTNAMES || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean); // e.g. "deploy.example.com,admin.example.com"

app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));

// ---------- helpers ----------
function safeSlug(input) {
  const raw = String(input || "").trim().toLowerCase();
  const slug = raw
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `site-${nanoid(6).toLowerCase()}`;
}

async function ensureDirs() {
  await fs.mkdir(SITES_DIR, { recursive: true });
}

function requireAuth(req, res, next) {
  if (!ADMIN_TOKEN) return next(); // dev / local
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (token && token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

function isPathInside(parentDir, targetPath) {
  const rel = path.relative(parentDir, targetPath);
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function listSites() {
  await ensureDirs();
  const entries = await fs.readdir(SITES_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  dirs.sort((a, b) => a.localeCompare(b));
  return dirs;
}

function getSlugFromHostname(hostname) {
  const host = (hostname || "").toLowerCase();
  if (!ROOT_DOMAIN) return null;
  if (host === ROOT_DOMAIN) return null;
  if (!host.endsWith("." + ROOT_DOMAIN)) return null;
  const sub = host.slice(0, -1 * (ROOT_DOMAIN.length + 1));
  if (!sub || sub.includes(".")) return null; // only one-level subdomain supported
  return safeSlug(sub);
}

// ---------- static admin UI ----------
app.use("/admin", express.static(path.resolve("public")));
// Root: open Admin UI only on the main domain (or when subdomain mode is off).
// For subdomains like https://client1.example.com/ we must NOT redirect to /admin/,
// otherwise the published site will never open.
app.get("/", (req, res, next) => {
  if (ADMIN_HOSTNAMES.includes(String(req.hostname || "").toLowerCase())) {
    return res.redirect("/admin/");
  }
  const slug = getSlugFromHostname(req.hostname);
  if (slug) return next();
  return res.redirect("/admin/");
});

// ---------- API ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 5000
  }
});

app.get("/api/sites", requireAuth, async (req, res) => {
  const sites = await listSites();
  res.json({ sites });
});

app.delete("/api/sites/:slug", requireAuth, async (req, res) => {
  const slug = safeSlug(req.params.slug);
  const siteDir = path.join(SITES_DIR, slug);
  if (!existsSync(siteDir)) return res.status(404).json({ error: "Not found" });
  await fs.rm(siteDir, { recursive: true, force: true });
  res.json({ ok: true });
});

app.post("/api/sites", requireAuth, upload.array("files"), async (req, res) => {
  await ensureDirs();

  const desired = safeSlug(req.body?.name);
  let slug = desired;
  let n = 2;
  while (existsSync(path.join(SITES_DIR, slug))) {
    slug = `${desired}-${n++}`;
  }

  const siteDir = path.join(SITES_DIR, slug);
  await fs.mkdir(siteDir, { recursive: true });

  const files = req.files || [];
  if (!files.length) {
    await fs.rm(siteDir, { recursive: true, force: true });
    return res.status(400).json({ error: "No files uploaded" });
  }

  for (const f of files) {
    // Client should send webkitRelativePath. Some browsers send as originalname only.
    const relRaw =
      String(f.originalname || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

    // Drop any leading folder name so upload of "myproject/index.html" becomes "index.html"
    const rel = relRaw.includes("/") ? relRaw.split("/").slice(1).join("/") : relRaw;
    if (!rel || rel.includes("..")) continue;

    const dest = path.join(siteDir, rel);
    if (!isPathInside(siteDir, dest)) continue;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, f.buffer);
  }

  // If index.html missing, still allow (maybe single-page in subfolder) — but warn.
  const indexPath = path.join(siteDir, "index.html");
  const hasIndex = existsSync(indexPath);

  res.json({
    ok: true,
    slug,
    hasIndex,
    urlPath: `/sites/${slug}/`,
    urlSubdomain: ROOT_DOMAIN ? `https://${slug}.${ROOT_DOMAIN}/` : null
  });
});

// ---------- site serving (path based) ----------
app.use("/sites/:slug", async (req, res, next) => {
  const slug = safeSlug(req.params.slug);
  const siteDir = path.join(SITES_DIR, slug);
  if (!existsSync(siteDir)) return res.status(404).send("Site not found");
  return express.static(siteDir, { index: "index.html" })(req, res, next);
});

// ---------- site serving (subdomain based) ----------
app.use(async (req, res, next) => {
  const slug = getSlugFromHostname(req.hostname);
  if (!slug) return next();

  const siteDir = path.join(SITES_DIR, slug);
  if (!existsSync(siteDir)) return res.status(404).send("Site not found");
  return express.static(siteDir, { index: "index.html" })(req, res, next);
});

app.get("/health", (req, res) => res.json({ ok: true }));

// Used by Caddy on-demand TLS (asks backend if hostname is allowed).
// Caddy calls: /internal/ask?domain=client1.example.com
app.get("/internal/ask", (req, res) => {
  const domain = String(req.query?.domain || "").trim().toLowerCase();
  if (!ROOT_DOMAIN) return res.status(403).send("ROOT_DOMAIN not set");
  if (!domain) return res.status(403).send("missing domain");
  if (domain === ROOT_DOMAIN) return res.status(200).send("ok");
  if (domain.endsWith("." + ROOT_DOMAIN)) return res.status(200).send("ok");
  return res.status(403).send("forbidden");
});

await ensureDirs();
app.listen(PORT, HOST, () => {
  console.log(`Mini-netlify running on http://${HOST}:${PORT}`);
  console.log(`Admin UI: http://localhost:${PORT}/admin/`);
  if (ADMIN_TOKEN) console.log("Auth: enabled (ADMIN_TOKEN set)");
  if (ROOT_DOMAIN) console.log(`Subdomain mode enabled for *.${ROOT_DOMAIN}`);
});


