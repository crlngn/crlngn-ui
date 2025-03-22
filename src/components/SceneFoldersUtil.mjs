import { MODULE_ID } from "../constants/General.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";

const DEFAULT_FOLDER_ID = "Favorites";

export class SceneNavFolders {
  static selectedFolder;
  static folderList;
  static folderData = [];
  static searchValue = "";

  static init(){
    if(SceneNavFolders.noFolderView()){ return; }
    if(!SceneNavFolders.folderData || SceneNavFolders.folderData.length === 0){
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      if(!isMonksScenenNavOn){
        SceneNavFolders.preloadTemplate();
      }
      LogUtil.log("SceneNavFolders",[ui.scenes]);
      SceneNavFolders.folderData = SceneNavFolders.getFolders(ui.scenes.folders);
      SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID); // ("j6VwZl4dQMz4mqmX");
    }
    SceneNavFolders.registerHooks();
  }

  /**
   * 
   * @param {object[]} fromList 
   * @returns 
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

  static selectFolder = (id) => {
    return SceneNavFolders.getFolderById(id) || null;
  }

  /**
   * 
   * @param {string} id - Scene folder id
   */
  static getFolderById(id){
    return ui.scenes.folders.find(fd => {
      return fd.id===id
    }) || DEFAULT_FOLDER_ID;
  }

  static createFolderElem = () => {
    const folderElem = document.createElement("li");
    return folderElem;
  }

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

  static preloadTemplate = async() => {
    const templatePath = [
      `modules/${MODULE_ID}/templates/scene-folder-list.hbs`
    ];
    
    // This returns an object with paths as keys and template functions as values
    await loadTemplates(templatePath);

    LogUtil.log("preloadTemplate", [true]);
  
    return true;
  }

  static getFoldersData = (folder) => {
    return {
      ...folder,
      children: folder.children.map(fc => SceneNavFolders.getFoldersData(fc)),
      hasSubfolders: folder.children.length > 0,
      id: folder.id
    };
  }

  static renderSceneFolders = async() => {
    if(SceneNavFolders.noFolderView()){ return; }
    let folderElement, templateData;

    if(!SceneNavFolders.selectedFolder){return;}
    LogUtil.log("SCENE NAV renderSceneFolders", []);

    folderElement = document.querySelector('#crlngn-scene-list');
    if(folderElement){
      folderElement.remove();
    }
    const folders = SceneNavFolders.getFolders(ui.scenes.folders);

    if(SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID){
      // Prepare data for template
      templateData = {
        favoritesId: DEFAULT_FOLDER_ID,
        folderList: folders.map(f => SceneNavFolders.getFoldersData(f) ),
        currFolder: { name: DEFAULT_FOLDER_ID, id: DEFAULT_FOLDER_ID },
        currIcon: 'fa-star',
        scenes: ui.nav.scenes.filter(sc => sc.permission >= 2),
        users: game.users.contents,
        isGM: game.user.isGM,
        searchValue: SceneNavFolders.searchValue,
        showSearchResults: !!SceneNavFolders.searchValue
      };
    }else{
      templateData = {
        favoritesId: DEFAULT_FOLDER_ID,
        folderList: folders.map(f => SceneNavFolders.getFoldersData(f) ),
        currFolder: SceneNavFolders.selectedFolder,
        currIcon: 'fa-folder',
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
    folderElement = document.querySelector('#crlngn-scene-list');

    folderElement.classList.remove('hidden');
    targetElement.classList.add('hidden');

    const insertedHtml = targetElement.previousElementSibling;
    SceneNavFolders.activateListeners(insertedHtml);
  }

  static activateListeners = (html) => {
    if(SceneNavFolders.noFolderView()){ return; }

    // Add click or hover event to folder list header
    if(TopNavigation.showFolderListOnClick){
      html.querySelector('.scene-folders').removeEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.querySelector('.scene-folders').removeEventListener('mouseout', SceneNavFolders.#onOpenList);
      html.querySelector('.scene-folders a.selected').addEventListener('click', SceneNavFolders.#onOpenList);
      html.querySelector('.scene-folders a.selected').addEventListener('blur', SceneNavFolders.#onOpenList);
    }else{
      html.querySelector('.scene-folders').addEventListener('mouseover', SceneNavFolders.#onOpenList);
      html.querySelector('.scene-folders').addEventListener('mouseout', SceneNavFolders.#onOpenList);
      html.querySelector('.scene-folders a.selected').removeEventListener('click', SceneNavFolders.#onOpenList);
      html.querySelector('.scene-folders a.selected').removeEventListener('blur', SceneNavFolders.#onOpenList);
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

    const sceneItems = html.querySelectorAll("#crlngn-scene-list li.nav-item");
    sceneItems.forEach(fi => {
      fi.addEventListener("click", SceneNavFolders.#onSceneClick);
    });

    const searchInput = html.querySelector('.search-container .input-scene-search');
    searchInput.addEventListener("keyup", SceneNavFolders.#onSearchInput);
    searchInput.addEventListener('keydown', evt => {
      evt.stopPropagation();
    });
  }

  static refreshFolderView() {
    if(SceneNavFolders.noFolderView()){ return; }
    // Update the folder data
    SceneNavFolders.folderData = SceneNavFolders.getFolders(ui.scenes.folders);
    // Re-render the scene folders
    SceneNavFolders.renderSceneFolders();
  }

  static updateSearchResults = (searchValue) => {
    if(SceneNavFolders.noFolderView()){ return; }
    // Get search results container
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
      li.innerHTML = `<a><i class="fas fa-compass"></i> ${scene.name}</a>`;
      li.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        LogUtil.log("scene click", [scene]);
        const sceneFolder = scene.folder;
        if(sceneFolder){
          SceneNavFolders.selectedFolder = sceneFolder;
        }else{
          SceneNavFolders.selectedFolder = DEFAULT_FOLDER_ID;
        }
        // Navigate to scene
        game.scenes.get(scene.id).view();
        //
        SceneNavFolders.refreshFolderView();
      });
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

  static registerHooks() {
    Hooks.on("createFolder", (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
      }
    });
    
    Hooks.on("updateFolder", (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
      }
    });
    
    Hooks.on("deleteFolder", (folder) => {
      if (folder.type === "Scene") {
        SceneNavFolders.refreshFolderView();
      }
    });
    
    // Also hook into scene changes
    Hooks.on("createScene", () => SceneNavFolders.refreshFolderView());
    Hooks.on("updateScene", () => SceneNavFolders.refreshFolderView());
    Hooks.on("deleteScene", () => SceneNavFolders.refreshFolderView());
  }

  static #onOpenList = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    const target = evt.currentTarget;
    const parent = target?.closest('.scene-folders');

    if(parent?.classList.contains('open')){
      parent?.classList.remove('open');
    } else {
      parent?.classList.add('open');
    }
  }


  static #onSelectFolder = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    const data = target.dataset;
    SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(data.folderId || "");
    SceneNavFolders.refreshFolderView();
  }

  static #onSearchInput = (evt) => {
    evt.stopPropagation();
    
    const input = evt.currentTarget;
    const value = input.value;
    
    SceneNavFolders.searchValue = value;
    SceneNavFolders.updateSearchResults(value);
  }

  static #onSceneClick = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    let sceneId = evt.currentTarget?.dataset?.sceneId || "";

    if(sceneId){
      game.scenes.get(sceneId).view();
    }
  }

  static noFolderView = () => {
    const isGM = game?.user?.isGM;
    return (!isGM && !TopNavigation.navFoldersForPlayers) ||
      (!TopNavigation.navFoldersEnabled) ||
      (!TopNavigation.sceneNavEnabled)
  }

}