/**
 * Carolingian UI — Foundry generation loader.
 * This file is shipped unbundled as dist/scripts/crlngn-ui.js and is the module's
 * only manifest entry point. During the core init hook it detects the running
 * Foundry generation, injects the matching stylesheet, and dynamically imports the
 * matching JS bundle (scripts/v13/ or scripts/v14/), so only one build is ever
 * fetched by the browser. Bundles export initialize(), called here because their
 * own init hook registrations would be too late to fire.
 * Foundry generations newer than the newest available build fall back to that build.
 */
const MODULE_ID = "crlngn-ui";

Hooks.once("init", () => {
  const generation = Number(game.release?.generation) || 13;
  const build = generation >= 14 ? "v14" : "v13";
  const moduleVersion = game.modules?.get(MODULE_ID)?.version || "";
  console.log(`${MODULE_ID} | Foundry v${game.version} — loading ${build} build (module ${moduleVersion})`);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `modules/${MODULE_ID}/styles/crlngn-ui-${build}.css?v=${moduleVersion}`;
  document.head.appendChild(link);

  import(`./${build}/crlngn-ui.js?v=${moduleVersion}`)
    .then((bundle) => bundle.initialize())
    .catch((err) => console.error(`${MODULE_ID} | Failed to initialize ${build} build:`, err));
});
