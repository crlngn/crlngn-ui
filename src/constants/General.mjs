export const MODULE_ID = "crlngn-ui";
export const MODULE_TITLE = "Carolingian UI";
export const MODULE_SHORT = "crlngn-ui";
export const DEBUG_TAG = [
  `%cCarolingian UI`,
  `color:rgb(107, 72, 149); font-weight: bold;`,
  `|`,
];

export const ROLL_TYPES = {
  abilityCheck: "ability",
  abilitySave: "save",
  attack: "attack",
  check: "check",
  concentration: "concentration",
  damage: "damage",
  deathSave: "death",
  formula: "formula",
  healing: "heal",
  custom: "roll",
  skillCheck: "skill",
  toolCheck: "tool"
}

export const CHAR_ABILITIES = [
  { abbrev: "str", name: "strength" },
  { abbrev: "dex", name: "dexterity" },
  { abbrev: "con", name: "constitution" },
  { abbrev: "int", name: "intelligence" },
  { abbrev: "wis", name: "wisdom" },
  { abbrev: "cha", name: "charisma" }
]

export const CLASS_PREFIX = 'crlngn';

export const DARK_MODE_RULES = `
  --background: var(--color-dark-bg-95) !important;
  --filigree-background-color: var(--color-dark-bg-10) !important;
  --dnd5e-border-dotted: 1px dotted var(--color-cool-4) !important;
  --dnd5e-color-gold: rgba(159, 146, 117, 0.6) !important;
  --input-background-color: var(--color-cool-4) !important;
  --chat-dark-blue: rgba(24, 32, 38, 1) !important;
  --input-background-alt: var(--color-dark-bg-50) !important;
  --color-text-secondary: var(--color-light-1) !important;
  --color-text-primary: var(--color-light-1) !important;
  --button-text-color: var(--color-light-1) !important;
  --color-border-light-1: var(--dnd5e-color-gold) !important;
  --color-text-dark-input: var(--color-light-3) !important;
  --color-border-trait: var(--color-cool-4) !important;

  --crlngn-button-bg: rgba(15, 15, 15, 0.15) !important;
  --color-bg-button: rgba(32, 37, 43, 1) !important;
  --dnd5e-border-groove: 1px solid rgba(36, 36, 36, 0.5) !important;
  --dnd5e-color-groove: var(--dnd5e-color-gold) !important;
  --dnd5e-sheet-bg: rgb(37, 40, 48) !important;
  --sidebar-background: var(--control-bg-color, var(--color-cool-5-90)) !important;
  --dnd5e-color-parchment: rgb(32, 37, 43) !important;
  --dnd5e-background-card: rgb(32, 37, 43) !important; 
  --dnd5e-background-parchment: var(--color-cool-4) !important;

  --color-pf-alternate: rgba(82, 107, 120, 0.44) !important;
  --color-text-gray-blue: rgb(168, 180, 188, 1) !important;
  --color-text-gray-blue-b: rgb(138, 155, 168, 1) !important;
  --chat-button-bg: rgba(32, 37, 43, 1) !important;
  --chat-button-bg-15: rgba(32, 37, 43, 0.15) !important;
  --chat-button-bg-25: rgba(32, 37, 43, 0.25) !important;
  --chat-button-bg-50: rgba(32, 37, 43, 0.5) !important;
  --chat-button-bg-75: rgba(32, 37, 43, 0.75) !important;
  --chat-dark-blue: rgba(24, 32, 38, 1) !important;
  --chat-dark-blue-b: rgb(29, 36, 48, 1) !important; 
  --chat-dark-bg: rgba(32, 37, 43, 1) !important; 
  --chat-dark-bg-15: rgba(32, 37, 43, 0.15) !important;
  --chat-dark-bg-25: rgba(32, 37, 43, 0.25) !important;
  --chat-dark-bg-50: rgba(32, 37, 43, 0.50) !important; 
  --chat-dark-bg-75: rgba(32, 37, 43, 0.75) !important; 
  --chat-dark-bg-90: rgba(32, 37, 43, 0.90) !important; 

  --color-input-bg: var(--color-dark-bg-50) !important; 

  --color-button-bg: rgba(90,120,150,0.5) !important;
  --color-input-border: rgba(90,120,150, 0.5) !important;
  --color-border-dark-5: rgba(80, 80, 80, 1) !important;
  --color-sidebar-font: rgba(213, 221, 230, 0.8) !important;

  --color-text-dark: rgba(235,235,235,1) !important;
  --color-text-dark-op: rgba(235,235,235,0.6) !important;
  --color-text-light: rgba(235,235,235,1) !important;
  --input-background-alt: var(--color-cool-5) !important;
  --color-text-secondary:var(--color-light-3) !important;
  --color-text-primary: var(--color-light-1) !important;

  --color-text-dark-primary: var(--color-light-1) !important;
  --button-border-color: transparent;

  background: var(--color-dark-bg-90) !important;
  color: var(--color-light-1) !important;

  .window-header, header, footer {
    background-color: var(--color-dark-bg-75) !important;
    color: var(--color-light-1) !important;
    box-shadow: none;
  }
  
  .window-content {
    background: var(--color-dark-bg-25) !important;
    color: var(--color-light-1) !important;
  }

  .window-header{
    border-bottom: 1px solid var(--color-cool-4) !important;
  }

  section.window-content form.crb-style header.char-header .char-level .level, section.window-content form.crb-style {
    background: transparent !important;
  }
  form.crb-style aside .sidebar * {
    background: transparent !important;
  }

  p, span, div:not(.currency-image), aside, section, nav, label, form, button, table, td, tr, th, h1, h2, h3, h4, h5, h6, ul, ol, li, b, strong, u{
    background-color: transparent;
    border-color: var(--color-cool-4);
  }

  *{
    color: var(--color-light-1);
  }

  a.content-link, a.inline-roll  {
    background-color: transparent !important;
    color: var(--color-light-1) !important;
  }
  p{
     line-height: 1.75;
  }

  input:not([type="range"]), select {
    background-color: var(--color-cool-4);
    color: var(--color-light-1);
    border-color: var(--color-cool-4);
  }

  select option {
    background: transparent;
  }

  fieldset {
    border-color: var(--color-cool-4);
  }

  button, .window-resizable-handle{
    color: var(--color-light-1) !important;
    border-color: transparent;
    background-color: var(--color-bg-button) !important;
  }

  button:hover{
    background-color: var(--color-warm-2) !important;
  }
`;