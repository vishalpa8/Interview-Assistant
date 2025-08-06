import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import axios from "axios";
import * as https from "https";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
const screenshot = require("screenshot-desktop");

// Load environment variables
dotenv.config();

// Configure axios to handle SSL certificate issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Allow self-signed certificates
});

axios.defaults.httpsAgent = httpsAgent;

// Simple development detection
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Smart logging for main process
class MainLogger {
  private isDev: boolean;
  
  constructor() {
    this.isDev = isDev;
  }
  
  log(message: string, data?: any) {
    if (this.isDev) {
      console.log(`[MAIN] ${message}`, data || '');
    }
  }
  
  warn(message: string, data?: any) {
    if (this.isDev) {
      console.warn(`[MAIN] ${message}`, data || '');
    }
  }
  
  error(message: string, error?: any) {
    if (this.isDev) {
      console.error(`[MAIN] ${message}`, error || '');
    }
    // In production, could send to error reporting service
  }
}

const mainLogger = new MainLogger();

// Production Ghost Mode - Complete Invisibility
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('silent-debugger-extension-api');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-component-extensions-with-background-pages');

// Disable hardware acceleration for ghost mode
app.disableHardwareAcceleration();

// Complete OS-level hiding
if (process.platform === 'darwin') {
  app.dock?.hide();
}

// Remove from system tracking
app.setAppUserModelId('');
app.setName('');

// Disable crash reporting and telemetry
app.commandLine.appendSwitch('disable-crash-reporter');
app.commandLine.appendSwitch('disable-metrics');
app.commandLine.appendSwitch('disable-metrics-reporting');

let mainWindow: BrowserWindow;

// Screenshot storage for ghost mode
let screenshotStorage: Array<{ path: string; preview: string }> = [];

// Screenshot directory setup
const screenshotDir = path.join(app.getPath("userData"), "screenshots");

// Ensure screenshot directory exists
function ensureScreenshotDir() {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
}

// Production Ghost Mode - Complete Invisibility
function setupGhostMode(): void {
  if (!mainWindow) return;
  
  // Universal ghost mode settings
  mainWindow.setSkipTaskbar(true);
  mainWindow.setContentProtection(true);
  mainWindow.setFocusable(true);
  mainWindow.setMenuBarVisibility(false);
  
  // Windows-specific advanced stealth
  if (process.platform === 'win32') {
    try {
      // Hide from Windows Defender Application Guard
      mainWindow.setAppDetails({
        appId: '',
        appIconPath: '',
        appIconIndex: 0,
        relaunchCommand: '',
        relaunchDisplayName: ''
      });
    } catch (error) {
      // Silent fallback
    }
  }
  
  // macOS-specific advanced stealth
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: false });
    try {
      // Hide from macOS screen recording detection
      mainWindow.setWindowButtonVisibility(false);
    } catch (error) {
      // Silent fallback
    }
  }
  
  // Show window with stealth active
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 100);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 600,
    show: true,
    center: true,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: false,
    },
    title: '',
    icon: undefined,
    minimizable: false,
    maximizable: false,
    closable: false,
    resizable: false,
    movable: true,
    focusable: true,
    hasShadow: false,
    thickFrame: false,
    titleBarStyle: 'hidden',
    acceptFirstMouse: true,
    disableAutoHideCursor: true,
    // Enhanced ghost properties
    roundedCorners: false,
    vibrancy: undefined,
    visualEffectState: undefined,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Permanent ghost mode configuration - always active
  setupGhostMode();

  // Force show the window
  mainWindow.show();
  mainWindow.focus();

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null as any;
  });
}

// IPC Handlers for the Interview Assistant functionality
function setupIpcHandlers() {
  // Window management
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }) => {
      if (width && height && mainWindow) {
        mainWindow.setSize(
          Math.min(width + 32, 800),
          Math.min(height + 32, 800)
        );
      }
    }
  );

  // Screenshot functionality
  ipcMain.handle("get-screenshots", async () => {
    return screenshotStorage;
  });

  ipcMain.handle("take-screenshot", async () => {
    try {
      // Ensure screenshot directory exists
      ensureScreenshotDir();

      // Generate unique filename
      const filename = `screenshot-${uuidv4()}.png`;
      const filepath = path.join(screenshotDir, filename);

      // Hide the main window temporarily for clean screenshot
      const wasVisible = mainWindow?.isVisible();
      if (wasVisible && mainWindow) {
        mainWindow.hide();
      }

      // Wait a moment for window to hide
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Take the screenshot
      await screenshot({ filename: filepath });

      // Show window again if it was visible
      if (wasVisible && mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }

      // Read the screenshot file and convert to base64 for preview
      const imageBuffer = fs.readFileSync(filepath);
      const base64Image = `data:image/png;base64,${imageBuffer.toString(
        "base64"
      )}`;

      // Create screenshot object
      const newScreenshot = {
        path: filepath,
        preview: base64Image,
      };

      // Add to storage
      screenshotStorage.push(newScreenshot);

      // Send event to renderer
      if (mainWindow) {
        mainWindow.webContents.send("screenshot-taken", newScreenshot);
      }

      return { success: true, path: filepath };
    } catch (error) {
      // Show window again if hidden
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("delete-screenshot", async (event, path) => {
    try {
      // Remove from storage
      const initialLength = screenshotStorage.length;
      screenshotStorage = screenshotStorage.filter(
        (screenshot) => screenshot.path !== path
      );

      const removedFromStorage = screenshotStorage.length < initialLength;

      // Delete the actual file if it exists
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }

      return { success: removedFromStorage };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Audio processing (mock for now)
  ipcMain.handle("analyze-audio-base64", async (event, data, mimeType) => {
    // Mock implementation
    return {
      text: "Audio analysis not implemented yet",
      timestamp: Date.now(),
    };
  });

  ipcMain.handle("analyze-audio-file", async (event, path) => {
    // Mock implementation
    return {
      text: "Audio file analysis not implemented yet",
      timestamp: Date.now(),
    };
  });

  // Ask functionality using Gemini AI with axios
  ipcMain.handle("ask-question", async (event, question) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error:
            "GEMINI_API_KEY not found. Please set up your API key in environment variables.",
        };
      }

      const prompt = `Answer this question directly and naturally, like a knowledgeable friend would. Be precise and accurate without unnecessary explanations or AI-like language. Keep it conversational and human-like. Don't start with phrases like "Here's how" or "Let me explain" or "The answer is". Just give the answer naturally:

${question}`;

      // Use axios to make the API call directly
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout
          httpsAgent: httpsAgent, // Use the configured HTTPS agent
          validateStatus: function (status) {
            return status >= 200 && status < 300; // Accept only success status codes
          },
        }
      );

      const text = response.data.candidates[0].content.parts[0].text;

      return {
        success: true,
        answer: {
          text: text,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      let errorMessage = "Unknown error occurred";

      if (axios.isAxiosError(error)) {
        if (error.code === "ENOTFOUND") {
          errorMessage =
            "Network connection failed. Please check your internet connection.";
        } else if (error.code === "ECONNREFUSED") {
          errorMessage =
            "Connection refused. Please check your network settings.";
        } else if (
          error.code === "CERT_HAS_EXPIRED" ||
          error.message.includes("certificate")
        ) {
          errorMessage =
            "SSL certificate issue. This might be due to corporate firewall or proxy settings.";
        } else if (
          error.code === "ETIMEDOUT" ||
          error.message.includes("timeout")
        ) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.response?.status === 401) {
          errorMessage = "Invalid API key. Please check your GEMINI_API_KEY.";
        } else if (error.response?.status === 403) {
          errorMessage =
            "API access forbidden. Please check your API key permissions.";
        } else if (error.response && error.response.status >= 500) {
          errorMessage = "Google API server error. Please try again later.";
        } else {
          errorMessage = `Network error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  });

  // Window movement
  ipcMain.handle("move-window-left", async () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(Math.max(0, x - 50), y);
    }
  });

  ipcMain.handle("move-window-right", async () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x + 50, y);
    }
  });

  // App control
  ipcMain.handle('quit-app', () => {
    app.quit();
  });

  ipcMain.handle('hide-window', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  ipcMain.handle('solution-start', () => {
    if (mainWindow) {
      if (screenshotStorage.length > 0) {
        mainWindow.webContents.send('solution-start');
      } else {
        mainWindow.webContents.send('processing-no-screenshots');
      }
    }
  });


}

// Global shortcuts matching the original design
function setupGlobalShortcuts() {
  // Toggle window visibility (Ctrl+B) - as shown in tooltip
  globalShortcut.register("CommandOrControl+B", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true); // Bring to front
      }
    }
  });

  // Take screenshot (Ctrl+H) - as shown in tooltip
  globalShortcut.register("CommandOrControl+H", async () => {
    if (mainWindow) {
      try {
        await mainWindow.webContents.executeJavaScript(
          "window.electronAPI.takeScreenshot()"
        );
      } catch (error) {
        // Silent error handling
      }
    }
  });

  // Solve problem (Ctrl+Enter) - as shown in tooltip
  globalShortcut.register("CommandOrControl+Return", () => {
    if (mainWindow) {
      if (screenshotStorage.length > 0) {
        mainWindow.webContents.send("solution-start");
      } else {
        mainWindow.webContents.send("processing-no-screenshots");
      }
    }
  });

  // Reset/Clear (Ctrl+R) - as shown in tooltip
  globalShortcut.register("CommandOrControl+R", () => {
    if (mainWindow) {
      try {
        // Delete all screenshot files
        screenshotStorage.forEach((screenshot) => {
          if (fs.existsSync(screenshot.path)) {
            fs.unlinkSync(screenshot.path);
          }
        });

        // Clear all screenshots from storage
        screenshotStorage = [];

        // Trigger reset functionality in renderer
        mainWindow.webContents.send("reset-view");
      } catch (error) {
        // Still clear storage even if file deletion fails
        screenshotStorage = [];
        mainWindow.webContents.send("reset-view");
      }
    }
  });

  // Move window with arrow keys (Ctrl+Arrow) - as shown in tooltip
  globalShortcut.register("CommandOrControl+Left", () => {
    if (mainWindow && mainWindow.isVisible()) {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(Math.max(0, x - 100), y);
    }
  });

  globalShortcut.register("CommandOrControl+Right", () => {
    if (mainWindow && mainWindow.isVisible()) {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x + 100, y);
    }
  });

  globalShortcut.register("CommandOrControl+Up", () => {
    if (mainWindow && mainWindow.isVisible()) {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x, Math.max(0, y - 100));
    }
  });

  globalShortcut.register("CommandOrControl+Down", () => {
    if (mainWindow && mainWindow.isVisible()) {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x, y + 100);
    }
  });

  // Exit application (Ctrl+Q) - as shown in tooltip
  globalShortcut.register("CommandOrControl+Q", () => {
    if (mainWindow) {
      mainWindow.close();
    }
    app.quit();
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  // Emergency hide shortcut (Ctrl+Shift+H) - instant hide in ghost mode
  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });
}

// Additional ghost mode app configuration - called after app is ready
function setupGhostApp() {
  // All early ghost mode setup is now done before app.whenReady()
  // This function is kept for any future post-ready ghost mode configuration
}

// App initialization with permanent ghost mode
app.whenReady().then(() => {
  setupGhostApp();
  createWindow();
  setupIpcHandlers();
  setupGlobalShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cleanup shortcuts on quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
