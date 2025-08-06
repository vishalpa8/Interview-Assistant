"use strict";
// ScreenshotHelper.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotHelper = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const electron_1 = require("electron");
const uuid_1 = require("uuid");
const screenshot_desktop_1 = __importDefault(require("screenshot-desktop"));
const ErrorLogger_1 = require("./ErrorLogger");
class ScreenshotHelper {
    screenshotQueue = [];
    extraScreenshotQueue = [];
    MAX_SCREENSHOTS = 5;
    screenshotDir;
    extraScreenshotDir;
    view = "queue";
    constructor(view = "queue") {
        this.view = view;
        // Initialize directories
        this.screenshotDir = node_path_1.default.join(electron_1.app.getPath("userData"), "screenshots");
        this.extraScreenshotDir = node_path_1.default.join(electron_1.app.getPath("userData"), "extra_screenshots");
        // Create directories if they don't exist
        if (!node_fs_1.default.existsSync(this.screenshotDir)) {
            node_fs_1.default.mkdirSync(this.screenshotDir);
        }
        if (!node_fs_1.default.existsSync(this.extraScreenshotDir)) {
            node_fs_1.default.mkdirSync(this.extraScreenshotDir);
        }
    }
    getView() {
        return this.view;
    }
    setView(view) {
        this.view = view;
    }
    getScreenshotQueue() {
        return this.screenshotQueue;
    }
    getExtraScreenshotQueue() {
        return this.extraScreenshotQueue;
    }
    clearQueues() {
        // Clear screenshotQueue
        this.screenshotQueue.forEach((screenshotPath) => {
            node_fs_1.default.unlink(screenshotPath, (err) => {
                if (err)
                    (0, ErrorLogger_1.logError)('ScreenshotHelper.clearQueues', err, { screenshotPath });
            });
        });
        this.screenshotQueue = [];
        // Clear extraScreenshotQueue
        this.extraScreenshotQueue.forEach((screenshotPath) => {
            node_fs_1.default.unlink(screenshotPath, (err) => {
                if (err)
                    (0, ErrorLogger_1.logError)('ScreenshotHelper.clearQueues', err, { screenshotPath, type: 'extra' });
            });
        });
        this.extraScreenshotQueue = [];
    }
    async takeScreenshot(hideMainWindow, showMainWindow) {
        hideMainWindow();
        let screenshotPath = "";
        if (this.view === "queue") {
            screenshotPath = node_path_1.default.join(this.screenshotDir, `${(0, uuid_1.v4)()}.png`);
            await (0, screenshot_desktop_1.default)({ filename: screenshotPath });
            this.screenshotQueue.push(screenshotPath);
            if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
                const removedPath = this.screenshotQueue.shift();
                if (removedPath) {
                    try {
                        await node_fs_1.default.promises.unlink(removedPath);
                    }
                    catch (error) {
                        (0, ErrorLogger_1.logError)('ScreenshotHelper.takeScreenshot', error, { removedPath, view: this.view });
                    }
                }
            }
        }
        else {
            screenshotPath = node_path_1.default.join(this.extraScreenshotDir, `${(0, uuid_1.v4)()}.png`);
            await (0, screenshot_desktop_1.default)({ filename: screenshotPath });
            this.extraScreenshotQueue.push(screenshotPath);
            if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
                const removedPath = this.extraScreenshotQueue.shift();
                if (removedPath) {
                    try {
                        await node_fs_1.default.promises.unlink(removedPath);
                    }
                    catch (error) {
                        (0, ErrorLogger_1.logError)('ScreenshotHelper.takeScreenshot', error, { removedPath, view: this.view });
                    }
                }
            }
        }
        showMainWindow();
        return screenshotPath;
    }
    async getImagePreview(filepath) {
        try {
            const data = await node_fs_1.default.promises.readFile(filepath);
            return `data:image/png;base64,${data.toString("base64")}`;
        }
        catch (error) {
            (0, ErrorLogger_1.logError)('ScreenshotHelper.getImagePreview', error, { filepath });
            throw error;
        }
    }
    async deleteScreenshot(path) {
        try {
            await node_fs_1.default.promises.unlink(path);
            if (this.view === "queue") {
                this.screenshotQueue = this.screenshotQueue.filter((filePath) => filePath !== path);
            }
            else {
                this.extraScreenshotQueue = this.extraScreenshotQueue.filter((filePath) => filePath !== path);
            }
            return { success: true };
        }
        catch (err) {
            (0, ErrorLogger_1.logError)('ScreenshotHelper.deleteScreenshot', err, { screenshotPath: path });
            return { success: false, error: err.message };
        }
    }
}
exports.ScreenshotHelper = ScreenshotHelper;
//# sourceMappingURL=ScreenshotHelper.js.map