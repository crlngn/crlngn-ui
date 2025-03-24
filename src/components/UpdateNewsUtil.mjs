

import { MODULE_SETTINGS } from '../constants/Settings.mjs';

export class UpdateNewsUtil {
  static UPDATE_NEWS_URL = 'news/module-updates.json'; // Replace with your GitHub raw JSON URL
  
  /**
   * Initialize the update news system
   */
  static init() {
    if (!game.user?.isGM) return;
    
    Hooks.once('ready', () => {
      this.checkForUpdates();
    });
  }

  /**
   * Fetch and process update news from the remote JSON
   * @private
   */
  static async checkForUpdates() {
    try {
      const response = await fetch(this.UPDATE_NEWS_URL);
      if (!response.ok) throw new Error('Failed to fetch update news');
      
      const updateData = await response.json();
      const lastUpdateId = game.settings.get('crlngn-ui', MODULE_SETTINGS.lastUpdateId);
      
      // Check if this update has already been shown
      if (updateData.id === lastUpdateId) return;
      
      // Create and display the chat message
      await this.displayUpdateNews(updateData);
      
      // Save the current update ID
      await game.settings.set('crlngn-ui', MODULE_SETTINGS.lastUpdateId, updateData.id);
    } catch (error) {
      console.error('Failed to check for updates:', error);
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
        <div class="crlngn-news-content">${updateData.content}</div>
      </div>
    `;

    await ChatMessage.create({
      content,
      whisper: [game.user.id],
      speaker: { alias: 'Carolingian UI' }
    });
  }
}
