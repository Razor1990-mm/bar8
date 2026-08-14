/** Deploys the current git-tracked tree to Vercel via REST API.
 *  Exists because this environment can't run `vercel deploy` directly;
 *  functionally identical (upload files → create deployment → Vercel builds).
 *  Usage: VERCEL_TOKEN=... node scripts/deploy-vercel.mjs
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) throw new Error("VERCEL_TOKEN required");
const PROJECT_ID = "prj_ZWj4hKG0KlixkiTRxTSdZa56Np8k";
const TEAM_ID = "team_rd4Pt4m4isO8Nlgb1339hLL0";
const API = "https://api.vercel.com";
const auth = { Authorization: `Bearer ${TOKEN}` };

const tracked = execSync("git ls-files", { encoding: "utf8" })
  .trim()
  .split("\n")
  // .env* are gitignored so never tracked; belt-and-braces filter anyway.
  .filter((f) => !f.startsWith(".env"));

console.log(`${tracked.length} files`);

const files = [];
for (const file of tracked) {
  const data = readFileSync(file);
  const sha = createHash("sha1").update(data).digest("hex");
  files.push({ file, sha, size: data.length, data });
}

// Upload (Vercel dedups by sha; 409/200 both fine)
let uploaded = 0;
for (const f of files) {
  const res = await fetch(`${API}/v2/files?teamId=${TEAM_ID}`, {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": f.sha,
      "Content-Length": String(f.size),
    },
    body: f.data,
  });
  if (![200, 201, 409].includes(res.status)) {
    throw new Error(`upload ${f.file}: ${res.status} ${await res.text()}`);
  }
  uploaded++;
  if (uploaded % 25 === 0) console.log(`uploaded ${uploaded}/${files.length}`);
}
console.log(`uploaded ${uploaded}/${files.length}`);

const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const res = await fetch(`${API}/v13/deployments?teamId=${TEAM_ID}`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "bar8",
    project: PROJECT_ID,
    target: "production",
    files: files.map(({ file, sha, size }) => ({ file, sha, size })),
    projectSettings: { framework: "nextjs" },
    meta: { gitSha: sha },
  }),
});
const dep = await res.json();
if (dep.error) throw new Error(JSON.stringify(dep.error));
console.log("deployment:", dep.id);
console.log("url:", `https://${dep.url}`);
console.log("inspect:", dep.inspectorUrl);
