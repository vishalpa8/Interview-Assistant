# Interview Assistant

An intelligent desktop application that helps you excel in technical interviews and coding challenges using AI-powered analysis, screenshot capture, and voice recording capabilities.

## ✨ Features

- **📸 Smart Screenshot Analysis**: Capture and analyze problem statements from any screen
- **🎤 Voice Recording**: Record and transcribe audio for problem analysis
- **🤖 AI-Powered Solutions**: Generate intelligent solutions using Google's Gemini AI
- **🔄 Real-time Processing**: Instant analysis and solution generation
- **⌨️ Keyboard Shortcuts**: Quick access to all features
- **🎯 Transparent Overlay**: Unobtrusive interface that stays on top
- **🔧 Error Management**: Robust error handling with detailed logging

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v16 or higher)
- **Git**
- **Gemini API Key** - Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository:**
```bash
git clone [repository-url]
cd interview-assistant
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
   - Create a `.env` file in the root directory
   - Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Running the Application

#### Development Mode (Recommended)
```bash
npm run electron:dev
```
This will start both the Vite dev server and Electron application automatically.

#### Development with Auto-Reload
```bash
npm run dev:full
```
This includes TypeScript watching for automatic recompilation on changes.

#### Production Build
```bash
npm run app:build
```
The built application will be available in the `release` folder.

## 🎮 How to Use

### Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl + B** | Toggle Window | Show or hide the application window |
| **Ctrl + H** | Take Screenshot | Capture screen for problem analysis |
| **Ctrl + Enter** | Solve Problem | Generate AI solution for current problem |
| **Ctrl + R** | Reset/Clear | Clear all screenshots and reset state |
| **Ctrl + Arrow Keys** | Move Window | Reposition the application window |

### Voice Recording
- Click the **Listen** button to start/stop voice recording
- Audio is automatically transcribed and analyzed by AI
- Perfect for verbal problem descriptions

### Workflow
1. **Capture**: Take screenshots of coding problems or interview questions
2. **Listen**: Record voice descriptions for additional context
3. **Analyze**: AI automatically extracts problem information
4. **Solve**: Generate intelligent solutions and suggestions
5. **Debug**: Take additional screenshots for solution refinement

## 🛠️ Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server only |
| `npm run electron:dev` | Start both Vite and Electron (recommended) |
| `npm run electron:dev:watch` | Development with TypeScript auto-compilation |
| `npm run dev:full` | Alias for full development setup |
| `npm run build` | Build for production |
| `npm run app:build` | Build and package the application |
| `npm run clean` | Clean build directories |

### Project Structure
```
interview-assistant/
├── electron/           # Electron main process files
│   ├── main.ts        # Application entry point
│   ├── WindowHelper.ts # Window management
│   ├── LLMHelper.ts   # AI integration
│   └── ErrorLogger.ts # Error management
├── src/               # React frontend
│   ├── components/    # UI components
│   ├── _pages/       # Application pages
│   └── main.tsx      # React entry point
├── dist/             # Built frontend
├── dist-electron/    # Compiled Electron files
└── release/          # Packaged applications
```

## 🔧 Troubleshooting

### Common Issues

**Application won't start:**
- Ensure port 5173 is not in use by another application
- Check that your Gemini API key is correctly set in `.env`
- Try deleting `node_modules` and running `npm install` again

**Window not visible:**
- The application uses a transparent overlay - look for the interface elements
- Try pressing `Ctrl + B` to toggle window visibility
- Check if the window is positioned off-screen

**TypeScript compilation errors:**
- Run `npm run clean` to clear build cache
- Ensure all dependencies are installed: `npm install`
- Check that TypeScript is properly configured

**API errors:**
- Verify your Gemini API key is valid and has sufficient quota
- Check your internet connection
- Review error logs in the application's user data directory

### Error Logs
Application errors are logged to: `%USERDATA%/interview-assistant/logs/error.log`

### Performance Tips
- Close unnecessary applications to free up system resources
- Ensure stable internet connection for AI processing
- Use the development mode for testing and debugging

## 🤝 Contributing

This project welcomes contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Add proper error handling using the ErrorLogger utility
- Update documentation for new features
- Test thoroughly in both development and production modes

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent analysis capabilities
- **Electron** for cross-platform desktop application framework
- **React** for the user interface
- **Vite** for fast development and building

## 📞 Support

For custom integrations or enterprise solutions, reach out on [Twitter](https://x.com/vishalpa8).

---

**Note**: This application is designed for educational and interview preparation purposes. Please ensure compliance with your organization's policies and interview guidelines when using this tool.