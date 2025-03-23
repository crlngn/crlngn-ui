import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";

const DEFAULT_FOLDER_ID = "favorites";

/**
 * Manages scene navigation folders in the UI, providing functionality for folder organization,
 * selection, and display of scene folders.
 */
export class SceneNavFolders {
  static selectedFolder;
  static folderList;
  static folderListData = [];
  static searchValue = "";
  static #defaultFolderName = 'Favorites';
  static contextMenuSceneId = null;

  static init(){
    if(SceneNavFolders.noFolderView()){ return; }
    SceneNavFolders.#defaultFolderName = game.i18n.localize("CRLNGN_UI.ui.sceneNav.favoritesFolder");
    if(!SceneNavFolders.folderListData || SceneNavFolders.folderListData.length === 0){
      const isMonksSceneNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      const isRipperSceneNavOn = GeneralUtil.isModuleOn("compact-scene-navigation");
      if(!isMonksSceneNavOn && !isRipperSceneNavOn){
        SceneNavFolders.preloadTemplate();
      }
      LogUtil.log("SceneNavFolders",[ui.scenes]);
      SceneNavFolders.folderListData = SceneNavFolders.getFolders(ui.scenes.folders);
      SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
    }
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
  static #templateData = null;
  static #folderElement = null;
  static #customList = null;

  static renderSceneFolders = async() => {
    if(SceneNavFolders.noFolderView()){ return; }
    if(!SceneNavFolders.selectedFolder){ return; }

    LogUtil.log("SCENE NAV renderSceneFolders", []);

    const folders = SceneNavFolders.getFolders(ui.scenes.folders);
    

    // Prepare base template data
    const baseData = {
      favoritesId: DEFAULT_FOLDER_ID,
      favoritesName: SceneNavFolders.#defaultFolderName || DEFAULT_FOLDER_ID,
      folderList: folders.map(f => SceneNavFolders.getFoldersData(f)),
      viewedSceneId: game.scenes.current.id,
      users: game.users.contents,
      isGM: game.user.isGM,
      searchValue: SceneNavFolders.searchValue,
      showSearchResults: !!SceneNavFolders.searchValue
    };

    // Add folder-specific data
    if(SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID) {
      SceneNavFolders.#templateData = {
        ...baseData,
        currFolder: { name: SceneNavFolders.#defaultFolderName || DEFAULT_FOLDER_ID, id: DEFAULT_FOLDER_ID },
        currIcon: 'fa-star',
        folders: [],
        scenes: ui.nav.scenes.filter(sc => sc.permission >= 2)
      };
    } else {
      const foldersData = SceneNavFolders.selectedFolder.children;
      LogUtil.log("foldersData", [foldersData, SceneNavFolders.selectedFolder]);
      SceneNavFolders.#templateData = {
        ...baseData,
        currFolder: SceneNavFolders.selectedFolder,
        currIcon: 'fa-folder',
        folders: foldersData,
        scenes: SceneNavFolders.selectedFolder.contents
      };
    }

    // Check if cached elements are still in the document
    // if (!SceneNavFolders.#folderElement?.isConnected || !SceneNavFolders.#customList?.isConnected) {
    LogUtil.log("Elements not in DOM, rendering template", []);
    
    // Clear existing elements if they exist
    SceneNavFolders.#folderElement?.remove();
    SceneNavFolders.#customList?.remove();
    
    const renderedHtml = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-folder-list.hbs`, 
      SceneNavFolders.#templateData
    );
    
    const targetElement = document.querySelector('#scene-list');
    targetElement.insertAdjacentHTML('beforebegin', renderedHtml);
    
    
    SceneNavFolders.#folderElement = document.querySelector('#crlngn-scene-folders');
    SceneNavFolders.#customList = document.querySelector('#crlngn-scene-list');
    targetElement?.classList.add('hidden');
    const nav = SceneNavFolders.#customList;//targetElement.previousElementSibling;

    const sceneItems = nav.querySelectorAll("li.nav-item");
    const navPos = TopNavigation.navPos || 0;
    const newMargin = parseInt(sceneItems[navPos]?.offsetLeft) * -1;
    nav.style.marginLeft = newMargin + 'px';

    // Set up initial listeners
    SceneNavFolders.activateFolderListeners(SceneNavFolders.#folderElement);
    SceneNavFolders.#addSceneListeners(SceneNavFolders.#customList);
    // } else {
    //   // Update existing elements
    //   SceneNavFolders.#updateFolderView();
    // }

    TopNavigation.resetLocalVars();
  }

  /**
   * Activates event listeners for the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static activateFolderListeners = (html) => {
    if(SceneNavFolders.noFolderView()){ return; }

    LogUtil.log("activateFolderListeners", [html]);

    // Add click or hover event to folder list header
    const selectedLink = html.querySelector('a.selected');
    if(TopNavigation.showFolderListOnClick){
      selectedLink?.removeEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.removeEventListener('mouseleave', SceneNavFolders.#onOpenList);
      selectedLink?.addEventListener('click', SceneNavFolders.#onOpenList);
    }else{
      selectedLink?.addEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.addEventListener('mouseleave', SceneNavFolders.#onOpenList);
      selectedLink?.removeEventListener('click', SceneNavFolders.#onOpenList);
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

    // Only add drag-drop if user is GM
    if (game.user.isGM) {
      SceneNavFolders.#initializeDragDrop(html);
    }
  }

  /**
   * Initialize drag and drop functionality for scenes
   * @param {HTMLElement} html - The scene list container
   */
  static #initializeDragDrop = (html) => {
    // Initialize SortableJS on the scene list
    const options = {
      animation: 150,
      draggable: ".nav-item",
      delay: 50,
      delayOnTouchOnly: true,
      onEnd: async (evt) => {
        const scenes = html.querySelectorAll(".nav-item");
        const updates = [];
        
        // Get all scenes in their new order
        const orderedScenes = Array.from(scenes).map(el => game.scenes.get(el.dataset.sceneId));
        
        // Calculate base sort order
        const siblings = Array.from(scenes);
        const updateData = SortingHelpers.performIntegerSort(evt.item, {
          target: evt.to,
          siblings: siblings,
          sortBefore: true
        });

        // Calculate navigation order for scenes
        let navOrder = 0;
        const density = CONST.SORT_INTEGER_DENSITY;

        // First pass: Update sort for all scenes
        for (let [id, sort] of Object.entries(updateData || {})) {
          const scene = game.scenes.get(id);
          if (!scene) continue;
          
          // Start with just the sort update
          const update = {
            _id: scene.id,
            sort: sort
          };

          // If this scene is navigable, assign it a nav order
          if (scene.navigation) {
            update.navOrder = navOrder;
            navOrder += density;
          }

          updates.push(update);
        }

        // Second pass: Update any remaining navigable scenes not in the drag operation
        for (const scene of orderedScenes) {
          if (!scene || !scene.navigation || updates.some(u => u._id === scene.id)) continue;
          updates.push({
            _id: scene.id,
            navOrder: navOrder
          });
          navOrder += density;
        }

        // Apply updates
        if (updates.length) {
          await Scene.updateDocuments(updates);
          ui.nav.render();
        }
      }
    };

    new Sortable(html, options);
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
    Hooks.on(HOOKS_CORE.CREATE_SCENE, () => {
      SceneNavFolders.refreshFolderView();
      // game.scenes.directory.render();
    });
    Hooks.on(HOOKS_CORE.UPDATE_SCENE, () => {
      SceneNavFolders.refreshFolderView();
      // game.scenes.directory.render();
    });
    Hooks.on(HOOKS_CORE.DELETE_SCENE, () => {
      SceneNavFolders.refreshFolderView();
      // game.scenes.directory.render();
    });

    // Hooks.on(HOOKS_CORE.GET_SCENE_DIRECTORY_ENTRY_CONTEXT, SceneNavFolders.#modifyDirectoryContextMenu);
    Hooks.on(HOOKS_CORE.RENDER_DOCUMENT_DIRECTORY, (directory) => {
      if(directory.entryType !== "Scene") return;
      
      const sceneNav = document.querySelector('#scenes .directory-list');
      sceneNav.addEventListener('contextmenu', (event) => {
        const navItem = event.target.closest('.directory-item');
        if (!navItem) return;
        
        SceneNavFolders.contextMenuSceneId = navItem.dataset.documentId || null;
        
        if (SceneNavFolders.contextMenuSceneId) {
          const scene = game.scenes.get(SceneNavFolders.contextMenuSceneId);
          const langPath = scene.navigation ? "removeFromFavorites" : "addToFavorites";
          const optionLabel = game.i18n.localize("CRLNGN_UI.ui.sceneNav." + langPath);

          SceneNavFolders.#observeSceneContextMenu(optionLabel);
          
        }
      });
    });

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, () => {      
      const sceneNav = document.querySelector('#navigation');
      sceneNav.addEventListener('contextmenu', (event) => {
        const navItem = event.target.closest('.nav-item');
        if (!navItem) return;
        
        SceneNavFolders.contextMenuSceneId = event.currentTarget.dataset.sceneId || navItem.dataset.sceneId || null;
        
        if (SceneNavFolders.contextMenuSceneId) {
          const scene = game.scenes.get(SceneNavFolders.contextMenuSceneId);
          const langPath = scene.navigation ? "removeFromFavorites" : "addToFavorites";
          const optionLabel = game.i18n.localize("CRLNGN_UI.ui.sceneNav." + langPath);
          // LogUtil.log("contextmenu", [scene, optionLabel]);

          SceneNavFolders.#observeSceneContextMenu(optionLabel);
        }
      });
    });
  }
  /**
   * Observes the context menu and adds a label for including or removing a scene from favorites
   * @param {string} optionLabel - The label for the context menu item
   */
  static #observeSceneContextMenu = (optionLabel) => {
    const updateContextMenu = () => {
      const contextMenu = document.querySelector('#context-menu');
      if (!contextMenu) return false;

      const menuItems = contextMenu.querySelectorAll('.context-item');
      const toggleNavItem = Array.from(menuItems).find(item => 
        item.innerHTML.includes(game.i18n.localize("SCENES.ToggleNav"))
      );

      if (toggleNavItem) {
        LogUtil.log("updating toggle nav item", [toggleNavItem]);
        toggleNavItem.innerHTML = `<i class="fas fa-star fa-fw"></i>${optionLabel}`;
        return true;
      }
      return false;
    };

    // Try to update immediately first
    if (updateContextMenu()) return;

    // If immediate update fails, set up observer for menu creation
    const contextMenuObserver = new MutationObserver((mutations, obs) => {
      if (updateContextMenu()) {
        obs.disconnect();
      }
    });

    // Start observing document body for changes
    contextMenuObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Safety cleanup
    setTimeout(() => contextMenuObserver.disconnect(), 1000);
  }

  /**
   * @private
   * Handles opening/closing the folder list
   * @param {Event} evt - The triggering event
   */
  static #onOpenList = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    const folderElement = document.querySelector('#crlngn-scene-folders');
    const isMouseEvent = evt.type.startsWith('mouse');
    const isHoverMode = !TopNavigation.showFolderListOnClick;

    // For mouseover, only open if it's not already open
    if (isMouseEvent && isHoverMode && evt.type === 'mouseover') {
      if (!folderElement?.classList.contains('open')) {
        folderElement?.classList.add('open');
      }
      return;
    }

    // For mouseleave in hover mode, only close if we're actually leaving the entire folder element
    if (isMouseEvent && isHoverMode && evt.type === 'mouseleave') {
      folderElement?.classList.remove('open');
      return;
    }

    // For click mode, toggle the open state
    if (!isMouseEvent) {
      if (folderElement?.classList.contains('open')) {
        folderElement?.classList.remove('open');
      } else {
        folderElement?.classList.add('open');
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

    document.removeEventListener('click', SceneNavFolders.#onOutsideClick);
    // evt.stopPropagation();
    const target = evt.target;
    const folderElement = document.querySelector('#crlngn-scene-folders');
    LogUtil.log("#onOutsideClick", [folderElement, target, folderElement.contains(target)]);
    // const selectedLink = folderElement?.querySelector('a.selected');
    if (folderElement?.classList.contains('open') && !folderElement.contains(target)) {
      folderElement.classList.remove('open');
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
    document.removeEventListener('click', SceneNavFolders.#onOutsideClick);
    const target = evt.currentTarget;
    const data = target.dataset;
    const scene = game.scenes.get(data.sceneId);
    const isSearchResult = target.parentElement?.classList.contains('search-results');

    LogUtil.log("scene click", [scene, target.parentElement, isSearchResult]);

    // Clear any existing timer
    if (SceneNavFolders.#clickTimer) {
      clearTimeout(SceneNavFolders.#clickTimer);
      SceneNavFolders.#clickTimer = null;
    }

    // Set a new timer for the click action
    SceneNavFolders.#clickTimer = setTimeout(() => {
      if(isSearchResult){
        scene.navigation = true;
        SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
      }
      scene.view();
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
    SceneNavFolders.refreshFolderView();
  }

  /**
   * @private
   * Handles folder selection
   * @param {Event} evt - The triggering event
   */
  static #onSelectFolder = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    document.removeEventListener('click', SceneNavFolders.#onOutsideClick);
    const target = evt.currentTarget;
    const data = target.dataset;
    LogUtil.log("#onSelectFolder", [data]);
    const newFolder = SceneNavFolders.selectFolder(data.folderId || "");
    if(newFolder !== SceneNavFolders.selectedFolder){
      TopNavigation.navPos = 0;
    }
    SceneNavFolders.selectedFolder = newFolder;
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