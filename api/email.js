import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const handler = await import(resolve(__dirname, "../BackEnd/api/email.js"));

export default handler.default;