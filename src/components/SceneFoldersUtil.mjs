import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";

const DEFAULT_FOLDER_ID = "Favorites";

/**
 * Manages scene navigation folders in the UI, providing functionality for folder organization,
 * selection, and display of scene folders.
 */
export class SceneNavFolders {
  static selectedFolder;
  static folderList;
  static folderListData = [];
  static searchValue = "";

  /**
   * Initializes the scene navigation folders system.
   * Sets up initial folder data, loads templates, and registers necessary hooks.
   */
  /**
   * Modifies the scene navigation context menu options
   * @param {SceneNavigation} nav - The SceneNavigation instance
   * @param {Array} contextOptions - The array of context menu options
   * @private
   */
  /**
   * Modifies the scene navigation context menu options
   * @param {SceneNavigation} nav - The SceneNavigation instance
   * @param {Array} contextOptions - The array of context menu options
   * @private
   */
  static #modifyContextMenu(nav, contextOptions, navItem) {
    const toggleIndex = contextOptions.findIndex(o =>
      o.name === "SCENES.ToggleNav"
    );
    const sceneId = this.contextMenuSceneId;
    const scene = sceneId ? game.scenes.get(sceneId) : null;
    LogUtil.log("#modifyContextMenu", [nav, contextOptions, scene, toggleIndex]);
    if (toggleIndex !== -1) {
      contextOptions[toggleIndex] = {
        ...contextOptions[toggleIndex],
        icon: "<i class=\"fas fa-star\"></i>",
        name: "CRLNGN_UI.ui.sceneNav.addToFavorites"
      };
    }
  }

  /**
   * Modifies the scene directory context menu options
   * @param {SceneDirectory} directory - The SceneDirectory instance
   * @param {Array} contextOptions - The array of context menu options
   * @private
   */
  static #modifyDirectoryContextMenu(html, contextOptions, entryData) {
    const toggleIndex = contextOptions.findIndex(o => 
      o.name === "SCENES.ToggleNav"
    );
    const sceneId = this.contextMenuSceneId;
    const scene = sceneId ? game.scenes.get(sceneId) : null;
    LogUtil.log("#modifyDirectoryContextMenu", [html, contextOptions, scene, toggleIndex]);
    if (toggleIndex !== -1) {
      contextOptions[toggleIndex] = {
        ...contextOptions[toggleIndex],
        icon: "<i class=\"fas fa-star\"></i>",
        name: "CRLNGN_UI.ui.sceneNav.addToFavorites"
      };
    }
  }

  static init(){
    if(SceneNavFolders.noFolderView()){ return; }
    if(!SceneNavFolders.folderListData || SceneNavFolders.folderListData.length === 0){
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      if(!isMonksScenenNavOn){
        SceneNavFolders.preloadTemplate();
      }
      LogUtil.log("SceneNavFolders",[ui.scenes]);
      SceneNavFolders.folderListData = SceneNavFolders.getFolders(ui.scenes.folders);
      SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
    }

    SceneNavFolders.registerHooks();
  }

  /**
   * 
   * @param {object[]} fromList 
   * @returns 
   */
  /**
   * Retrieves and sorts top-level folders from the provided folder list
   * @param {object[]} fromList - Array of folder objects to filter
   * @returns {object[]} Sorted array of top-level folders
   */
  static getFolders = (fromList) => {
    let folders = fromList.filter(f => { 
      return f.folder === null;
    });

    // alphabetical order
    folders.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    // LogUtil.log("getFolders", [folders]);

    return folders;
  }

  /**
   * Selects a folder by its ID
   * @param {string} id - The ID of the folder to select
   * @returns {object|null} The selected folder object or null if not found
   */
  static selectFolder = (id) => {
    return SceneNavFolders.getFolderById(id) || null;
  }

  /**
   * 
   * @param {string} id - Scene folder id
   */
  /**
   * Retrieves a folder by its ID
   * @param {string} id - Scene folder id
   * @returns {object|string} Found folder object or DEFAULT_FOLDER_ID if not found
   */
  static getFolderById(id){
    return ui.scenes.folders.find(fd => {
      return fd.id===id
    }) || DEFAULT_FOLDER_ID;
  }

  /**
   * Creates a new folder list item element
   * @returns {HTMLLIElement} New folder list item element
   */
  static createFolderElem = () => {
    const folderElem = document.createElement("li");
    return folderElem;
  }

  /**
   * Creates an ordered list element containing folder items
   * @param {object[]} folders - Array of folder objects to create list items for
   * @returns {HTMLOListElement} Ordered list element containing folder items
   */
  static createListElement = (folders) => {
    const folderList = document.createElement("ol"); 
    folderList.classList.add('folder-list');

    folders.forEach(f => {
      const folder = document.createElement("li");

      LogUtil.log("createListElement", [f]);
      
      if(f.children && f.children.length > 0){
        folder.innerHTML = `<a class="with-subfolders">${f.name}</a>`; 
      }else{
        folder.innerHTML = `<a>${f.name}</a>`; 
      }
      folderList.append(folder);
    })

    return folderList;
  }

  /**
   * Preloads the Handlebars template for scene folder list
   * @returns {Promise<boolean>} True when template is successfully loaded
   */
  static preloadTemplate = async() => {
    const templatePath = [
      `modules/${MODULE_ID}/templates/scene-folder-list.hbs`
    ];
    
    // This returns an object with paths as keys and template functions as values
    await loadTemplates(templatePath);

    LogUtil.log("preloadTemplate", [true]);
  
    return true;
  }

  /**
   * Retrieves extended data for a folder
   * @param {object} folder - The folder object to get data for
   * @returns {object} Extended folder data
   */
  static getFoldersData = (folder) => {
    return {
      ...folder,
      children: folder.children.map(fc => SceneNavFolders.getFoldersData(fc)),
      hasSubfolders: folder.children.length > 0,
      id: folder.id
    };
  }

  /**
   * Renders the scene folders UI using the Handlebars template
   * @returns {Promise<void>}
   */
  static renderSceneFolders = async() => {
    if(SceneNavFolders.noFolderView()){ return; }
    let folderElement, customList, templateData;

    if(!SceneNavFolders.selectedFolder){return;}
    LogUtil.log("SCENE NAV renderSceneFolders", []);

    folderElement = document.querySelector('#crlngn-scene-folders');
    customList = document.querySelector('#crlngn-scene-list');
    if(folderElement){ folderElement.remove(); }
    if(customList){ customList.remove(); }

    const folders = SceneNavFolders.getFolders(ui.scenes.folders);

    if(SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID){
      // Prepare data for template
      templateData = {
        favoritesId: DEFAULT_FOLDER_ID,
        folderList: folders.map(f => SceneNavFolders.getFoldersData(f) ),
        currFolder: { name: DEFAULT_FOLDER_ID, id: DEFAULT_FOLDER_ID },
        currIcon: 'fa-star',
        folders: [],
        scenes: ui.nav.scenes.filter(sc => sc.permission >= 2),
        users: game.users.contents,
        isGM: game.user.isGM,
        searchValue: SceneNavFolders.searchValue,
        showSearchResults: !!SceneNavFolders.searchValue
      };
    }else{
      const foldersData = SceneNavFolders.selectedFolder.children;
      LogUtil.log("foldersData", [foldersData]);
      templateData = {
        favoritesId: DEFAULT_FOLDER_ID,
        folderList: folders.map(f => SceneNavFolders.getFoldersData(f) ),
        currFolder: SceneNavFolders.selectedFolder,
        currIcon: 'fa-folder',
        folders: foldersData,
        scenes: SceneNavFolders.selectedFolder.contents,
        users: game.users.contents,
        isGM: game.user.isGM,
        searchValue: SceneNavFolders.searchValue,
        showSearchResults: !!SceneNavFolders.searchValue
      };
    }
    
    LogUtil.log("SCENE NAV templateData", [templateData]);

    // Render the template using renderTemplate
    const renderedHtml = await renderTemplate(`modules/${MODULE_ID}/templates/scene-folder-list.hbs`, templateData);
    
    // Find the DOM element before which you want to insert your content
    const targetElement = document.querySelector('#scene-list');
    
    // Insert the HTML content before the target element
    targetElement.insertAdjacentHTML('beforebegin', renderedHtml);
    folderElement = document.querySelector('#crlngn-scene-folders');
    customList = document.querySelector('#crlngn-scene-list');

    // folderElement?.classList.remove('hidden');
    // customList?.classList.remove('hidden');
    targetElement?.classList.add('hidden');

    // const insertedHtml = targetElement.previousElementSibling;
    SceneNavFolders.activateFolderListeners(folderElement);
    SceneNavFolders.#addSceneListeners(customList);
  }

  /**
   * Activates event listeners for the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static activateFolderListeners = (html) => {
    if(SceneNavFolders.noFolderView()){ return; }

    LogUtil.log("activateFolderListeners", [html]);

    // Add click or hover event to folder list header
    if(TopNavigation.showFolderListOnClick){
      html.removeEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.removeEventListener('mouseout', SceneNavFolders.#onOpenList);
      html.querySelector('a.selected')?.addEventListener('click', SceneNavFolders.#onOpenList);
      // document.addEventListener('click', SceneNavFolders.#onOutsideClick);
    }else{
      html.addEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.addEventListener('mouseout', SceneNavFolders.#onOpenList);
      html.querySelector('a.selected')?.removeEventListener('click', SceneNavFolders.#onOpenList);
    }
    

    // Add click event to all toggle spans
    html.querySelectorAll('span.toggle').forEach(toggleSpan => {
      toggleSpan.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Find the parent li
        const parentLi = event.currentTarget.closest('li');
        // Find the subfolders list within this li
        const subfoldersOl = parentLi.querySelector('ol.subfolders');
        
        // Toggle visibility of the subfolders
        if (!subfoldersOl) { return }
        const isHidden = !(subfoldersOl.classList.contains('open'));
        if(isHidden){
          subfoldersOl.classList.add('open');
          event.currentTarget.textContent = '−';
        }else{
          subfoldersOl.classList.remove('open');
          event.currentTarget.textContent = '+';
        }
      });
    });

    // add click behavior for all folders in the list
    const folderItems = html.querySelectorAll(".folder-list li.folder");
    folderItems.forEach(fi => {
      fi.addEventListener("click", SceneNavFolders.#onSelectFolder);
    });

    const searchInput = html.querySelector('.search-container .input-scene-search');
    searchInput.addEventListener("keyup", SceneNavFolders.#onSearchInput);
    searchInput.addEventListener('keydown', evt => {
      evt.stopPropagation();
    });
  }

  /**
   * Adds click event listeners to scene items in the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static #addSceneListeners = (html) => {
    const sceneItems = html.querySelectorAll("li.nav-item");
    sceneItems.forEach(li => {
      const isFolder = li.classList.contains("folder");
      li.addEventListener("click", isFolder ? SceneNavFolders.#onSelectFolder : SceneNavFolders.#onSelectScene);
      li.addEventListener("dblclick", isFolder ? ()=>{} : SceneNavFolders.#onActivateScene);
    });
  }

  /**
   * Refreshes the folder view by updating folder data and re-rendering
   */
  static refreshFolderView = async() => {
    if(SceneNavFolders.noFolderView()){ return; }
    SceneNavFolders.folderListData = SceneNavFolders.getFolders(ui.scenes.folders);
    await SceneNavFolders.renderSceneFolders();
    TopNavigation.placeNavButtons();
  }

  /**
   * Updates the search results container with filtered scenes and folders
   * @param {string} searchValue - The search query to filter by
   */
  static updateSearchResults = (searchValue) => {
    if(SceneNavFolders.noFolderView()){ return; }
    const searchResultsContainer = document.querySelector('.search-container .search-results');
    if (!searchResultsContainer) return;
    
    // Clear previous results
    searchResultsContainer.innerHTML = '';
    
    if (!searchValue) {
      searchResultsContainer.classList.add('hidden');
      return;
    }
    
    // Filter scenes and folders
    const filteredScenes = game.scenes.filter(sc => {
      return sc.name.toLowerCase().includes(searchValue.toLowerCase()) && sc.permission >= 2;
    });
    
    const filteredFolders = game.scenes.folders.filter(f => {
      return f.name.toLowerCase().includes(searchValue.toLowerCase());
    });
    
    // Show the results container
    searchResultsContainer.classList.remove('hidden');
    
    // Add folders to results
    filteredFolders.forEach(folder => {
      const li = document.createElement('li');
      li.className = 'folder';
      li.dataset.folderId = folder.id;
      li.innerHTML = `<a><i class="fas fa-folder"></i> ${folder.name}</a>`;
      li.addEventListener('click', SceneNavFolders.#onSelectFolder);
      searchResultsContainer.appendChild(li);
    });
    
    // Add scenes to results
    filteredScenes.forEach(scene => {
      const li = document.createElement('li');
      li.className = 'scene';
      li.dataset.sceneId = scene.id;
      li.innerHTML = `<a><i class="fas fa-map"></i> ${scene.name}</a>`;
      li.addEventListener('dblclick', SceneNavFolders.#onActivateScene);
      li.addEventListener('click', SceneNavFolders.#onSelectScene);
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
   * Registers Foundry VTT hooks for folder and scene changes
   */
  static registerHooks() {
    Hooks.on(HOOKS_CORE.CREATE_FOLDER, (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
      }
    });
    
    Hooks.on(HOOKS_CORE.UPDATE_FOLDER, (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
      }
    });
    
    Hooks.on(HOOKS_CORE.DELETE_FOLDER, (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
      }
    });
    
    // Also hook into scene changes
    Hooks.on(HOOKS_CORE.CREATE_SCENE, () => SceneNavFolders.refreshFolderView());
    Hooks.on(HOOKS_CORE.UPDATE_SCENE, () => SceneNavFolders.refreshFolderView());
    Hooks.on(HOOKS_CORE.DELETE_SCENE, () => SceneNavFolders.refreshFolderView());

    // Register scene related hooks
    Hooks.on(HOOKS_CORE.GET_SCENE_NAV_CONTEXT, SceneNavFolders.#modifyContextMenu.bind(SceneNavFolders));
    Hooks.on(HOOKS_CORE.GET_SCENE_DIRECTORY_ENTRY_CONTEXT, SceneNavFolders.#modifyDirectoryContextMenu.bind(SceneNavFolders));
    Hooks.on(HOOKS_CORE.RENDER_DOCUMENT_DIRECTORY, (directory) => {
      // Add contextmenu listeners
      // const sceneNav = document.getElementById('navigation');
      // sceneNav.addEventListener('contextmenu', (event) => {
      //   // event.preventDefault();
      //   const navItem = event.target.closest('.nav-item');
      //   if (navItem) {
      //     SceneNavFolders.contextMenuSceneId = navItem.dataset.sceneId;
      //   }
      // });
      if(directory.entryType !== "Scene"){
        return;
      }
      // LogUtil.log("registerHooks (Scene Directory)", [directory]);
      const sceneDirectory = document.querySelector('#scenes .directory-list');
      sceneDirectory?.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const directoryItem = event.target.closest('.scene');
        LogUtil.log("contextmenu", [directory, directoryItem]);
        if (directoryItem) {
          SceneNavFolders.contextMenuSceneId = directoryItem.dataset.documentId;
        }
      });
    });

  }

  /**
   * @private
   * Handles opening/closing the folder list
   * @param {Event} evt - The triggering event
   */
  static #onOpenList = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    const target = evt.currentTarget;
    const folderElement = document.querySelector('#crlngn-scene-folders');
    // LogUtil.log("#onOpenList",[target]);

    if(folderElement?.classList.contains('open')){
      folderElement?.classList.remove('open');
    } else {
      folderElement?.classList.add('open');
      if(TopNavigation.showFolderListOnClick){
        document.addEventListener('click', SceneNavFolders.#onOutsideClick);
      }
    }
  }

  /**
   * @private
   * Handles outside click events
   * @param {Event} evt - The triggering event
   */
  static #onOutsideClick = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const target = evt.target;
    const folderElement = document.querySelector('#crlngn-scene-folders');
    LogUtil.log("#onOutsideClick", [folderElement, target, folderElement.contains(target)]);
    // const selectedLink = folderElement?.querySelector('a.selected');
    if (folderElement?.classList.contains('open') && !folderElement.contains(target)) {
      folderElement.classList.remove('open');
      document.removeEventListener('click', SceneNavFolders.#onOutsideClick);
    }
  }

  /**
   * Handles scene selection
   * @param {Event} evt - The triggering event
   * @private
   */
  static #clickTimer = null;
  static #onSelectScene = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const target = evt.currentTarget;
    const data = target.dataset;
    const scene = game.scenes.get(data.sceneId);

    // Clear any existing timer
    if (SceneNavFolders.#clickTimer) {
      clearTimeout(SceneNavFolders.#clickTimer);
      SceneNavFolders.#clickTimer = null;
    }

    // Set a new timer for the click action
    SceneNavFolders.#clickTimer = setTimeout(() => {
      LogUtil.log("scene click", [scene]);
      scene.view();
      SceneNavFolders.selectedFolder = DEFAULT_FOLDER_ID;
      SceneNavFolders.refreshFolderView();
      SceneNavFolders.#clickTimer = null;
    }, 250); // 250ms delay to wait for potential double-click
  }

  static #onActivateScene = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    const data = target.dataset;
    const scene = game.scenes.get(data.sceneId);

    // Clear the single-click timer if it exists
    if (SceneNavFolders.#clickTimer) {
      clearTimeout(SceneNavFolders.#clickTimer);
      SceneNavFolders.#clickTimer = null;
    }

    LogUtil.log("#onActivateScene", [scene]);
    scene.activate();
    SceneNavFolders.refreshSceneView();
  }

  /**
   * @private
   * Handles folder selection
   * @param {Event} evt - The triggering event
   */
  static #onSelectFolder = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    const data = target.dataset;
    SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(data.folderId || "");
    SceneNavFolders.refreshFolderView();
  }

  /**
   * @private
   * Handles search input changes
   * @param {Event} evt - The triggering event
   */
  static #onSearchInput = (evt) => {
    evt.stopPropagation();
    
    const input = evt.currentTarget;
    const value = input.value;
    
    SceneNavFolders.searchValue = value;
    SceneNavFolders.updateSearchResults(value);
  }

  /**
   * @private
   * Handles scene selection
   * @param {Event} evt - The triggering event
   */
  static #onItemClick = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    let sceneId = evt.currentTarget?.dataset?.sceneId || "";
    let folderId = evt.currentTarget?.dataset?.folderId || "";

    if(sceneId){
      game.scenes.get(sceneId).view();
    }else if(folderId){
      SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(folderId);
      SceneNavFolders.refreshFolderView();
    }
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

}