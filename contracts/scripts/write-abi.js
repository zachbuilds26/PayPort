const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const artifact = JSON.parse(readFileSync(join(__dirname,"..","artifacts","contracts","PayPort.sol","PayPort.json"), "utf8"));
const out = join(__dirname,"..","..","src","lib","payport-abi.ts");
writeFileSync(out,
  "// Generated from the compiled PayPort artifact. Do not edit by hand.\n" +
  "// Regenerate with: node contracts/scripts/write-abi.js\n\n" +
  "export const PAYPORT_ABI = " + JSON.stringify(artifact.abi, null, 2) + " as const;\n",
  "utf8");
console.log("wrote", out, "-", artifact.abi.length, "entries");
