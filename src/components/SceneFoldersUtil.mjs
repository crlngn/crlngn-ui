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
    if (!game.user.getFlag(MODULE_ID, "activeSceneFoldersV1")) {
      game.user.setFlag(MODULE_ID, "activeSceneFoldersV1", []);
    }

    const scenesList = document.querySelector("#navigation #scene-list");
    const folderItems = scenesList?.querySelectorAll("li.folder") || [];
    folderItems.forEach(ff => {
      ff.remove();
    });

    
    Hooks.on(HOOKS_CORE.RENDER_SCENE_DIRECTORY, (app, html) => {
      SceneNavFolders.#updateSortMode();
      // ui.nav.render();
    });
    // SceneNavFolders.#activeSceneFolders = game.user.getFlag(MODULE_ID, "activeSceneFoldersV1") || [];
  }

  /**
   * Add Scene folders to scene navigation bar
   * @param {SceneNavigation} nav - The scene navigation instance
   * @param {HTMLElement} navHtml - The navigation HTML element
   * @param {SceneNavData} navData - The scene navigation data
   */
  static addFolderButtons(nav, navHtml, navData){
    LogUtil.log("addFolderButtons", [TopNavigation.navFoldersEnabled, game.scenes.size, game.scenes.folders.size]);
    if(!TopNavigation.navFoldersEnabled ||
      TopNavigation.isRipperSceneNavOn ||
      TopNavigation.isMonksSceneNavOn ||
      game.user.isGM === false ||
      game.scenes.size < 2 || game.scenes.folders.size < 1
    ){ return; }
    const SETTINGS = getSettings();
    // if button already exists, remove it
    // const existingLookupBtn = document.querySelector("#crlngn-scene-lookup");
    const existingFolderToggle = document.querySelector("#crlngn-folder-toggle");
    if(existingFolderToggle){
      return;
    }

    const activeScenesMenu = document.querySelector("#navigation");
    const sceneList = activeScenesMenu.querySelector("#scene-list");
    const folderToggle = document.createElement("div");

    // const folderLookup = document.createElement("div");
    // folderLookup.id = "crlngn-scene-lookup";
    // folderLookup.innerHTML = `<button class='scene-lookup-toggle' tooltip='Search Scenes' tooltip-direction='DOWN'>
    //   <i class='fa-solid fa-magnifying-glass'></i>
    // </button>`;

    folderToggle.dataset.tooltip = TopNavigation.navShowSceneFolders ? `Hide Scene Folders` : `Show Scene Folders`;
    folderToggle.dataset.tooltipDirection = "DOWN";
    folderToggle.id = "crlngn-folder-toggle";
    folderToggle.innerHTML = `<i class='fa-solid icon'></i>`;

    if(TopNavigation.navShowSceneFolders){
      activeScenesMenu.classList.add('with-folders');
    }else{
      activeScenesMenu.classList.remove('with-folders');
    }

    folderToggle.addEventListener("click", ()=>{
      TopNavigation.setNavPosition(0);
      SettingsUtil.set(SETTINGS.navShowSceneFolders.tag, !TopNavigation.navShowSceneFolders);
      TopNavigation.preventReposition = true;
      ui.nav?.render();
      // TopNavigation.placeNavButtons();
    });
    // activeScenesMenu.insertBefore(folderLookup, sceneList);
    activeScenesMenu.insertBefore(folderToggle, sceneList);
  }

  static renderFolderList = async (folderElement) => {
    SceneNavFolders.#activeSceneFolders = game.user.getFlag(MODULE_ID, "activeSceneFoldersV1") || [];

    let targetElement;
    const allFolders = ui.scenes.collection.folders;
    const folder = folderElement ? allFolders.get(folderElement.dataset.folderId) : { name: "", id: DEFAULT_FOLDER_ID };
    const templateData = SceneNavFolders.buildTemplateData(folder);
    const renderedHtml = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-folders.hbs`, 
      templateData
    );
    LogUtil.log("renderFolderList",[folder, SceneNavFolders.#activeSceneFolders]);

    if(!folderElement){ // if root folder
      targetElement = TopNavigation.scenesList;
    }else{
      targetElement = folderElement.parentNode;
    }
    targetElement.insertAdjacentHTML('afterbegin', renderedHtml);

    const folderItems = targetElement.querySelectorAll("li.crlngn-folder");
    SceneNavFolders.addFolderListeners(folderItems);
    TopNavigation.placeNavButtons();
  }

  static handleFolderLookup = async() => {
    // const templateData = SceneNavFolders.buildLookupData();
    const renderedHtml = await renderTemplate(
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

    const folderLookupBtn = targetElement.querySelector(".scene-lookup-toggle");
    if(folderLookupBtn){
      // folderLookupBtn.removeEventListener("click", SceneNavFolders.toggleFolderLookup);
      folderLookupBtn.addEventListener("click", SceneNavFolders.toggleFolderLookup);
    }
  }

  static addFolderListeners = (folderItems) => {
    const allFolders = ui.scenes.collection.folders;

    if(!folderItems){return;}
    folderItems.forEach( item => {
      item.querySelector(".folder-item").addEventListener('click', SceneNavFolders.#onNavFolderClick);
      const id = item.dataset.folderId;
      const itemFolder = allFolders.get(id);
      const isActive = SceneNavFolders.#activeSceneFolders.includes(id);
      
      LogUtil.log("addFolderListeners isActive", [isActive, id, itemFolder.name]);
      if(isActive){
        item.classList.add('crlngn-folder-active');
        SceneNavFolders.injectSubfolders(itemFolder, item);
      }

      const allSceneLi = item.querySelectorAll("li.scene");
      LogUtil.log("addFolderListeners allSceneLi", [allSceneLi]);
      for(const li of allSceneLi){
        const id = li.dataset.sceneId;

        // add scene preview
        if(TopNavigation.useScenePreview){
          const sceneData = game.scenes.find(sc => sc.id === id);
          
          // Add click handlers to the preview icons if user is GM
          if (game.user?.isGM) {
            TopNavigation.addPreviewIconListeners(li, sceneData);          
          }
        }
      }
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

    await SceneNavFolders.injectSubfolders(folder, target.parentNode);

    TopNavigation.addSceneListeners(target.parentNode);
    LogUtil.log("onNavFolderClick", [target, target.parentNode, target.parentNode.dataset]);

    const isActive = target.classList.contains("crlngn-folder-active") || target.parentNode.classList.contains("crlngn-folder-active");
    // target.parentNode.style.setProperty('--parent-offset-left', offsetLeft + 'px');

    if(isActive){
      SceneNavFolders.updateActiveFolders(id, true);
    }else{
      SceneNavFolders.updateActiveFolders(id, false);
    }
  }

  static injectSubfolders = async(folder, targetElement) => {
    const folderData = SceneNavFolders.buildTemplateData(folder);
    const renderedSubfolders = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-subfolders.hbs`, 
      folderData
    );
    const contents = targetElement.querySelector(".contents");
    if(contents) contents.remove();
    targetElement.insertAdjacentHTML('beforeend', renderedSubfolders);

    const folderItems = targetElement.querySelectorAll("li.crlngn-folder");
    SceneNavFolders.addFolderListeners(folderItems);
    TopNavigation.addSceneListeners(targetElement.querySelector(".contents"));
  }

  static updateActiveFolders = async (id, remove=false) => {
    const scenesList = document.querySelector("#scene-list");
    const target = scenesList?.querySelector(`li.crlngn-folder[data-folder-id="${id}"]`);
    const idIndex = SceneNavFolders.#activeSceneFolders.indexOf(id);
    
    LogUtil.log("updateActiveFolders A", [idIndex, id, game.user.getFlag(MODULE_ID, "activeSceneFoldersV1"), SceneNavFolders.#activeSceneFolders]);

    if(remove){
      SceneNavFolders.#activeSceneFolders = SceneNavFolders.#activeSceneFolders.filter(fid => fid !== id);
      target.classList.remove('crlngn-folder-active');
    }else if(!SceneNavFolders.#activeSceneFolders.includes(id)){
      const siblings = target.parentNode.querySelectorAll("li.crlngn-folder");
      siblings.forEach(sibling => {
        if(sibling !== target){
          SceneNavFolders.#activeSceneFolders = SceneNavFolders.#activeSceneFolders.filter(fid => fid !== sibling.dataset.folderId);
          sibling.classList.remove('crlngn-folder-active');
        }
      });
      SceneNavFolders.#activeSceneFolders.push(id);
      target.classList.add('crlngn-folder-active');
    }

    await game.user.setFlag(MODULE_ID, "activeSceneFoldersV1", SceneNavFolders.#activeSceneFolders);
    LogUtil.log("updateActiveFolders B", [remove, id, game.user.getFlag(MODULE_ID, "activeSceneFoldersV1"), SceneNavFolders.#activeSceneFolders]);
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
    let sortMode = "a";

    // Folder-specific data
    LogUtil.log("buildFolderData A", [targetFolder.name, targetFolder]);

    if (targetFolder.id === DEFAULT_FOLDER_ID) {
      folderList = allFolders.filter(f => f.folder===null) || [];
      SceneNavFolders.#updateSortMode();
      sortMode = SceneNavFolders.#currSceneSortMode;
    } else {
      folderList = targetFolder.children;
      sortMode = targetFolder.sorting;
    }

    folderList = SceneNavFolders.sortFolderList(folderList, sortMode); // adjust the sorting
    folderScenes = SceneNavFolders.sortFolderScenes(folderScenes, sortMode); // adjust the sorting
    templateData = {
      currentFolder: targetFolder,
      folders: folderList,
      scenes: folderScenes,
      useIcons: TopNavigation.useSceneIcons,
      usePreview: TopNavigation.useScenePreview
    };

    LogUtil.log("buildFolderData", [folderList, templateData]);

    return templateData;
  }

  /**
   * Determines if the folder view should be hidden based on user permissions and settings
   * @returns {boolean} True if folder view should be hidden
   */
  static noFolderView = () => {
    const isGM = game?.user?.isGM;
    return (!isGM && !TopNavigation.navFoldersForPlayers) ||
      (!TopNavigation.navFoldersEnabled) ||
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
      `modules/${MODULE_ID}/templates/scene-nav-lookup.hbs`,
      `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`
    ];
    
    await loadTemplates(templatePath);
  
    return true;
  }

  static sortFolderList(folderList, sortMode="a"){
    folderList = folderList.map((f,i) => {
      if(f.folder){
        return f.folder
      }else{
        return f;
      }
    });

    LogUtil.log("sortFolderList", [sortMode, folderList])
    if(sortMode === "a"){ // alphabetical sort order
      folderList.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    }else{ // manual sort order
      folderList.sort((a, b) => a.sort - b.sort);
    }
    
    return folderList;
  }

  static sortFolderScenes(folderScenes, sortMode="a"){
    // LogUtil.log("sortFolderScenes", [sortMode, folderScenes]);
    if(sortMode === "a"){ // alphabetical sort order
      folderScenes.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    }else{ // manual sort order
      folderScenes.sort((a, b) => a.sort - b.sort);
    }
    
    return folderScenes;
  }

  /**
   * @private
   * Updates the current scene sorting mode by checking game.scenes.sortingMode
   */
  static #updateSortMode() {
    // LogUtil.log("updateSortMode", [game.scenes, game.scenes.sortingMode]);
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
    LogUtil.log("updateSortMode fallback", [gSceneNavFolders.#currSceneSortMode]);
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
    if(SceneNavFolders.noFolderView()){ return; }
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
    
    const filteredFolders = game.scenes?.folders.filter(f => {
      return f.name.toLowerCase().includes(searchValue.toLowerCase());
    }) || [];
    filteredFolders.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    // Show the results container
    searchResultsContainer.classList.remove('hidden');
    
    // Add folders to results
    filteredFolders.forEach(folder => {
      const li = document.createElement('li');
      li.className = 'search-folder';
      li.dataset.folderId = folder.id;
      li.innerHTML = `<a><i class="fas fa-folder"></i> ${folder.name}</a>`;
      li.addEventListener('click', SceneNavFolders.onSelectSearchedFolder);
      searchResultsContainer.appendChild(li);
    });
    
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
  static onSelectSearchedFolder = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    const target = evt.currentTarget;
    const folderId = target.dataset.folderId;
    const folderToggle = document.querySelector("#crlngn-folder-toggle");

    if(!TopNavigation.navShowSceneFolders){
      folderToggle.click();
    }
    if(!folderId){
      return;
    }

    SceneNavFolders.activateFolder(folderId);

  }

  static activateFolder = async(folderId) => {
    const allFolders = ui.scenes.collection.folders;
    const folder = allFolders.get(folderId);
    const ancestors = [...folder.ancestors];
    SceneNavFolders.#activeSceneFolders = [];

    for(const af of ancestors){
      SceneNavFolders.#activeSceneFolders.push(af.id);
    }
    SceneNavFolders.#activeSceneFolders.push(folderId);
    await game.user.setFlag(MODULE_ID, "activeSceneFoldersV1", SceneNavFolders.#activeSceneFolders);

    const timer = setTimeout(async()=>{
      ui.nav.render();
    }, 200);
  }
}