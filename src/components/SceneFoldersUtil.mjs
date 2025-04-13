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

  /**
   * Initializes the scene folders functionality by setting up event hooks
   * @static
   */
  static init() {
    if (SceneNavFolders.noFolderView() || !ui.scenes) { return; }
    SceneNavFolders.preloadTemplates();
    SceneNavFolders.folderListData = SceneNavFolders.getFolders(ui.scenes.folders);
    SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
  }

  /**
   * Add Scene folders to scene navigation bar
   * @param {SceneNavigation} nav - The scene navigation instance
   * @param {HTMLElement} navHtml - The navigation HTML element
   * @param {SceneNavData} navData - The scene navigation data
   */
  static addFolderButtons(nav, navHtml, navData){
    const SETTINGS = getSettings();
    const activeScenesMenu = navHtml.querySelector("#scene-navigation-active");
    const firstActiveItem = activeScenesMenu.querySelector("li.scene:first-of-type");
    const folderLookup = document.createElement("div");
    const folderToggle = document.createElement("div");

    folderLookup.id = "folder-lookup";
    folderLookup.dataset.tooltip = `Search Scenes`;
    folderLookup.innerHTML = `<button class='folder-expand'><i class='fa-solid fa-magnifying-glass'></i></button>`;
    folderToggle.id = "folder-toggle";
    folderToggle.dataset.tooltip = TopNavigation.navShowRootFolders ? `Hide Scene Folders` : `Show Scene Folders`;
    folderToggle.innerHTML = `<i class='fa-solid icon'></i>`;

    if(TopNavigation.navShowRootFolders){
      activeScenesMenu.classList.add('with-folders');
    }else{
      activeScenesMenu.classList.remove('with-folders');
    }

    folderLookup.addEventListener("click", SceneNavFolders.toggleFolderLookup);
    folderToggle.addEventListener("click", ()=>{
      TopNavigation.setNavPosition(0);
      SettingsUtil.set(SETTINGS.navShowRootFolders.tag, !TopNavigation.navShowRootFolders );
    });
    activeScenesMenu.insertBefore(folderLookup, firstActiveItem);
    activeScenesMenu.append(folderToggle);
  }

  // static addRootFolders(){
  //   const rootFolders = document.createElement("li");
  //   rootFolders.id = "root-folders";
  //   rootFolders.classList.add('folder');
    
  //   const templateData = SceneNavFolders.buildFolderData(DEFAULT_FOLDER_ID);
    
  // }

  static renderFolderList = async(folderElement) => {
    let targetElement;
    const folder = folderElement ? game.scenes.get(parentFolder.dataset.sceneId) : { name: "", id: DEFAULT_FOLDER_ID };
    const templateData = SceneNavFolders.buildTemplateData(folder);
    const renderedHtml = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-folder-list.hbs`, 
      templateData
    );

    LogUtil.log("renderedHtml",[renderedHtml]);

    if(!folderElement){ // if root folder
      targetElement = document.querySelector("#scene-navigation-inactive");
    }else{
      targetElement = folderElement.parentNode();
    }
    targetElement.insertAdjacentHTML('afterbegin', renderedHtml);

    const folderItems = targetElement.querySelectorAll("li.folder");
    folderItems.forEach(item => {
      item.querySelector(".folder-item").addEventListener('click', SceneNavFolders.#onNavFolderClick);
    });
  }

  /**
   * Event for when user expands the folder lookup element
   * @param {Event} event 
   */
  static toggleFolderLookup(event){
    
  }


  static #onNavFolderClick = async(event) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    const offsetLeft = target.offsetLeft;
    const renderedSubmenu = '';
    const activeFolders = target.parentNode.parentNode.querySelectorAll('.crlngn-folder-active');
    activeFolders.forEach(item => {
      if(item !== target){
        item.classList.remove('crlngn-folder-active');
      }
    });

    const id = target.dataset.folderId;
    const allFolders = ui.scenes.collection.folders;
    const folder = id ? allFolders.get(id) : null;
    LogUtil.log("#onNavFolderClick", [id]);
    if(!folder){ return; }

    const folderData = SceneNavFolders.buildTemplateData(folder);
    const renderedSubfolders = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-subfolders.hbs`, 
      folderData
    );
    const contents = target.parentNode.querySelector(".contents");
    if(contents) contents.remove();
    target.parentNode.insertAdjacentHTML('beforeend', renderedSubfolders);

    const folderItems = target.parentNode.querySelectorAll("li.folder");
    folderItems.forEach(item => {
      item.querySelector(".folder-item").addEventListener('click', SceneNavFolders.#onNavFolderClick);
    });
    TopNavigation.addSceneListeners(target.parentNode);
    
    target.parentNode.style.setProperty('--parent-offset-left', offsetLeft + 'px');
    target.parentNode.classList.toggle('crlngn-folder-active');
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
   * Builds template data for a folder
   * @param {Directory} targetFolder - The folder to build data for
   * @returns {object} Template data for the folder
   */
  static buildTemplateData(targetFolder){
    if(!targetFolder || !ui.scenes) return {};

    let templateData = {}, folderList = [];
    let folderScenes = targetFolder.contents ? [...targetFolder.contents] : []; 
    folderScenes = folderScenes.filter(sc => sc.permission >= 2); // only show scenes with appropriate permission

    SceneNavFolders.#currSceneSortMode = game.scenes.sortingMode;

    // Folder-specific data
    if (targetFolder.id === DEFAULT_FOLDER_ID) {
      folderList = ui.scenes.collection.folders.filter(f => f.folder===null) || [];
    } else {
      folderList = targetFolder.children;
    }

    folderList = SceneNavFolders.sortFolderList(folderList); // adjust the sorting
    templateData = {
      currentFolder: targetFolder,
      folders: folderList,
      scenes: folderScenes
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
      `modules/${MODULE_ID}/templates/scene-nav-folder-list.hbs`,
      `modules/${MODULE_ID}/templates/scene-nav-subfolders.hbs`
    ];
    
    // This returns an object with paths as keys and template functions as values
    await loadTemplates(templatePath);
  
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
}