import { BACK_BUTTON_OPTIONS, getSettings } from "../constants/Settings.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";
import { Sortable } from "sortablejs";

const DEFAULT_FOLDER_ID = "root";

/**
 * Manages scene navigation folders in the UI, providing functionality for folder organization,
 * selection, and display of scene folders.
 */
export class SceneNavFolders {
  static selectedFolder = DEFAULT_FOLDER_ID;
  static #currSceneSortMode = "a";
  static #activeSceneFolders = [];
  static searchValue = "";

  /**
   * Initializes the scene folders functionality by setting up event hooks
   * @static
   */
  static init() {
    if (SceneNavFolders.noFolderView() || !ui.scenes) { return; }
    SceneNavFolders.preloadTemplates();

    // Initialize user flags for active scene folders if they don't exist
    if (!game.user.getFlag(MODULE_ID, "activeSceneFolders")) {
      game.user.setFlag(MODULE_ID, "activeSceneFolders", []);
    }

    const inactiveList = document.querySelector("#scene-navigation-inactive");
    const folderItems = inactiveList?.querySelectorAll("li.folder") || [];
    folderItems.forEach(ff => {
      ff.remove();
    });

    Hooks.on(HOOKS_CORE.RENDER_SCENE_DIRECTORY, (app, html) => {
      SceneNavFolders.#updateSortMode();
    });

    if (game.user.isGM) {
      SceneNavFolders.#registerFolderContextMenu();
    }
  }

  /**
   * Registers context menu items for folders in the Scene Directory sidebar
   * Adds "Add to Navigation" / "Remove from Navigation" options
   */
  static #registerFolderContextMenu() {
    const SETTINGS = getSettings();
    Hooks.on(HOOKS_CORE.GET_FOLDER_CONTEXT, (app, menuItems) => {
      menuItems.push({
        name: "CRLNGN_UI.ui.sceneNav.addToFavorites",
        icon: '<i class="fa-solid fa-compass"></i>',
        condition: header => {
          const li = header.closest(".directory-item");
          const folder = fromUuidSync(li?.dataset?.uuid);
          if (!folder || folder.type !== "Scene") return false;
          const hidden = SceneNavFolders.getHiddenNavFolders();
          return hidden.includes(folder.id);
        },
        callback: header => {
          const li = header.closest(".directory-item");
          const folder = fromUuidSync(li?.dataset?.uuid);
          if (folder) SceneNavFolders.toggleNavFolder(folder.id, false);
        }
      });
      menuItems.push({
        name: "CRLNGN_UI.ui.sceneNav.removeFromFavorites",
        icon: '<i class="fa-solid fa-compass"></i>',
        condition: header => {
          const li = header.closest(".directory-item");
          const folder = fromUuidSync(li?.dataset?.uuid);
          if (!folder || folder.type !== "Scene") return false;
          const hidden = SceneNavFolders.getHiddenNavFolders();
          return !hidden.includes(folder.id);
        },
        callback: header => {
          const li = header.closest(".directory-item");
          const folder = fromUuidSync(li?.dataset?.uuid);
          if (folder) SceneNavFolders.toggleNavFolder(folder.id, true);
        }
      });
    });
  }

  /**
   * Add Scene folders to scene navigation bar
   * @param {SceneNavigation} nav - The scene navigation instance
   * @param {HTMLElement} navHtml - The navigation HTML element
   * @param {SceneNavData} navData - The scene navigation data
   */
  static addFolderButtons(nav, navHtml, navData){
    if(!TopNavigation.useSceneFolders ||
      game.scenes.size < 2 || game.scenes.folders.size < 1
    ){ return; }
    const SETTINGS = getSettings();

    // if button already exists, return
    const existingFolderToggle = document.querySelector("#crlngn-folder-toggle");
    if(existingFolderToggle){
      return;
    }

    const activeScenesMenu = navHtml.querySelector("#scene-navigation-active");
    const firstActiveItem = activeScenesMenu?.querySelector("li.scene");
    const folderToggleTooltip = `CRLNGN_UI.ui.sceneNav.${TopNavigation.navShowRootFolders ? "hideSceneFoldersTooltip" : "showSceneFoldersTooltip"}`;

    const folderToggle = document.createElement("div");
    folderToggle.dataset.tooltip = game.i18n.localize(folderToggleTooltip);
    folderToggle.id = "crlngn-folder-toggle";
    folderToggle.innerHTML = `<i class='fa-solid icon'></i>`;

    folderToggle.addEventListener("click", ()=>{
      TopNavigation.setNavPosition(0);
      const toggleOn = !TopNavigation.navShowRootFolders;
      SettingsUtil.set(SETTINGS.navShowRootFolders.tag, toggleOn);
      // placeNavButtons is called by renderFolderList after folders are rendered
      // and again after 500ms timeout in onRender to ensure proper overflow detection
    });
    activeScenesMenu?.append(folderToggle);

    if(TopNavigation.navShowRootFolders){
      activeScenesMenu?.classList.add('with-folders');
    }else{
      activeScenesMenu?.classList.remove('with-folders');
    }
  }

  static renderFolderList = async (folderElement) => {
    SceneNavFolders.#activeSceneFolders = game.user.getFlag(MODULE_ID, "activeSceneFolders") || [];

    // Clean up stale folder IDs that no longer exist
    const validFolderIds = SceneNavFolders.#activeSceneFolders.filter(folderId => {
      return game.folders?.get(folderId)?.type === 'Scene';
    });
    if (validFolderIds.length !== SceneNavFolders.#activeSceneFolders.length) {
      SceneNavFolders.#activeSceneFolders = validFolderIds;
      game.user.setFlag(MODULE_ID, "activeSceneFolders", validFolderIds);
      LogUtil.log("Cleaned up stale folder IDs", [validFolderIds]);
    }

    let targetElement;
    const allFolders = ui.scenes.collection.folders;
    const folder = folderElement ? allFolders.get(folderElement.dataset.folderId) : { name: "", id: DEFAULT_FOLDER_ID };
    const templateData = SceneNavFolders.buildTemplateData(folder);
    const renderedHtml = await GeneralUtil.renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-folders.hbs`, 
      templateData
    );
    // LogUtil.log("renderFolderList",[folder, SceneNavFolders.#activeSceneFolders, renderedHtml]);

    if(!folderElement){ // if root folder
      targetElement = document.querySelector("#scene-navigation-inactive");
    }else{
      targetElement = folderElement.parentNode;
    }
    targetElement.insertAdjacentHTML('afterbegin', renderedHtml);

    const folderItems = targetElement.querySelectorAll("li.folder");
    SceneNavFolders.addFolderListeners(folderItems);
    TopNavigation.placeNavButtons();
  }

  static handleFolderLookup = async() => {
    // const templateData = SceneNavFolders.buildLookupData();
    const renderedHtml = await GeneralUtil.renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-lookup.hbs`, 
      {}
    );
    const lookupList =  document.querySelector("#crlngn-lookup-list");
    if(lookupList) lookupList.remove();

    const targetElement = document.querySelector("#crlngn-scene-lookup");
    targetElement.insertAdjacentHTML('beforeend', renderedHtml);

    const searchInput = targetElement.querySelector('.search-container .input-scene-search');
    searchInput.addEventListener("keyup", SceneNavFolders.onSearchInput);
    searchInput.addEventListener('keydown', evt => {
      evt.stopPropagation();
    });

    const folderLookupBtn = targetElement?.querySelector(".scene-lookup-toggle");
    if(folderLookupBtn){
      folderLookupBtn.addEventListener("click", SceneNavFolders.toggleFolderLookup);
    }
  }

  static addFolderListeners = (folderItems) => {
    const allFolders = ui.scenes.collection.folders;

    if(!folderItems){return;}
    folderItems.forEach( item => {
      const folderItemEl = item.querySelector(".folder-item");
      folderItemEl.addEventListener('click', SceneNavFolders.#onNavFolderClick);

      if (game.user?.isGM) {
        SceneNavFolders.#addNavFolderContextMenu(item, folderItemEl);
      }

      const id = item.dataset.folderId;
      const itemFolder = allFolders.get(id);
      const isActive = SceneNavFolders.#activeSceneFolders.includes(id);

      LogUtil.log("addFolderListeners isActive", [isActive, id, itemFolder.name]);
      if(isActive){
        item.classList.add('crlngn-folder-active');
        SceneNavFolders.injectSubfolders(itemFolder, item);

        const isVertical = TopNavigation.subFoldersLayout === "vertical";
        const parentIsContents = item.parentNode?.classList.contains("contents");
        if(isVertical && parentIsContents){
          const siblingScenes = item.parentNode.querySelectorAll(":scope > li.scene");
          siblingScenes.forEach(li => li.classList.add("crlngn-siblings-hidden"));
        }
      }
    });
  }

  /**
   * Attaches a right-click context menu listener on a folder item in the scene navigation bar
   * @param {HTMLElement} folderLi - The li.folder element
   * @param {HTMLElement} folderItemEl - The .folder-item div inside the li
   */
  static #addNavFolderContextMenu(folderLi, folderItemEl) {
    const folderId = folderLi.dataset.folderId;
    if (!folderId) return;
    folderItemEl.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Close any existing context menu
      ui.context?.close();

      const label = game.i18n.localize("CRLNGN_UI.ui.sceneNav.removeFromFavorites");
      const menu = document.createElement("nav");
      menu.id = "context-menu";
      menu.className = "context-items";
      menu.innerHTML = `<ol class="context-items">
        <li class="context-item">
          <i class="fa-solid fa-compass"></i> ${label}
        </li>
      </ol>`;

      menu.querySelector(".context-item").addEventListener("click", (e) => {
        e.stopPropagation();
        menu.remove();
        SceneNavFolders.toggleNavFolder(folderId, true);
      });

      // Close on click outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu, true);
          document.removeEventListener("contextmenu", closeMenu, true);
        }
      };
      document.addEventListener("click", closeMenu, true);
      document.addEventListener("contextmenu", closeMenu, true);

      // Position near the click
      document.body.appendChild(menu);
      const menuRect = menu.getBoundingClientRect();
      let top = event.clientY;
      let left = event.clientX;
      if (top + menuRect.height > window.innerHeight) top = window.innerHeight - menuRect.height;
      if (left + menuRect.width > window.innerWidth) left = window.innerWidth - menuRect.width;
      menu.style.position = "fixed";
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.zIndex = "10000";
    });
  }

  /**
   * Event for when user expands the folder lookup element
   * @param {Event} event
   */
  static toggleFolderLookup(event){
    const parent = event.target.parentNode;

    if(parent.classList.contains('open')){
      parent.classList.remove('open');
    }else{
      parent.classList.add('open');
    }
  }

  static #onNavFolderClick = async(event) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    const offsetLeft = target.offsetLeft;
    const renderedSubmenu = '';
    const activeFolders = target.parentNode.parentNode.querySelectorAll('.crlngn-folder-active');

    const id = target.dataset.folderId || target.parentNode.dataset.folderId;
    const allFolders = ui.scenes.collection.folders;
    const folder = id ? allFolders.get(id) : null;

    if(!folder){ return; }

    const isActive = target.classList.contains("crlngn-folder-active") || target.parentNode.classList.contains("crlngn-folder-active");

    // Collect nested folder IDs BEFORE injectSubfolders removes them from DOM
    let nestedFolderIds = [];
    if (isActive) {
      const folderElement = target.parentNode;
      nestedFolderIds = Array.from(folderElement.querySelectorAll('li.folder') || [])
        .map(f => f.dataset.folderId);
    }

    await SceneNavFolders.injectSubfolders(folder, target.parentNode);

    TopNavigation.addSceneListeners(target.parentNode);
    LogUtil.log("onNavFolderClick", [target, target.parentNode, target.parentNode.dataset]);

    // target.parentNode.style.setProperty('--parent-offset-left', offsetLeft + 'px');

    if(isActive){
      SceneNavFolders.updateActiveFolders(id, true, nestedFolderIds);
    }else{
      SceneNavFolders.updateActiveFolders(id, false);
    }
  }

  static injectSubfolders = async(folder, targetElement) => {
    const folderData = SceneNavFolders.buildTemplateData(folder);
    const renderedSubfolders = await GeneralUtil.renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-subfolders.hbs`,
      folderData
    );
    const contents = targetElement.querySelector(".contents");
    if(contents) contents.remove();
    targetElement.insertAdjacentHTML('beforeend', renderedSubfolders);

    const folderItems = targetElement.querySelectorAll("li.folder");
    SceneNavFolders.addFolderListeners(folderItems);
    TopNavigation.addSceneListeners(targetElement.querySelector(".contents"));
    // Note: applySceneNavOffset is called by updateActiveFolders after folder state is properly updated
  }

  static updateActiveFolders = async (id, remove=false, nestedFolderIds=[]) => {
    const inactiveList = document.querySelector("#scene-navigation-inactive");
    const target = inactiveList?.querySelector(`li.folder[data-folder-id="${id}"]`);
    const idIndex = SceneNavFolders.#activeSceneFolders.indexOf(id);

    LogUtil.log("updateActiveFolders A", [idIndex, id, game.user.getFlag(MODULE_ID, "activeSceneFolders"), SceneNavFolders.#activeSceneFolders]);

    const isVertical = TopNavigation.subFoldersLayout === "vertical";
    const parentIsContents = target?.parentNode?.classList.contains("contents");

    if(remove){
      // When closing a folder, also remove all nested child folder IDs
      // nestedFolderIds is passed from #onNavFolderClick (collected before DOM removal)
      const idsToRemove = [id, ...nestedFolderIds];
      SceneNavFolders.#activeSceneFolders = SceneNavFolders.#activeSceneFolders.filter(fid => !idsToRemove.includes(fid));
      target?.classList.remove('crlngn-folder-active');

      if(isVertical && parentIsContents){
        const siblingScenes = target.parentNode.querySelectorAll(":scope > li.scene");
        siblingScenes.forEach(li => li.classList.remove("crlngn-siblings-hidden"));
      }
    }else if(!SceneNavFolders.#activeSceneFolders.includes(id)){
      const siblings = target.parentNode.querySelectorAll("li.folder");
      siblings.forEach(sibling => {
        if(sibling !== target){
          SceneNavFolders.#activeSceneFolders = SceneNavFolders.#activeSceneFolders.filter(fid => fid !== sibling.dataset.folderId);
          sibling.classList.remove('crlngn-folder-active');
        }
      });
      SceneNavFolders.#activeSceneFolders.push(id);
      target.classList.add('crlngn-folder-active');

      if(isVertical && parentIsContents){
        const siblingScenes = target.parentNode.querySelectorAll(":scope > li.scene");
        siblingScenes.forEach(li => li.classList.add("crlngn-siblings-hidden"));
      }
    }

    await game.user.setFlag(MODULE_ID, "activeSceneFolders", SceneNavFolders.#activeSceneFolders);
    LogUtil.log("updateActiveFolders B", [remove, id, game.user.getFlag(MODULE_ID, "activeSceneFolders"), SceneNavFolders.#activeSceneFolders]);

    // Update scene nav offset and nav buttons after folder state changes
    setTimeout(() => {
      TopNavigation.applySceneNavOffset();
      TopNavigation.placeNavButtons();
    }, 30);
  }

  /**
   * Retrieves and sorts top-level folders from the provided folder list
   * @param {object[]} fromList - Array of folder objects to filter
   * @returns {object[]} Sorted array of top-level folders
   */
  // static getFolders = (fromList) => {
  //   // Helper function to recursively set isOpen state
  //   const setFolderOpenState = (folder) => {
  //     folder.isOpen = SceneNavFolders.#folderToggleStates[folder.id] ?? false;
  //     folder.children.forEach(setFolderOpenState);
  //   };

  //   // Get top-level folders
  //   let folders = fromList.filter(f => f.folder === null);
  //   // Process each top-level folder and its children
  //   folders.forEach(setFolderOpenState);
  //   LogUtil.log("getFolders / sortOrder", [SceneNavFolders.#currSceneSortMode]);
  //   if(SceneNavFolders.#currSceneSortMode === "a"){
  //     // alphabetical sort order
  //     folders.sort((a, b) => {
  //       return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  //     });
  //   }else{
  //     // manual sort order
  //     folders.sort((a, b) => a.sort - b.sort);
  //   }

  //   return folders;
  // }

  /**
   * Selects a folder by its ID
   * @param {string} id - The ID of the folder to select
   * @returns {object|null} The selected folder object or null if not found
   */
  static selectFolder = (id) => {
    return SceneNavFolders.getFolderById(id) || null;
  }

  /**
   * Builds template data for a folder
   * @param {Directory} targetFolder - The folder to build data for
   * @returns {object} Template data for the folder
   */
  static buildTemplateData(targetFolder){
    if(!targetFolder || !ui.scenes) return {};
    const allFolders = ui.scenes.collection.folders;
    let templateData = {}, folderList = [];
    let folderScenes = targetFolder.contents ? [...targetFolder.contents] : [];
    folderScenes = folderScenes.filter(sc => sc.permission >= 2); // only show scenes with appropriate permission

    SceneNavFolders.#currSceneSortMode = game.scenes.sortingMode;

    // Build user viewing data for scenes
    const userScenes = game.users.reduce((obj, u) => {
      if (!u.active) return obj;
      obj[u.viewedScene] ||= [];
      obj[u.viewedScene].push({
        name: u.name,
        letter: u.name[0],
        color: u.color.multiply(0.5).css,
        border: u.color
      });
      return obj;
    }, {});

    // Enhance scene data with status info
    const isGM = game.user?.isGM;
    folderScenes = folderScenes.map(scene => {
      const isHidden = scene.ownership.default === 0;
      const isCurrent = scene.isView; // GM is currently viewing this scene
      const cssClass = [
        isCurrent ? "view" : null,
        scene.active ? "active" : null,
        isHidden ? "gm" : null
      ].filter(Boolean).join(" ");

      return {
        ...scene,
        id: scene.id,
        isGM,
        isActive: scene.active,
        isCurrent,
        isHidden,
        cssClass,
        users: userScenes[scene.id] || null
      };
    });

    // Folder-specific data
    LogUtil.log("buildFolderData A", [targetFolder.name, targetFolder]);
    if (targetFolder.id === DEFAULT_FOLDER_ID) {
      folderList = allFolders.filter(f => f.folder===null) || [];
    } else {
      folderList = targetFolder.children;
    }

    folderList = SceneNavFolders.sortFolderList(folderList); // adjust the sorting

    // Filter out folders hidden from navigation
    const hiddenFolders = SceneNavFolders.getHiddenNavFolders();
    folderList = folderList.filter(f => !hiddenFolders.includes(f.id));

    // Hide folders that contain no scenes the player can see (anywhere in the
    // subtree). Without this, folder names leak through even when every scene
    // inside is GM-only.
    if (!isGM) {
      folderList = folderList.filter(f => SceneNavFolders.folderHasVisibleContent(f));
    }

    templateData = {
      currentFolder: targetFolder,
      folders: folderList,
      scenes: folderScenes
    };

    LogUtil.log("buildFolderData", [folderList, templateData]);

    return templateData;
  }

  /**
   * Close every open folder submenu in the scene navigation bar. Clears the
   * per-user activeSceneFolders flag so the folders stay closed across renders.
   * No-op when there are no open submenus.
   * @returns {Promise<void>}
   */
  static closeAllOpenSubmenus = async () => {
    const sceneNav = document.querySelector("#scene-navigation");
    if (!sceneNav) return;
    const activeFolders = sceneNav.querySelectorAll('.crlngn-folder-active');
    if (activeFolders.length === 0) return;

    activeFolders.forEach(folder => {
      folder.classList.remove('crlngn-folder-active');
      folder.querySelector(':scope > .contents')?.remove();
      folder.parentNode?.querySelectorAll(':scope > li.scene.crlngn-siblings-hidden')
        .forEach(li => li.classList.remove('crlngn-siblings-hidden'));
    });

    SceneNavFolders.#activeSceneFolders = [];
    await game.user.setFlag(MODULE_ID, "activeSceneFolders", []);

    setTimeout(() => {
      TopNavigation.applySceneNavOffset();
      TopNavigation.placeNavButtons();
    }, 30);
  }

  /**
   * Recursively checks whether a folder (or any of its descendants) contains
   * at least one scene the current user can see (OBSERVER permission or higher).
   * Used to suppress folder names that would otherwise leak even when the
   * scenes inside are all GM-only.
   * @param {Folder} folder
   * @returns {boolean}
   */
  static folderHasVisibleContent(folder) {
    if (!folder) return false;
    const contents = folder.contents || [];
    if (contents.some(sc => sc.permission >= 2)) return true;
    const children = folder.children || [];
    return children.some(child => {
      const childFolder = child?.folder || child;
      return SceneNavFolders.folderHasVisibleContent(childFolder);
    });
  }

  /**
   * Determines if the folder view should be hidden based on user permissions and settings
   * @returns {boolean} True if folder view should be hidden
   */
  static noFolderView = () => {
    const isGM = game?.user?.isGM;
    return (!isGM && !TopNavigation.navFoldersForPlayers) ||
      (!TopNavigation.useSceneFolders) ||
      (!TopNavigation.sceneNavEnabled)
  }

  /**
   * Preloads the Handlebars template for scene folder list
   * @returns {Promise<boolean>} True when template is successfully loaded
   */
  static preloadTemplates = async () => {
    const templatePath = [
      `modules/${MODULE_ID}/templates/scene-nav-folders.hbs`,
      `modules/${MODULE_ID}/templates/scene-nav-subfolders.hbs`,
      `modules/${MODULE_ID}/templates/scene-nav-lookup.hbs`
    ];
    
    // This returns an object with paths as keys and template functions as values
    await GeneralUtil.loadTemplates(templatePath);
  
    return true;
  }

  static sortFolderList(folderList){
    folderList = folderList.map((f,i) => {
      if(f.folder){
        return f.folder
      }else{
        return f;
      }
    });

    if(SceneNavFolders.#currSceneSortMode === "a"){ // alphabetical sort order
      folderList.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    }else{ // manual sort order
      folderList.sort((a, b) => a.sort - b.sort);
    }
    
    return folderList;
  }

  /**
   * @private
   * Updates the current scene sorting mode by checking game.scenes.sortingMode
   */
  static #updateSortMode() {
    try {
      // sortingMode is either "a" for alphabetical or "m" for manual
      if (game.scenes && game.scenes.sortingMode !== undefined) {
        SceneNavFolders.#currSceneSortMode = game.scenes.sortingMode;
        // ui.nav.render();
        return;
      }
    } catch (error) {
      console.error("Error checking scene directory sort mode:", error);
    }
    
    // Fallback to default (alphabetical)
    SceneNavFolders.#currSceneSortMode = "a";
    LogUtil.log("updateSortMode fallback", [SceneNavFolders.#currSceneSortMode]);
  }

  /**
   * @private
   * Handles search input changes
   * @param {Event} evt - The triggering event
   */
  static onSearchInput = (evt) => {
    evt.stopPropagation();
    
    const input = evt.currentTarget;
    const value = input.value;
    
    SceneNavFolders.searchValue = value;
    SceneNavFolders.updateSearchResults(value);
  }

  /**
   * Updates the search results container with filtered scenes and folders
   * @param {string} searchValue - The search query to filter by
   */
  static updateSearchResults = (searchValue) => {
    if(!TopNavigation.useSceneLookup){ return; }
    const searchResultsContainer = document.querySelector('#crlngn-scene-lookup .search-container .search-results');
    if (!searchResultsContainer) return;
    
    // Clear previous results
    searchResultsContainer.innerHTML = '';
    if (!searchValue) {
      searchResultsContainer.classList.add('hidden');
      return;
    }
    
    // Filter scenes and folders
    const filteredScenes = game.scenes?.filter(sc => {
      return sc.name.toLowerCase().includes(searchValue.toLowerCase()) && sc.permission >= 2;
    }) || [];
    filteredScenes.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    let filteredFolders = [];
    if(TopNavigation.useSceneFolders){
      const isGM = game.user?.isGM;
      filteredFolders = game.scenes?.folders.filter(f => {
        if(!f.name.toLowerCase().includes(searchValue.toLowerCase())) return false;
        if(isGM) return true;
        return SceneNavFolders.folderHasVisibleContent(f);
      }) || [];

      filteredFolders.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      // Add folders to results
      filteredFolders.forEach(folder => {
        const li = document.createElement('li');
        li.className = 'search-folder';
        li.dataset.folderId = folder.id;
        li.innerHTML = `<a><i class="fas fa-folder"></i> ${folder.name}</a>`;
        li.addEventListener('click', SceneNavFolders.onSelectSearchedFolder);
        searchResultsContainer.appendChild(li);
      });
    }
    // Show the results container
    searchResultsContainer.classList.remove('hidden');
    
    // Add scenes to results
    filteredScenes.forEach(scene => {
      const li = document.createElement('li');
      li.className = 'search-scene';
      li.dataset.sceneId = scene.id;
      li.innerHTML = `<a><i class="fas fa-map"></i> ${scene.name}</a>`;
      li.addEventListener('dblclick', TopNavigation.onActivateScene);
      li.addEventListener('click', TopNavigation.onSelectScene);
      searchResultsContainer.appendChild(li);
    });
    
    // If no results found
    if (filteredFolders.length === 0 && filteredScenes.length === 0) {
      const li = document.createElement('li');
      li.className = 'no-results';
      li.textContent = 'No matching results found';
      searchResultsContainer.appendChild(li);
    }
  }

  /**
   * @private
   * Handles folder selection
   * @param {Event} evt - The triggering event
   */
  static onSelectSearchedFolder = async(evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    const target = evt.currentTarget;
    const folderId = target.dataset.folderId;
    const folderToggle = document.querySelector("#crlngn-folder-toggle");

    if(!TopNavigation.navShowRootFolders){
      folderToggle.click();
    }
    if(!folderId){
      return;
    }

    const allFolders = ui.scenes.collection.folders;
    const folder = allFolders.get(folderId);
    const ancestors = [...folder.ancestors];
    SceneNavFolders.#activeSceneFolders = [];

    for(const af of ancestors){
      SceneNavFolders.#activeSceneFolders.push(af.id);
    }
    SceneNavFolders.#activeSceneFolders.push(folderId);
    await game.user.setFlag(MODULE_ID, "activeSceneFolders", SceneNavFolders.#activeSceneFolders);

    const timer = setTimeout(async()=>{
      ui.nav.render();
    }, 200);

  }

  /**
   * Toggles a folder's visibility in the scene navigation bar
   * @param {string} folderId - The folder ID to toggle
   * @param {boolean} hide - True to hide the folder, false to show it
   */
  static toggleNavFolder(folderId, hide) {
    const SETTINGS = getSettings();
    const hidden = SettingsUtil.get(SETTINGS.hiddenNavFolders.tag) || [];
    if (hide && !hidden.includes(folderId)) {
      hidden.push(folderId);
    } else if (!hide) {
      const idx = hidden.indexOf(folderId);
      if (idx > -1) hidden.splice(idx, 1);
    }
    SettingsUtil.set(SETTINGS.hiddenNavFolders.tag, hidden);
    setTimeout(() => ui.nav.render(), 100);
  }

  /**
   * Returns the list of folder IDs hidden from scene navigation
   * @returns {string[]}
   */
  static getHiddenNavFolders() {
    const SETTINGS = getSettings();
    return SettingsUtil.get(SETTINGS.hiddenNavFolders.tag) || [];
  }
}