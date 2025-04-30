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
    const baseUrl = moduleVersion 
      ? `https://github.com/crlngn/crlngn-ui/releases/download/v${moduleVersion}/module-updates.json` 
      : `https://github.com/crlngn/crlngn-ui/releases/latest/download/module-updates.json`;
    
    // Use our custom CORS proxy service
    return `https://proxy.carolingian.io/proxy?url=${encodeURIComponent(baseUrl)}&v=${moduleVersion}`;
  }
  
  /**
   * Initialize the update news system
   */
  static init() {
    if (!game.user?.isGM) return;
    // this.cleanSetting();
    this.checkForUpdates();
  }

  static getIdFromRawJson = async () => {
    const rawUrl = "https://raw.githubusercontent.com/crlngn/crlngn-ui/refs/heads/v2/news/module-updates.json";
    const response = await fetch(rawUrl);
    const json = response.ok ? await response.json() : null;

    return json ? json.id || '' : '';
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
      // Add a timeout to the fetch to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 5 second timeout
      
      try {
        const lastUpdateId = await SettingsUtil.get(SETTINGS.lastUpdateId.tag);
        const rawVersion = await UpdateNewsUtil.getIdFromRawJson();
        LogUtil.log('checkForUpdates...', [rawVersion, lastUpdateId]);
        if(lastUpdateId === rawVersion){
          return;
        }
        const response = await fetch(UpdateNewsUtil.getUpdateNewsUrl(), { 
          signal: controller.signal,
          // Prevent uncaught errors for network issues
          mode: 'cors',
          // Don't send cookies or auth
          credentials: 'omit'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          LogUtil.warn("checkForUpdates | Failed to fetch update news", [response.status, response.statusText]);
          return;
        }
        
        const updateData = await response.json();
        
        // Create and display the chat message
        await this.displayUpdateNews(updateData);
        
        // Save the current update ID
        SettingsUtil.set(SETTINGS.lastUpdateId.tag, updateData.id);
        LogUtil.log('checkForUpdates | SUCCESS', [updateData.id]);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Handle fetch-specific errors
        if (fetchError.name === 'AbortError') {
          LogUtil.warn('checkForUpdates | Request timed out', [fetchError]);
        } else {
          LogUtil.warn('checkForUpdates | Fetch error', [fetchError.message]);
        }
      }
    } catch (error) {
      // This outer try/catch will handle any other errors
      LogUtil.warn('checkForUpdates | Unexpected error', [error]);
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
    try{
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

      LogUtil.error('displayUpdateNews | Chat message created', [updateData]);
      const resp = await ChatMessage.create({
        content,
        whisper: [game.user.id],
        speaker: { alias: 'Carolingian UI' }
      });
      
      LogUtil.error('displayUpdateNews | Chat message created', [resp, updateData]);

    }catch(error){
      LogUtil.error('displayUpdateNews | Error creating chat message', [error]);
    }
    
  }
}
