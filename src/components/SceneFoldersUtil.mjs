import { BACK_BUTTON_OPTIONS } from "../constants/Settings.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";
import { Sortable } from "sortablejs";

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
  static #defaultFolderName = '';
  static contextMenuSceneId = null;
  static #folderToggleStates = {};
  static #sortableTimeout;
  static #lastScenesVisited = [];
  static #currSceneSortMode = "a";

  /**
   * @private
   * Updates the current scene sorting mode by checking game.scenes.sortingMode
   */
  static #updateSortMode() {
    try {
      // sortingMode is either "a" for alphabetical or "m" for manual
      if (game.scenes && game.scenes.sortingMode !== undefined) {
        SceneNavFolders.#currSceneSortMode = game.scenes.sortingMode;
        SceneNavFolders.refreshFolderView();
        ui.nav.render();
        return;
      }
    } catch (error) {
      console.error("Error checking scene directory sort mode:", error);
    }
    
    // Fallback to default (alphabetical)
    SceneNavFolders.#currSceneSortMode = "a";
    LogUtil.log("updateSortMode fallback", [SceneNavFolders.#currSceneSortMode]);
  }

  static init() {
    if (SceneNavFolders.noFolderView() || !ui.scenes) { return; }
    if (!SceneNavFolders.folderListData || SceneNavFolders.folderListData.length === 0) {
      // const isMonksSceneNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      // const isRipperSceneNavOn = GeneralUtil.isModuleOn("compact-scene-navigation");
      // if (isMonksSceneNavOn || isRipperSceneNavOn) {
      //   return;
      // }
      SceneNavFolders.preloadTemplate();
      SceneNavFolders.folderListData = SceneNavFolders.getFolders(ui.scenes.folders);
      SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
      
      // Get the current sorting mode from the SceneDirectory
      SceneNavFolders.#updateSortMode();
      LogUtil.log("getFolders / sortOrder", [SceneNavFolders.#currSceneSortMode]);
    }
  }

  /**
   * Retrieves and sorts top-level folders from the provided folder list
   * @param {object[]} fromList - Array of folder objects to filter
   * @returns {object[]} Sorted array of top-level folders
   */
  static getFolders = (fromList) => {
    // Helper function to recursively set isOpen state
    const setFolderOpenState = (folder) => {
      folder.isOpen = SceneNavFolders.#folderToggleStates[folder.id] ?? false;
      folder.children.forEach(setFolderOpenState);
    };

    // Get top-level folders
    let folders = fromList.filter(f => f.folder === null);
    // Process each top-level folder and its children
    folders.forEach(setFolderOpenState);
    LogUtil.log("getFolders / sortOrder", [SceneNavFolders.#currSceneSortMode]);
    if(SceneNavFolders.#currSceneSortMode === "a"){
      // alphabetical sort order
      folders.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    }else{
      // manual sort order
      folders.sort((a, b) => a.sort - b.sort);
    }

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
   * Retrieves a folder by its ID
   * @param {string} id - Scene folder id
   * @returns {object|string} Found folder object or DEFAULT_FOLDER_ID if not found
   */
  static getFolderById(id) {
    return ui.scenes.folders.find(fd => {
      return fd.id === id;
    }) || DEFAULT_FOLDER_ID;
  }

  /**
   * Gets an array of parent folders for a given folder ID
   * @param {string} folderId - The ID of the folder to get parents for
   * @returns {object[]} Array of parent folder objects from closest to furthest
   */
  static getParentFolders(folderId) {
    const parents = [];
    let currentFolder = ui.scenes.folders.find(f => f.id === folderId);
    
    // Keep track of visited folder IDs to prevent infinite loops
    const visitedFolders = new Set();
    
    while (currentFolder?.folder) {
      // If we've seen this folder before, we have a cycle
      if (visitedFolders.has(currentFolder.id)) {
        break;
      }
      visitedFolders.add(currentFolder.id);
      const parentFolder = currentFolder.folder; // folder property is already the parent folder object
      
      if (parentFolder) {
        parents.unshift(parentFolder);
        currentFolder = parentFolder;
      } else {
        break;
      }
    }
    
    return parents;
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
   * Preloads the Handlebars template for scene folder list
   * @returns {Promise<boolean>} True when template is successfully loaded
   */
  static preloadTemplate = async () => {
    const templatePath = [
      `modules/${MODULE_ID}/templates/scene-folder-list.hbs`
    ];
    
    // This returns an object with paths as keys and template functions as values
    await loadTemplates(templatePath);

  
    return true;
  }

  /**
   * Retrieves extended data for a folder
   * @param {object} folder - The folder object to get data for
   * @returns {object} Extended folder data
   */
  static getFoldersData = (folder) => {
    const children = folder.children.map(fc => SceneNavFolders.getFoldersData(fc.folder));
    const processedFolder = {
      ...folder,
      isOpen: SceneNavFolders.#folderToggleStates[folder.id] || false,
      children: children,
      hasSubfolders: children.length > 0,
      id: folder.id
    };

    return processedFolder;
  }

  /**
   * Renders the scene folders UI using the Handlebars template
   * @returns {Promise<void>}
   */
  static #templateData = null;
  static #folderElement = null;
  static #customList = null;

  static renderSceneFolders = async () => {
    if (SceneNavFolders.noFolderView()) { return; }
    if (!SceneNavFolders.selectedFolder) { return; }

    SceneNavFolders.#defaultFolderName = game.i18n.localize("CRLNGN_UI.ui.sceneNav.favoritesFolder");
    // Clear existing elements if they exist
    SceneNavFolders.#folderElement = document.querySelector('#crlngn-scene-folders');
    SceneNavFolders.#customList = document.querySelector('#crlngn-scene-list');
    SceneNavFolders.#folderElement?.remove();
    SceneNavFolders.#customList?.remove();
    
    const folders = SceneNavFolders.getFolders(ui.scenes.folders);
    const backButtonLabel = `CRLNGN_UI.settings.sceneNavMenu.fields.useNavBackButton.options.${TopNavigation.useNavBackButton}`;
    const backToLabel = game.i18n.localize(`CRLNGN_UI.ui.sceneNav.backTo`);
    const rootButtonLabel = TopNavigation.sceneNavAlias || game.i18n.localize(`CRLNGN_UI.ui.sceneNav.favoritesFolder`);
    // SceneNavFolders.selectedFolder !== DEFAULT_FOLDER_ID;
    // Prepare base template data
    const baseData = {
      favoritesId: DEFAULT_FOLDER_ID,
      favoritesName: SceneNavFolders.#defaultFolderName,
      folderList: folders.map(f => SceneNavFolders.getFoldersData(f)),
      viewedSceneId: game.scenes.current?.id,
      users: game.users.contents,
      isGM: game.user?.isGM,
      searchValue: SceneNavFolders.searchValue,
      showSearchResults: !!SceneNavFolders.searchValue,
      useNavBackButton: SceneNavFolders.isBackBtnActive(),
      backButtonLabel: SceneNavFolders.isBackBtnActive() ? game.i18n.localize(backButtonLabel) : '',
      rootButtonLabel: `${backToLabel} ${rootButtonLabel}`,
      useSceneIcons: TopNavigation.useSceneIcons,
      useScenePreview: TopNavigation.useScenePreview,
      sceneNavAlias: TopNavigation.sceneNavAlias,
      showRootFolders: TopNavigation.navShowRootFolders
    };
    
    LogUtil.log("rootFolders", [ui.scenes?.folders, game.folders]);
    // Add folder-specific data
    if (SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID) {
      const rootFolders = TopNavigation.navShowRootFolders ? ui.scenes?.folders.filter(f => f.folder===null) || [] : [];
      
      if(SceneNavFolders.#currSceneSortMode === "a"){
        // alphabetical sort order
        rootFolders.sort((a, b) => {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
      }else{
        // manual sort order
        rootFolders.sort((a, b) => a.sort - b.sort);
      }

      SceneNavFolders.#templateData = {
        ...baseData,
        currFolder: { name: "", id: DEFAULT_FOLDER_ID },
        currIcon: 'fa-map',
        folders: rootFolders,
        scenes: ui.nav.scenes.filter(sc => sc.permission >= 2),
        hasParents: false,
        parentFolders: []
      };
    } else {
      const foldersData = SceneNavFolders.selectedFolder.children;
      const folderParents = SceneNavFolders.getParentFolders(SceneNavFolders.selectedFolder.id);
  
      // Get folder contents and sort by sort property
      const folderScenes = [...SceneNavFolders.selectedFolder.contents];
      folderScenes.sort((a, b) => a.sort - b.sort);
      SceneNavFolders.#templateData = {
        ...baseData,
        currFolder: SceneNavFolders.selectedFolder,
        currIcon: 'fa-folder',
        folders: foldersData,
        scenes: folderScenes,
        hasParents: folderParents.length > 0,
        parentFolders: folderParents
      };
    }

    
    if(document.querySelector('#crlngn-scene-list')){
      return;
    }
    const renderedHtml = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-folder-list.hbs`, 
      SceneNavFolders.#templateData
    );
    
    const targetElement = document.querySelector('#scene-list');
    targetElement.insertAdjacentHTML('beforebegin', renderedHtml);
    
    SceneNavFolders.#folderElement = document.querySelector('#crlngn-scene-folders');
    SceneNavFolders.#customList = document.querySelector('#crlngn-scene-list');
    targetElement?.classList.add('hidden');
    const nav = SceneNavFolders.#customList; // targetElement.previousElementSibling;

    const sceneItems = nav.querySelectorAll("li.nav-item");
    const navPos = TopNavigation.navPos || 0;
    const newMargin = parseInt(sceneItems[navPos]?.offsetLeft) * -1;
    nav.style.marginLeft = newMargin + 'px';

    // Set up initial listeners
    SceneNavFolders.activateFolderListeners(SceneNavFolders.#folderElement);
    SceneNavFolders.#addSceneListeners(SceneNavFolders.#customList);

    TopNavigation.resetLocalVars();
  }

  static isBackBtnActive = () => {
    if(TopNavigation.useNavBackButton === BACK_BUTTON_OPTIONS.lastScene.name){
      return SceneNavFolders.#lastScenesVisited.length > 1;
    }else if(TopNavigation.useNavBackButton === BACK_BUTTON_OPTIONS.defaultScenes.name){
      return SceneNavFolders.selectedFolder !== DEFAULT_FOLDER_ID;
    }
    return false;
  }

  /**
   * Activates event listeners for the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static activateFolderListeners = (html) => {
    if (SceneNavFolders.noFolderView()) { return; }

    //add event to root folder button
    const rootButton = html.querySelector("i.root");
    rootButton?.addEventListener('click', SceneNavFolders.#onRootButton); 

    //add event to back button, if present
    const navBackButton = html.querySelector("i.fa-turn-left");
    navBackButton?.addEventListener('click', SceneNavFolders.#onBackButton); 

    // Add click or hover event to folder list header
    const selectedLink = html.querySelector('a.selected');
    if (TopNavigation.showFolderListOnClick) {
      selectedLink?.removeEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.removeEventListener('mouseleave', SceneNavFolders.#onOpenList);
      selectedLink?.addEventListener('click', SceneNavFolders.#onOpenList);
    } else {
      selectedLink?.addEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.addEventListener('mouseleave', SceneNavFolders.#onOpenList);
      selectedLink?.removeEventListener('click', SceneNavFolders.#onOpenList);
    }

    // add click event to each item of folder tree
    html.querySelectorAll(".parent-folder").forEach(folderIcon => {
      folderIcon.addEventListener('click', SceneNavFolders.#onSelectFolder); 
    }); 

    // Add click event to all toggle spans
    html.querySelectorAll('span.toggle').forEach(toggleSpan => {
      toggleSpan.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Find the parent li
        const parentLi = event.currentTarget.closest('li');
        const folderId = parentLi.dataset.folderId;
        // Find the subfolders list within this li
        const subfoldersOl = parentLi.querySelector('ol.subfolders');
        let isOpen = false;
        
        // Toggle visibility of the subfolders
        if (!subfoldersOl) { return; }
        const isHidden = !(subfoldersOl.classList.contains('open'));
        if (isHidden) {
          subfoldersOl.classList.add('open');
          isOpen = true;
        } else {
          subfoldersOl.classList.remove('open');
          isOpen = false;
        }
        event.currentTarget.textContent = isOpen ? '−' : '+';

        // Always update the toggle state
        SceneNavFolders.#folderToggleStates[folderId] = isOpen;
      });
    });

    // add click behavior for all folders in the list
    const folderItems = html.querySelectorAll(".folder-list li.folder");
    folderItems.forEach(fi => {
      fi.addEventListener("click", SceneNavFolders.#onSelectFolder);
    });

    const searchInput = html.querySelector('.search-container .input-scene-search');
    searchInput.addEventListener("keyup", SceneNavFolders.onSearchInput);
    searchInput.addEventListener('keydown', evt => {
      evt.stopPropagation();
    });

    const backButton = html.querySelector(".search-container .back-to-favorites");
    backButton.addEventListener("click", SceneNavFolders.#onSelectFolder);
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
      li.addEventListener("dblclick", isFolder ? () => {} : SceneNavFolders.#onActivateScene);
    });

    // Only add drag-drop if user is GM
    if (game.user?.isGM) {
      SceneNavFolders.#initializeDragDrop(html);

    }
  }

  /**
   * Initialize drag and drop functionality for scenes
   * @param {HTMLElement} html - The scene list container
   */
  static #initializeDragDrop = (html) => {
    // Check if Sortable is available, if not retry after a short delay
    clearInterval(SceneNavFolders.#sortableTimeout);

    let tries = 0;
    if (!Sortable && tries < 5) {
      SceneNavFolders.#sortableTimeout = setTimeout(() => SceneNavFolders.#initializeDragDrop(html), 500);
      tries++;
      return;
    }
    clearInterval(SceneNavFolders.#sortableTimeout);

    // Common options for both scenes and folders
    const commonOptions = {
      animation: 200,
      delay: 100,
      delayOnTouchOnly: true,
      onStart: function () {
        html.querySelectorAll(".scene.nav-item").forEach(it => it.classList.add('no-hover'));
        this.el.classList.add('no-hover');
      },
      onEnd: function () {
        html.querySelectorAll(".scene.nav-item").forEach(it => it.classList.remove('no-hover'));
        this.el.classList.remove('no-hover');
      }
    };

    // Initialize SortableJS for scenes
    const sceneOptions = {
      ...commonOptions,
      draggable: ".scene.nav-item",
      onEnd: async (evt) => {

        const scenes = html.querySelectorAll(".scene.nav-item");
        const updates = [];
        
        // Get all scenes in their new order
        const orderedScenes = Array.from(scenes).map(el => game.scenes.get(el.dataset.sceneId));
        
        // Calculate navigation order for scenes
        let order = 0;
        const density = CONST.SORT_INTEGER_DENSITY;

        // First pass: Update order for all scenes in the drag operation
        for (const scene of orderedScenes) {
          if (!scene) continue;
          
          const update = {
            _id: scene.id
          };

          // For default folder (Favorites), only update navOrder for navigable scenes
          if (SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID) {
            if (scene.navigation) {
              update.navOrder = order;
              order += density;
            }
          } 
          // For scenes in the selected folder, update their sort order
          else if (SceneNavFolders.selectedFolder && scene.folder?.id === SceneNavFolders.selectedFolder.id) {
            update.sort = order;
            order += density;
          }

          updates.push(update);
        }

        // Second pass: Update any remaining scenes not in the updates array
        const remainingScenes = game.scenes.contents.filter(s => !updates.some(u => u._id === s.id));
        
        // Sort remaining scenes by their current order (navOrder for favorites, sort for folders)
        remainingScenes.sort((a, b) => {
          if (SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID) {
            // Only include navigable scenes for favorites
            if (!a.navigation && !b.navigation) return 0;
            if (!a.navigation) return 1;
            if (!b.navigation) return -1;
            return a.navOrder - b.navOrder;
          } else {
            // Only include scenes from the current folder
            const aInFolder = a.folder?.id === SceneNavFolders.selectedFolder.id;
            const bInFolder = b.folder?.id === SceneNavFolders.selectedFolder.id;
            if (!aInFolder && !bInFolder) return 0;
            if (!aInFolder) return 1;
            if (!bInFolder) return -1;
            return a.sort - b.sort;
          }
        });

        // Update the remaining scenes with new order values
        for (const scene of remainingScenes) {
          if (SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID) {
            if (scene.navigation) {
              updates.push({
                _id: scene.id,
                navOrder: order
              });
              order += density;
            }
          } else if (scene.folder?.id === SceneNavFolders.selectedFolder.id) {
            updates.push({
              _id: scene.id,
              sort: order
            });
            order += density;
          }
        }

        // Apply updates
        if (updates.length) {
          await Scene.updateDocuments(updates);
          ui.nav.render();
          // Re-render the scene directory to reflect the new sort order
          game.scenes.directory.render();
        }
      }
    };

    // Initialize SortableJS for folders
    const folderOptions = {
      ...commonOptions,
      draggable: ".folder.nav-item",
      onEnd: async (evt) => {
        const folders = html.querySelectorAll(".folder.nav-item");
        const updates = [];
        
        // Get all folders in their new order
        const orderedFolders = Array.from(folders).map(el => {
          const folderId = el.dataset.folderId;
          return game.scenes.folders.find(f => f.id === folderId);
        }).filter(f => f);
        
        // Calculate sort order for folders
        let order = 0;
        const density = CONST.SORT_INTEGER_DENSITY;

        // Update sort order for all folders in the drag operation
        for (const folder of orderedFolders) {
          if (!folder) continue;
          
          // Only update folders that are children of the selected folder
          if (folder.folder?.id === SceneNavFolders.selectedFolder?.id) {
            updates.push({
              _id: folder.id,
              sort: order
            });
            order += density;
          }
        }

        // Update remaining folders in the same parent folder
        const remainingFolders = game.scenes.folders
          .filter(f => f.folder?.id === SceneNavFolders.selectedFolder?.id && !updates.some(u => u._id === f.id))
          .sort((a, b) => a.sort - b.sort);

        for (const folder of remainingFolders) {
          updates.push({
            _id: folder.id,
            sort: order
          });
          order += density;
        }

        // Apply updates
        if (updates.length) {
          await Folder.updateDocuments(updates);
          ui.nav.render();
          // Re-render the scene directory to reflect the new sort order
          game.scenes.directory.render();
        }
      }
    };

    // Create separate Sortable instances for scenes and folders
    Sortable.create(html, sceneOptions);
    Sortable.create(html, folderOptions);
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
    Hooks.on(HOOKS_CORE.CANVAS_INIT, () => {
      const sceneId = game.scenes?.viewed?.id;
      const length = SceneNavFolders.#lastScenesVisited.length;
      const lastSceneId = length > 0 ? SceneNavFolders.#lastScenesVisited[length-1] : null;
      const penultimateSceneId = length > 0 ? SceneNavFolders.#lastScenesVisited[length-2] : null;

      if(length === 0 || (penultimateSceneId !== sceneId && lastSceneId !== sceneId)){ 
        SceneNavFolders.#lastScenesVisited.push(sceneId);
        LogUtil.log(HOOKS_CORE.CANVAS_INIT, [SceneNavFolders.#lastScenesVisited]);
      };
    });


    
    // Add hook for when the scene directory renders to detect sorting mode
    Hooks.on(HOOKS_CORE.RENDER_SCENE_DIRECTORY, (app, html) => {
      SceneNavFolders.#updateSortMode();
    });

    Hooks.on(HOOKS_CORE.CREATE_FOLDER, (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
        ui.nav.render();
      }
    });
    
    Hooks.on(HOOKS_CORE.UPDATE_FOLDER, (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
        ui.nav.render();
      }
    });
    
    Hooks.on(HOOKS_CORE.DELETE_FOLDER, (folder) => {
      if(folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
        ui.nav.render();
      }
    });
    
    // Also hook into scene changes
    Hooks.on(HOOKS_CORE.CREATE_SCENE, () => {
      SceneNavFolders.refreshFolderView();
      ui.nav.render();
    });
    Hooks.on(HOOKS_CORE.UPDATE_SCENE, () => {
      SceneNavFolders.refreshFolderView();
      ui.nav.render();
    });
    Hooks.on(HOOKS_CORE.DELETE_SCENE, () => {
      SceneNavFolders.refreshFolderView();
      ui.nav.render();
    });

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

      // apply settings to scene directory
      const directoryScenes = sceneNav.querySelectorAll("li.scene");
      directoryScenes.forEach(sc => {
        const scene = game.scenes.get(sc.dataset.sceneId || sc.dataset.documentId);
        if(TopNavigation.sceneClickToView){
          sc.addEventListener("dblclick", SceneNavFolders.#onActivateScene);//onActivateScene
          sc.addEventListener("click", SceneNavFolders.#onSelectScene);
        }
        
        if(TopNavigation.useSceneIcons && scene && game.user?.isGM){
          let iconElem = document.createElement('i');
          iconElem.classList.add('fas');
          iconElem.classList.add('icon');
          if(scene.ownership.default!==0){
            if(scene.active){
              iconElem.classList.add('fa-bullseye');
              sc.prepend(iconElem);
            }
            if(game.scenes.current?.id===scene.id){
              iconElem.classList.add('fa-crown');
              sc.prepend(iconElem);
            }
          }else{
            iconElem.classList.add('fa-lock');
            sc.prepend(iconElem);
          }
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

          SceneNavFolders.#observeSceneContextMenu(optionLabel);
        }
      });
    });

    Hooks.on(HOOKS_CORE.GET_SCENE_NAV_CONTEXT, (nav, options) => {
      const initialViewOption = options.find(opt => opt.name === 'CRLNGN_UI.ui.sceneNav.initialViewBtn');
      if(!initialViewOption){
        options.push({
          ...options[0],
          condition: li => game.user?.isGM && game.scenes.get(li.data("sceneId"))._view,
          callback: li => {
            let scene = game.scenes.get(li.data("sceneId"));
            let x = parseInt(canvas.stage.pivot.x);
            let y = parseInt(canvas.stage.pivot.y);
            let scale = canvas.stage.scale.x;
            scene.update({ initial: { x: x, y: y, scale: scale } }, { diff: false });
            ui.notifications.info(game.i18n.localize("CRLNGN_UI.ui.notifications.initialViewSet"))
          },
          icon: "<i class=\"fas fa-expand\"></i>",
          name: 'CRLNGN_UI.ui.sceneNav.initialViewBtn'
        });
      }
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
        toggleNavItem.innerHTML = `<i class="fas fa-compass fa-fw"></i>${optionLabel}`;
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
    
    document.removeEventListener('click', SceneNavFolders.#onOutsideClick);
    const target = evt.currentTarget;
    const data = target.dataset;
    const scene = game.scenes.get(data.sceneId || data.documentId);
    const isSearchResult = target.parentElement?.classList.contains('search-results');
    
    // Temporarily override the sheet.render method to prevent scene configuration
    if (scene && scene.sheet) {
      const originalRender = scene.sheet.render;
      scene.sheet.render = function() { return this; };
      // Restore the original method after a short delay
      setTimeout(() => {
        scene.sheet.render = originalRender;
      }, 300);
    }

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
    const scene = game.scenes.get(data.sceneId || data.documentId);

    // Clear the single-click timer if it exists
    if (SceneNavFolders.#clickTimer) {
      clearTimeout(SceneNavFolders.#clickTimer);
      SceneNavFolders.#clickTimer = null;
    }

    scene.activate();
    SceneNavFolders.refreshFolderView();
  }

  static #onBackButton = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    switch(TopNavigation.useNavBackButton){
      case BACK_BUTTON_OPTIONS.defaultScenes.name:
        SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
        LogUtil.log("onBackButton",[BACK_BUTTON_OPTIONS.defaultScenes.name]);
        break;
      case BACK_BUTTON_OPTIONS.lastScene.name:
        const length = SceneNavFolders.#lastScenesVisited.length;
        const lastSceneId = length ? SceneNavFolders.#lastScenesVisited[length-2] : null;
        const lastScene = lastSceneId ? game.scenes?.get(lastSceneId) : null;
        if(lastScene){
          lastScene.view();
          const isInCurrFolder = lastScene.folder && SceneNavFolders.selectedFolder.id === lastScene.folder.id;
          const folder = (!isInCurrFolder && lastScene.navigation) || !lastScene.folder ? DEFAULT_FOLDER_ID : lastScene.folder.id;
          SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(folder);
          SceneNavFolders.#lastScenesVisited.splice(length-1, 1);
        }
        LogUtil.log("onBackButton",[lastScene, lastSceneId, SceneNavFolders.#lastScenesVisited]);
        break;
      default:
        //
    }
    SceneNavFolders.refreshFolderView();
  }

  static #onRootButton = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
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
  static onSearchInput = (evt) => {
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