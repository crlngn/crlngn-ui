import { HOOKS_SOCKET, MODULE_NAME } from "../constants/module.js";
import { LogUtil } from "./LogUtil.js";

export class SocketUtil {
    static socket = null;

    // register our module with socketlib
    static initialize = (callbackFunc) => {
      Hooks.once(HOOKS_SOCKET.READY, () => { 
        LogUtil.log(`Attempting to register module...`);

        try{ 
          this.socket = socketlib.registerModule(MODULE_NAME);
          if(callbackFunc){ callbackFunc(this.socket) }
          LogUtil.log(`SocketUtil | module registered`);
        }catch(e){
          LogUtil.log(`Problem registering module`);
        }
      })
      
    }

    // register a callback function
    static registerCall = (name, func)=>{
      this.socket && this.socket.register(name, func);
      LogUtil.log(`SocketUtil - Registered callback`, [name]);
    }

    static sendMessage = (value, callback) => {
      LogUtil.log(`SocketUtil - sendMessage`, [value]);
      callback();
    }

    /**
     * 
     * @param {Function} handler 
     * @param {*} parameters 
     * @returns Promise
     */
    static execAsGM = async(handler, parameters) => {
      return await this.socket.executeAsGM(handler, ...parameters);
    }

    /**
     * 
     * @param {Function} handler 
     * @param {*} parameters 
     * @returns Promise
     */
    static execForAll = async(handler, parameters) => {
      return await this.socket.executeForEveryone(handler, ...parameters);
    }


}