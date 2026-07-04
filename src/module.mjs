import { initLibWrapperShim } from './lib/libwrapper-shim.js';

import "./styles/vars.css";
import "./styles/main.css";
import "./styles/ui-left.css";
import "./styles/ui-right.css";
import "./styles/ui-middle.css";
import "./styles/scene-nav.css";
import "./styles/chat-tokens.css";
import "./styles/chat.css";
import "./styles/camera.css";
import "./styles/sheets.css";
import "./styles/players-list.css";
import "./styles/combat-tracker.css";
import "./styles/other-modules.css";
import "./styles/systems/daggerheart.css";
import "./styles/systems/daggerheart-colors.css";
import "./styles/systems/daggerheart-fonts.css";
import "./styles/systems/daggerheart-tracker.css";
import "./styles/systems/pf2e-sheets.css";
import "./styles/systems/sf2e-sheets.css";
import "./styles/systems/mosh-unofficial.css";
import "./styles/systems/blade-runner.css";
import "./styles/systems/swade.css";
import "./styles/systems/ose.css";

import { Main } from "./components/Main.mjs";

Main.init();

/**
 * Entry point used by the generation loader (scripts/crlngn-ui.js) in the merged
 * package, which imports this bundle during the core init hook — too late for the
 * init hook registrations made above, so the init work is invoked directly. Later
 * hooks (ready, canvas, render) are registered normally by Main.init() on import.
 */
export function initialize(){
  initLibWrapperShim();
  Main.onInit();
}