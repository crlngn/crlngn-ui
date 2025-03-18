import { LogUtil } from "./LogUtil.mjs";

export class SceneNavFolders {
  static folderList;
  static folderData = [];

  static init(){
    SceneNavFolders.folderData = SceneNavFolders.getFolders(ui.scenes.folders);
  }

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