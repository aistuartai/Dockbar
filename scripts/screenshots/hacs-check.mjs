// Runs the README through the same filter Home Assistant's markdown renderer uses, to see what HACS would show.
import { marked } from "marked";
import xss from "xss";
import { readFileSync } from "node:fs";

const base = xss.getDefaultWhiteList();
const whiteList = { ...base, table: [...(base.table ?? []), "role"], input: ["type", "disabled", "checked"] };
const md = readFileSync(process.argv[2], "utf8");
const out = marked.lexer(md).map((tok) => xss(marked.parser([tok]), { whiteList })).join("");

const escaped = [...out.matchAll(/&lt;\/?([a-z0-9-]+)/gi)].map((m) => m[1]);
console.log("tags shown as text:", escaped.length ? [...new Set(escaped)].join(", ") : "none");
const imgs = [...out.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
console.log("images kept:", imgs.length, "| with src:", imgs.filter((i) => /src="https:\/\/raw\.githubusercontent/.test(i)).length, "| with width:", imgs.filter((i) => /width=/.test(i)).length);
console.log("align attributes left:", (out.match(/align=/g) || []).length, "(table cells are fine)");
console.log("details/summary kept:", (out.match(/<details/g) || []).length, "/", (out.match(/<summary/g) || []).length);
console.log("headings:", (out.match(/<h[1-6]/g) || []).length, "| tables:", (out.match(/<table/g) || []).length, "| code blocks:", (out.match(/<pre/g) || []).length);
