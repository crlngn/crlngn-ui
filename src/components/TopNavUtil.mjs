import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class TopNavigation {
  static #navElem;
  static #scenesList;
  static #navTimeout;
  static #navExtras;
  static #navToggle;
  static #uiMiddle;
  static #timeout;
  static SETTINGS;
  static navSettings;
  static isCollapsed;
  static navPos;
  static sceneFoldersTemplate;
  static #timeout;
  static #collapseTimeout;

  static init = async() => {
    const SETTINGS = getSettings();
    TopNavigation.navSettings = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);
    TopNavigation.isCollapsed = SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag);
    TopNavigation.navPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag);

    // if user disabled Scene Navigation Styles,
    // skip everything
    const uiMiddle = document.querySelector("#ui-middle");
    let navSettings = TopNavigation.navSettings;
    LogUtil.log("SCENE NAV INIT", [navSettings.sceneNavEnabled]);
    if(navSettings.sceneNavEnabled && uiMiddle){
      uiMiddle.classList.add("crlngn-ui");
    }else if(uiMiddle){
      uiMiddle.classList.remove("crlngn-ui");
      return;
    }

    TopNavigation.resetLocalVars();

    // If Monk's Scene Navigation is enabled, disable Carolingian UI Top Navigation
    const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    if(isMonksScenenNavOn && navSettings.sceneNavEnabled){
      // &.navigation-collapsed, &.with-monks-scene
      if(game.user.isGM){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {permanent: true});
      }
      uiMiddle.classList.remove("crlngn-ui");
      SettingsUtil.set(SETTINGS.sceneNavMenu.tag, {
        ...navSettings,
        sceneNavEnabled: false
      });
    }
    
    LogUtil.log("TopNavigation - init", [ isMonksScenenNavOn ]);

    if(!isMonksScenenNavOn){
      SceneNavFolders.init();
      TopNavigation.resetLocalVars();
      
      TopNavigation.setNavPosition();
      TopNavigation.placeNavButtons(); 
      TopNavigation.toggleNav(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag));
    }else{
      uiMiddle.classList.add('with-monks-scene');
    }
    // LogUtil.log("RENDER_NAV", [ui.nav, game]);

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, (a, b, c, d) => { 
      LogUtil.log("SCENE NAV", [a, b, c, d]);
      const SETTINGS = getSettings();
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [ isMonksScenenNavOn ]);
      
      if(!isMonksScenenNavOn){
        LogUtil.log("NAV no transition add");
        TopNavigation.navPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag);

        TopNavigation.resetLocalVars();
        SceneNavFolders.renderSceneFolders();
        if(this.#scenesList) this.#scenesList.classList.add("no-transition");
        LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, []); 
        
        TopNavigation.placeNavButtons();
        TopNavigation.addListeners();
        // TopNavigation.observeNavOffset();
        TopNavigation.setNavPosition();
        TopNavigation.toggleNav(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag));
        //
        clearTimeout(TopNavigation.#timeout);
        TopNavigation.#timeout = setTimeout(()=>{
          if(this.#scenesList) this.#scenesList.classList.remove("no-transition");
          LogUtil.log("NAV no transition remove");
        }, 500);
      }

      LogUtil.log("SCENE NAV STATE", [SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)]);
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (value) => { 
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, ["isMonksScenenNavOn",isMonksScenenNavOn]);
      if(!isMonksScenenNavOn){
        TopNavigation.placeNavButtons(); 
      }
      
      
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, collapsed) => {
      const SETTINGS = getSettings();
      SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, collapsed); 
      LogUtil.log("NAV toggle", [nav, collapsed]); 


      TopNavigation.isCollapsed = collapsed;
      // const uiMiddle = document.querySelector("#ui-middle");

      TopNavigation.toggleNav(collapsed);
    }); 

    Hooks.on(HOOKS_CORE.EXPAND_SCENE_NAV, (nav, value) => {
      // const SETTINGS = getSettings();
      LogUtil.log("NAV expand", [nav, false]); 
      // SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, false); 
      // TopNavigation.isCollapsed = false;
    }); 

    // SettingsUtil.apply(SETTINGS.sceneNavCollapsed.tag); 
    window.addEventListener('resize', ()=>{
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      if(!isMonksScenenNavOn){
        TopNavigation.placeNavButtons();
      }
    });

    LogUtil.log("TopNavigation - init", [navSettings.sceneNavEnabled])
    
    // if(navSettings.sceneNavEnabled){ 
    //   // TopNavigation.observeNavOffset(); 
    // } 

    
  } 

  static toggleNav(collapsed){
    clearTimeout(TopNavigation.#collapseTimeout);
    TopNavigation.#collapseTimeout = setTimeout(()=>{
      if(collapsed){
        ui.nav.collapse();
        uiMiddle.classList.add('navigation-collapsed');
      }else{
        ui.nav.expand();
        uiMiddle.classList.remove('navigation-collapsed');
      }
    }, 500);
    
  }

  static resetLocalVars(){
    TopNavigation.#navElem = document.querySelector("#navigation"); 
    TopNavigation.#scenesList = document.querySelector("#scene-list"); 
    TopNavigation.#navExtras = document.querySelector("#navigation .nav-item.is-root"); 
    TopNavigation.#navToggle = document.querySelector("#nav-toggle"); 
    // TopNavigation.#leftControls = document.querySelector("#ui-left #controls"); 
  }

  static addListeners(){
    TopNavigation.#navElem?.addEventListener("mouseenter", ()=>{
      LogUtil.log("TopNavigation mouseenter", [ ]);
    
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.navSettings?.showNavOnHover ){ 
            return;
      }
      clearTimeout(this.#navTimeout);

      const list = document.querySelector("#scene-list");
      if(list) {list.style.display = "flex";}
      const navigation = document.querySelector("#navigation");
      navigation.classList.remove("collapsed");
    });

    this.#navElem?.addEventListener("mouseleave", (e)=>{
      LogUtil.log("TopNavigation mouseleave", [ ]);
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.navSettings?.showNavOnHover ){ 
          return;
      }
      if (!e) var e = window.event;
      e.cancelBubble = true;
      if (e.stopPropagation) e.stopPropagation();

      this.#navTimeout = setTimeout(()=>{
        clearTimeout(this.#navTimeout);
        this.#navTimeout = null;
        const list = document.querySelector("#scene-list");
        if(list) {list.style.display = "none";}
        const navigation = document.querySelector("#navigation");
        navigation.classList.add("collapsed");
      }, 700);
    });
  }

  static placeNavButtons(){ 
    TopNavigation.resetLocalVars();

    const existingButtons = this.#navElem?.querySelectorAll("button.crlngn-nav");
    const isNavOverflowing = this.#scenesList?.scrollWidth >= this.#navElem?.offsetWidth;
    LogUtil.log("placeNavButtons", [ isNavOverflowing, existingButtons, this.#scenesList?.scrollWidth, this.#navElem?.offsetWidth]);
    
    if(!isNavOverflowing || existingButtons.length > 0){
      return;
    }

    const btnLast = document.createElement("button"); 
    btnLast.classList.add("crlngn-nav"); 
    btnLast.classList.add("ui-nav-left"); 
    const arrowLeft = document.createElement("i"); 
    arrowLeft.classList.add("fa"); 
    arrowLeft.classList.add("fa-chevron-left"); 
    btnLast.addEventListener("click", this.#onNavLast);
    btnLast.append(arrowLeft); 

    const btnNext = document.createElement("button"); 
    btnNext.classList.add("crlngn-nav"); 
    btnNext.classList.add("ui-nav-right"); 
    const arrowRight = document.createElement("i"); 
    arrowRight.classList.add("fa"); 
    arrowRight.classList.add("fa-chevron-right"); 
    btnNext.append(arrowRight); 
    btnNext.addEventListener("click", this.#onNavNext);

    this.#navElem?.appendChild(btnLast);
    this.#navElem?.appendChild(btnNext);
  }


  static #onNavLast = (e) => {
    const toggleWidth = this.#navToggle?.offsetWidth;
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth : 0;
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = TopNavigation.navPos || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth : 0) - (toggleWidth*2))/itemWidth);

    LogUtil.log("onNavLast", ["currPos", currPos, itemsPerPage]);

    let newPos = currPos - itemsPerPage;
    newPos = newPos < 0 ? 0 : newPos;

    LogUtil.log("onNavLast", ["sceneCount", scenes.length, currPos, newPos]);
    TopNavigation.setNavPosition(newPos); 
  }

  static #onNavNext = (e) => {
    // const SETTINGS = getSettings();
    const toggleWidth = this.#navToggle?.offsetWidth;
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth : 0;
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = TopNavigation.navPos || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth : 0) - (toggleWidth*2))/itemWidth);

    LogUtil.log("onNavLast", ["currPos", currPos, itemsPerPage]);

    let newPos = currPos + itemsPerPage;
    newPos = newPos > scenes.length ? scenes.length : newPos;

    TopNavigation.setNavPosition(newPos); 
  }

  static setNavPosition(pos) { 
    const SETTINGS = getSettings();
    if(!this.#scenesList){ return; }
    const position = pos !== undefined ? pos : TopNavigation.navPos || 0;
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item") || [];

    
    const newMargin = scenes[position]?.offsetLeft * -1;
    this.#scenesList.style.marginLeft = newMargin + 'px';

    SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);

    LogUtil.log("setNavPosition", [pos, position, scenes[position], newMargin]);
  }

  
  
}

/*
getData(options={}) {
  let favLabel = game.i18n.localize("CRLNGN_UI.settings.sceneGroupsNav.folderFavorites");
  let favGroup = { 
    id: 'crlngn-scene-groups-favorites', 
    active: true, 
    name: favLabel, 
    icon: "fa-star", 
    tooltip: game.user.isGM ? favLabel : null, 
    users: [], 
    visible: true, 
    css: "gm active" 
  }; 

  let folders = [];
  folders = ui.scenes.folders.filter(f => { 
    return f.folder === null; // true;
  });

  folders.sort((a, b) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  });

  let folderList = folders.map(folder => {
    return {
      id: folder.id,
      active: true,
      name: folder.name,
      icon: "fa-folder",
      tooltip: folder.name,
      users: [],
      visible: game.user.isGM || folder.isOwner,
      css: "gm"
    };
  });
  folderList = [favGroup, ...folderList];

  LogUtil.log("SceneGroupsNavigation", [folders]);
  let sceneList = this.scenes.map(scene => {
    return {
      id: scene.id,
      active: scene.active,
      name: TextEditor.truncateText(scene.navName || scene.name, {maxLength: 32}),
      tooltip: scene.navName && game.user.isGM ? scene.name : null,
      users: game.users.reduce((arr, u) => {
        if ( u.active && ( u.viewedScene === scene.id) ) arr.push({letter: u.name[0], color: u.color.css});
        return arr;
      }, []),
      visible: game.user.isGM || scene.isOwner || scene.active,
      css: [
        scene.isView ? "view" : null,
        scene.active ? "active" : null,
        scene.ownership.default === 0 ? "gm" : null
      ].filterJoin(" ")
    };
  });
  return {collapsed: this._collapsed, scenes: sceneList, folders: folderList};
}*/