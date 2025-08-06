"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortcutsHelper = void 0;
const electron_1 = require("electron");
const ErrorLogger_1 = require("./ErrorLogger");
class ShortcutsHelper {
    appState;
    constructor(appState) {
        this.appState = appState;
    }
    registerGlobalShortcuts() {
        electron_1.globalShortcut.register("CommandOrControl+H", async () => {
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow) {
                try {
                    await this.appState.takeScreenshot();
                }
                catch (error) {
                    (0, ErrorLogger_1.logError)('Screenshot', error, { hotkey: 'Ctrl+H' });
                }
            }
        });
        electron_1.globalShortcut.register("CommandOrControl+Enter", async () => {
            await this.appState.processingHelper.processScreenshots();
        });
        electron_1.globalShortcut.register("CommandOrControl+R", () => {
            this.appState.clearQueues();
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send("reset-view");
            }
        });
        // New shortcuts for moving the window
        electron_1.globalShortcut.register("CommandOrControl+Left", () => {
            this.appState.moveWindowLeft();
        });
        electron_1.globalShortcut.register("CommandOrControl+Right", () => {
            this.appState.moveWindowRight();
        });
        electron_1.globalShortcut.register("CommandOrControl+Down", () => {
            this.appState.moveWindowDown();
        });
        electron_1.globalShortcut.register("CommandOrControl+Up", () => {
            this.appState.moveWindowUp();
        });
        electron_1.globalShortcut.register("CommandOrControl+B", () => {
            this.appState.toggleMainWindow();
            // If window exists and we're showing it, bring it to front
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow && !this.appState.isVisible()) {
                // Force the window to the front on macOS
                if (process.platform === "darwin") {
                    mainWindow.setAlwaysOnTop(true, "normal");
                    // Reset alwaysOnTop after a brief delay
                    setTimeout(() => {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.setAlwaysOnTop(true, "floating");
                        }
                    }, 100);
                }
            }
        });
        // Unregister shortcuts when quitting
        electron_1.app.on("will-quit", () => {
            electron_1.globalShortcut.unregisterAll();
        });
    }
}
exports.ShortcutsHelper = ShortcutsHelper;
//# sourceMappingURL=shortcuts.js.map