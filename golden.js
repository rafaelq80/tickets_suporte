#!/usr/bin/env node
// Golden test da avaliação de tickets.
// Uso:  node golden.js [caminho/do/index.html] [--verbose]
// Extrai analisar() direto do index.html (testa o código real) e roda os casos de casos.js.
// Sem dependências: só Node 14+.

const fs = require("fs"), path = require("path"), vm = require("vm");
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const arqHtml = args.find(a => !a.startsWith("--")) || path.join(__dirname, "index.html");
if (!fs.existsSync(arqHtml)) { console.error("index.html não encontrado em: " + arqHtml + "\nUso: node golden.js caminho/do/index.html"); process.exit(2); }
const html = fs.readFileSync(arqHtml, "utf8");
const casos = require("./casos.js");

// ── 1. Extrai do index.html só as funções puras da avaliação ──
function bloco(ini, fim) {
  const i = html.indexOf(ini); if (i < 0) throw new Error("Trecho não encontrado no HTML: " + ini);
  const j = html.indexOf(fim, i); if (j < 0) throw new Error("Fim do trecho não encontrado: " + fim);
  return html.slice(i, j);
}
const codigo = [
  bloco("const norm = x =>", "const regras = {"),      // norm, toks, lerPassos, sim
  bloco("const SLA_H =", "const PRN ="),               // sla, sensíveis, complementares, analisar
  bloco("const dur = ms =>", "function deriv(")        // dur
].join("\n") + "\nglobalThis.__analisar = analisar;";
const ctx = vm.createContext({ console });
vm.runInContext(codigo, ctx);

// ── 2. Executa um caso (val/cur/T são os "globais" que analisar() espera) ──
const ABERTO = new Date("2026-10-05T12:00:00.000Z");
const loc = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function rodar(c) {
  const f = { ...c.form };
  f.conclusao = f.status === "Resolvido" ? loc(new Date(ABERTO.getTime() + (c.concluirApos ?? 90) * 60000)) : "";
  ctx.val = id => String(f[id] ?? "").trim();
  ctx.cur = { id: "novo", aberto: ABERTO.toISOString(), num: "TK-202610-0099" };
  ctx.T = c.tickets || [];
  return vm.runInContext("__analisar()", ctx);
}

// ── 3. Compara com o esperado ──
const metr = {};  // por verificação: TP, FP, FN, TN
const m = n => metr[n] || (metr[n] = { TP: 0, FP: 0, FN: 0, TN: 0 });
let falhasNovas = 0, conhecidasFalhando = 0, corrigidas = [];
const relatorio = [];

for (const c of casos) {
  const a = rodar(c), todas = [...a.checks, ...a.comp], problemas = [];
  for (const [nome, esp] of Object.entries(c.expect || {})) {
    const v = todas.find(x => x.nome === nome);
    if (!v) { problemas.push(`verificação "${nome}" não existe (nome mudou?)`); continue; }
    const obteve = v.nivel === "ok" ? "ok" : "alerta", mt = m(nome);
    if (esp === "alerta") mt[obteve === "alerta" ? "TP" : "FN"]++; else mt[obteve === "alerta" ? "FP" : "TN"]++;
    if (obteve !== esp) problemas.push(`${nome}: esperado ${esp}, obteve ${v.nivel}` + (esp === "ok" ? ` (falso alerta) → "${v.msg}"` : ` (problema não detectado) → "${v.msg}"`));
  }
  for (const [nome, re] of Object.entries(c.naoMencionar || {})) {
    const v = todas.find(x => x.nome === nome);
    if (v && re.test((v.msg || "") + " " + (v.dica || ""))) problemas.push(`${nome}: não deveria mencionar ${re} → "${((v.msg || "") + " " + (v.dica || "")).trim()}"`);
  }
  if (c.score && (a.score < c.score[0] || a.score > c.score[1])) problemas.push(`nota ${a.score} fora da faixa esperada [${c.score[0]}, ${c.score[1]}]`);

  const passou = problemas.length === 0;
  if (!passou && !c.known) falhasNovas++;
  if (!passou && c.known) conhecidasFalhando++;
  if (passou && c.known) corrigidas.push(c.id);
  relatorio.push({ c, passou, problemas, score: a.score });
}

// ── 4. Relatório ──
const marca = r => r.passou ? (r.c.known ? "✔ CORRIGIDO" : "✔") : (r.c.known ? "• conhecido" : "✘ FALHA");
console.log(`\nGolden test — ${casos.length} casos | arquivo: ${arqHtml}\n`);
for (const r of relatorio) {
  if (!verbose && r.passou && !r.c.known) continue;
  console.log(`${marca(r).padEnd(12)} ${r.c.id}  (nota ${r.score}) — ${r.c.desc}`);
  if (!r.passou) r.problemas.forEach(p => console.log("             └ " + p));
}

console.log("\nPrecisão/recall por verificação (só casos com expectativa):");
console.log("verificação".padEnd(38) + "TP FP FN TN   precisão  recall");
for (const [nome, v] of Object.entries(metr)) {
  const p = v.TP + v.FP ? Math.round(100 * v.TP / (v.TP + v.FP)) + "%" : "–", r = v.TP + v.FN ? Math.round(100 * v.TP / (v.TP + v.FN)) + "%" : "–";
  console.log(nome.padEnd(38) + [v.TP, v.FP, v.FN, v.TN].map(x => String(x).padStart(2)).join(" ") + "   " + p.padStart(7) + "  " + r.padStart(6));
}
console.log("\n  FP = falso alerta (alertou sem motivo) | FN = problema que passou despercebido");

const ok = casos.length - falhasNovas - conhecidasFalhando;
console.log(`\nResumo: ${ok} passam | ${conhecidasFalhando} falhas conhecidas | ${falhasNovas} falhas NOVAS`);
if (corrigidas.length) console.log("Agora passam (remova known:true em casos.js): " + corrigidas.join(", "));
process.exit(falhasNovas ? 1 : 0);
