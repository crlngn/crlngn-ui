import { MODULE_ID } from "../constants/General.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class SceneNavFolders {
  static selectedFolder;
  static folderList;
  static folderData = [];

  static init(){
    const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    if(!isMonksScenenNavOn){
      SceneNavFolders.preloadTemplate();
    }
    SceneNavFolders.folderData = SceneNavFolders.getFolders(ui.scenes.folders);
    SceneNavFolders.selectFolder("KkaCkFDLOFGHmVAF"); // ("j6VwZl4dQMz4mqmX");
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
    SceneNavFolders.selectedFolder = SceneNavFolders.getFolderById(id);
  }

  /**
   * 
   * @param {string} id - Scene folder id
   */
  static getFolderById(id){
    return ui.scenes.folders.find(fd => {
      LogUtil.log("getFolderById", []);
      return fd.id===id
    });
  }

  static createRenderedList = () => {
    const list = document.createElement("li"); 
    list.classList.add('nav-item');
    list.classList.add('scene-folders');

    const selectedFolder = document.createElement("a"); 
    selectedFolder.classList.add('selected');
    const folderIcon = document.createElement("i"); 
    folderIcon.classList.add('fas');
    folderIcon.classList.add('fa-folder');
    list.append(selectedFolder);
    selectedFolder.innerHTML = `Selected Folder`;
    selectedFolder.prepend(folderIcon);
    list.append(selectedFolder);

    // gather the data
    const folderData = SceneNavFolders.getFolders(ui.scenes.folders);
    const folderList = SceneNavFolders.createListElement(folderData);

    list.append(folderList);

    // add to DOM
    document.querySelector('#navigation #scene-list').prepend(list);
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
    // TopNavigation.sceneFoldersTemplate = await loadTemplates(templatePath);
    await loadTemplates(templatePath);

    LogUtil.log("preloadTemplate", [true]);
  
    return true;
    // TopNavigation.sceneFoldersTemplate;
  }

  static renderSceneFolders = async() => {
    LogUtil.log("SCENE NAV renderSceneFolders", []);

    if(!SceneNavFolders.selectedFolder){ return };
    const folders = SceneNavFolders.getFolders(ui.scenes.folders);

    // Prepare data for template
    const templateData = {
      folderList: folders.map(f => {
        return {
          ...f,
          hasSubfolders: f.children.length > 0
        };
      }),
      currFolder: SceneNavFolders.selectedFolder,
      scenes: SceneNavFolders.selectedFolder.contents,
      users: game.users.contents,
      isGM: game.user.isGM
    };
    LogUtil.log("SCENE NAV renderSceneFolders", [templateData, game.users]);
    
    // Render the template using renderTemplate
    const renderedHtml = await renderTemplate(`modules/${MODULE_ID}/templates/scene-folder-list.hbs`, templateData);
    
    // Find the DOM element before which you want to insert your content
    const targetElement = document.querySelector('#scene-list');
    
    // Insert the HTML content before the target element
    targetElement.insertAdjacentHTML('beforebegin', renderedHtml);
    const folderElement = document.querySelector('#crlngn-scene-folder');

    if(SceneNavFolders.selectedFolder){
      folderElement.classList.remove('hidden');
      targetElement.classList.add('hidden');
    }else{
      folderElement.classList.add('hidden');
      targetElement.classList.remove('hidden');
    }
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
  }

}