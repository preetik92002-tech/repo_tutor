import type { IngestionResult } from "@/lib/github/client";

const F = (path: string, content: string, language?: string) => ({ path, content, size: content.length, language, redactions: 0 });

export const fixtureIngestion: IngestionResult = {
  meta: {
    owner: "acme", name: "shop", fullName: "acme/shop", description: "A tiny web shop API", stars: 12, language: "TypeScript",
    topics: ["shop"], defaultBranch: "main", htmlUrl: "https://github.com/acme/shop", sizeKb: 40, archived: false,
  },
  commitSha: "abc123",
  treePaths: ["README.md", "package.json", "src/index.ts", "src/routes.ts", "src/db.ts", "src/util/format.ts", "tests/routes.test.ts", "assets/logo.png"],
  files: [
    F("README.md", "# Shop\n\nShop is a small REST API that lets customers browse products and place orders for a local store.\n\n## Install\nnpm i\n"),
    F("package.json", JSON.stringify({ name: "shop", main: "src/index.ts", scripts: { start: "node src/index.ts", test: "vitest" }, dependencies: { express: "^4.18.0", zod: "^3.0.0" }, devDependencies: { typescript: "^5" } }, null, 2), "JSON"),
    F("src/index.ts", "import express from 'express';\nimport { router } from './routes';\n\nconst app = express();\napp.use('/api', router);\napp.listen(3000);\n", "TypeScript"),
    F("src/routes.ts", "import { Router } from 'express';\nimport { listProducts } from './db';\nimport { money } from './util/format';\n\nexport const router = Router();\n\nexport function handleList() {\n  return listProducts().map((p) => money(p.price));\n}\n", "TypeScript"),
    F("src/db.ts", "export const MAX_ROWS = 100;\n\nexport function listProducts() {\n  return [{ name: 'tea', price: 3 }];\n}\n\nexport class Database {\n  connect() {}\n}\n", "TypeScript"),
    F("src/util/format.ts", "export const money = (n: number) => `$${n.toFixed(2)}`;\n", "TypeScript"),
    F("tests/routes.test.ts", "import { handleList } from '../src/routes';\ntest('x', () => handleList());\n", "TypeScript"),
  ],
  skipped: { binary: 1 },
  notes: [],
};
