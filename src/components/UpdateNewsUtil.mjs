import { getSettings } from '../constants/Settings.mjs';
import { LogUtil } from './LogUtil.mjs';
import { SettingsUtil } from './SettingsUtil.mjs';

export class UpdateNewsUtil {
  /**
   * Get the URL for the update news JSON file
   * @returns {string} The URL to the module-updates.json file
   */
  static getUpdateNewsUrl() {
    const moduleVersion = game.modules.get('crlngn-ui')?.version;
    if(moduleVersion){
      return `https://github.com/crlngn/crlngn-ui/releases/download/v${moduleVersion}/module-updates.json?v=${(new Date).getTime()}`;
    }else{
      return `https://github.com/crlngn/crlngn-ui/releases/latest/download/module-updates.json?v=${(new Date).getTime()}`;
    }
  }
  
  /**
   * Initialize the update news system
   */
  static init() {
    if (!game.user?.isGM) return;
    this.checkForUpdates();
  }

  // call to clean up this setting from local storage
  static cleanSetting(){
    const SETTINGS = getSettings();
    SettingsUtil.set(SETTINGS.lastUpdateId.tag, '');
  }

  /**
   * Fetch and process update news from the remote JSON
   * @private
   */
  static async checkForUpdates() {
    const SETTINGS = getSettings();
    try {
      const response = await fetch(this.getUpdateNewsUrl());
      if (!response.ok) {
        LogUtil.warn("checkForUpdates | Failed to fetch update news", [response]);
        return;
      }
      
      const updateData = await response.json();
      const lastUpdateId = SettingsUtil.get(SETTINGS.lastUpdateId.tag);
      
      LogUtil.log('checkForUpdates...', [updateData.id, lastUpdateId]);
      // Check if this update has already been shown
      if (updateData.id === lastUpdateId) return;
      
      // Create and display the chat message
      await this.displayUpdateNews(updateData);
      
      // Save the current update ID
      SettingsUtil.set(SETTINGS.lastUpdateId.tag, updateData.id);
      LogUtil.log('checkForUpdates SUCCESS', [updateData.id]);
    } catch (error) {
      LogUtil.warn('checkForUpdates | Failed to check for updates', [error]);
    }
  }

  /**
   * Display the update news in the chat
   * @param {Object} updateData - The update data from the JSON
   * @param {string} updateData.id - Unique identifier for the update
   * @param {string} updateData.title - Update title
   * @param {string} updateData.content - Update content/description
   * @param {string} [updateData.imageUrl] - Optional GIF/image URL
   * @private
   */
  static async displayUpdateNews(updateData) {
    const content = `
      <div class="crlngn-news">
        <h3>${updateData.title}</h3>
        ${updateData.imageUrl ? `<img src="${updateData.imageUrl}" alt="Update Preview" />` : ''}
        ${updateData.videoUrl ? `<div class="updates-media-container"><video controls autoplay loop src="${updateData.videoUrl}" alt="Update Preview" style="width: 100%"></video></div>` : ''}
        <div class="crlngn-news-content">
        ${updateData.content}
        </div>
      </div>
    `;

    await ChatMessage.create({
      content,
      whisper: [game.user.id],
      speaker: { alias: 'Carolingian UI' }
    });
  }
}
