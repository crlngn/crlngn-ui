

import { getSettings } from '../constants/Settings.mjs';
import { LogUtil } from './LogUtil.mjs';
import { SettingsUtil } from './SettingsUtil.mjs';

export class UpdateNewsUtil {
  static UPDATE_NEWS_URL = 'https://raw.githubusercontent.com/crlngn/crlngn-ui/main/news/module-updates.json'; // GitHub raw JSON URL
  // static UPDATE_NEWS_URL = "https://raw.githubusercontent.com/crlngn/crlngn-ui/refs/heads/scene-nav-folders/news/module-updates.json"; // for testing
  
  /**
   * Initialize the update news system
   */
  static init() {
    Hooks.once('ready', () => {
      if (!game.user?.isGM) return;
      // const SETTINGS = getSettings();
      // SettingsUtil.set(SETTINGS.lastUpdateId.tag, '');
      this.checkForUpdates();
    });
  }

  /**
   * Fetch and process update news from the remote JSON
   * @private
   */
  static async checkForUpdates() {
    const SETTINGS = getSettings();
    try {
      const response = await fetch(this.UPDATE_NEWS_URL);
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
      // await game.settings.set('crlngn-ui', SETTINGS.lastUpdateId.tag, updateData.id);
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
        ${updateData.imageUrl ? `<img src="${updateData.imageUrl}" alt="Update Preview">` : ''}
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
