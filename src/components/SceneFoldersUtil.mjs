import { MODULE_ID } from "../constants/General.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";

const DEFAULT_FOLDER_ID = "Favorites";

export class SceneNavFolders {
  static selectedFolder;
  static folderList;
  static folderData = [];

  static init(){
    if(!SceneNavFolders.folderData || SceneNavFolders.folderData.length === 0){
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      if(!isMonksScenenNavOn){
        SceneNavFolders.preloadTemplate();
      }
      LogUtil.log("SceneNavFolders",[ui.scenes]);
      SceneNavFolders.folderData = SceneNavFolders.getFolders(ui.scenes.folders);
      SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder("KkaCkFDLOFGHmVAF"); // ("j6VwZl4dQMz4mqmX");
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
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    });
    LogUtil.log("getFolders", [folders]);

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
    let folderElement, templateData;

    if(!SceneNavFolders.selectedFolder){return;}
    LogUtil.log("SCENE NAV renderSceneFolders", []);

    folderElement = document.querySelector('#crlngn-scene-folders');
    if(folderElement){
      folderElement.remove();
    }
    const folders = SceneNavFolders.getFolders(ui.scenes.folders);

    if(SceneNavFolders.selectedFolder === DEFAULT_FOLDER_ID){
      // Prepare data for template
      templateData = {
        favoritesId: DEFAULT_FOLDER_ID,
        folderList: folders.map(f => SceneNavFolders.getFoldersData(f) ),
        currFolder: { name: DEFAULT_FOLDER_ID },
        currIcon: 'fa-star',
        scenes: ui.nav.scenes,
        users: game.users.contents,
        isGM: game.user.isGM
      };
    }else{
      templateData = {
        favoritesId: DEFAULT_FOLDER_ID,
        folderList: folders.map(f => SceneNavFolders.getFoldersData(f) ),
        currFolder: SceneNavFolders.selectedFolder,
        currIcon: 'fa-folder',
        scenes: SceneNavFolders.selectedFolder.contents,
        users: game.users.contents,
        isGM: game.user.isGM
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

    folderElement.classList.remove('hidden');
    targetElement.classList.add('hidden');
    // if(SceneNavFolders.selectedFolder){
    //   folderElement.classList.remove('hidden');
    //   targetElement.classList.add('hidden');
    // }else{
    //   folderElement.classList.add('hidden');
    //   targetElement.classList.remove('hidden');
    // }
    const insertedHtml = targetElement.previousElementSibling;
    SceneNavFolders.activateListeners(insertedHtml);
  }

  static activateListeners = (html) => {
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

    const folderItems = html.querySelectorAll(".folder-list li.folder");
    folderItems.forEach(fi => {
      fi.addEventListener("click", SceneNavFolders.onSelectFolder);
    })
  }

  static onSelectFolder = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    const data = target.dataset;
    LogUtil.log("onSelectFolder", [target, data, data.folderId]);
    SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(data.folderId || "");
    SceneNavFolders.refreshFolderView()
    // SceneNavFolders.renderSceneFolders();
  }

  static refreshFolderView() {
    // Update the folder data
    SceneNavFolders.folderData = SceneNavFolders.getFolders(ui.scenes.folders);
    // Re-render the scene folders
    SceneNavFolders.renderSceneFolders();
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

}