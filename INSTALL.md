# Global Installation Guide

## Quick Install

### From npm Registry (when published)
```bash
npm install -g claude-code-webui
```

### From Source (current method)

1. **Clone the repository:**
```bash
git clone https://github.com/sugyan/claude-code-webui.git
cd claude-code-webui
```

2. **Run the installation script:**
```bash
node install-global.js
```

Or manually:
```bash
# Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Build the application
cd frontend && npm run build && cd ..
cd backend && npm run build && cd ..

# Install globally
cd backend && npm link
```

## Usage

Once installed globally, you can run the application from anywhere:

```bash
# Start with default settings
claude-code-webui

# Start with custom port
claude-code-webui --port 9000

# Start with debug logging
claude-code-webui --debug

# Show help
claude-code-webui --help
```

## Configuration

### Environment Variables
Create a `.env` file in your working directory:
```bash
PORT=9000
```

### Prerequisites
- Node.js 20.0.0 or higher
- Claude CLI tool installed (`npm install -g @anthropic-ai/claude-code`)

## Uninstall

To remove the global installation:

```bash
npm unlink -g claude-code-webui
```

## Alternative Installation Methods

### Using npx (no installation required)
```bash
npx claude-code-webui
```

### Using Docker (coming soon)
```bash
docker run -p 3000:3000 sugyan/claude-code-webui
```

### Single Binary (from releases)
Download the appropriate binary for your platform from the [releases page](https://github.com/sugyan/claude-code-webui/releases):

- Linux x64: `claude-code-webui-linux-x64`
- Linux ARM64: `claude-code-webui-linux-arm64`
- macOS x64: `claude-code-webui-darwin-x64`
- macOS ARM64: `claude-code-webui-darwin-arm64`

Make it executable and run:
```bash
chmod +x claude-code-webui-*
./claude-code-webui-*
```

## Troubleshooting

### Permission Errors
If you encounter permission errors during global installation:

**macOS/Linux:**
```bash
sudo node install-global.js
```

**Windows:**
Run Command Prompt or PowerShell as Administrator

### Port Already in Use
If the default port (3000) is already in use:
```bash
claude-code-webui --port 8080
```

### Claude CLI Not Found
Ensure Claude CLI is installed:
```bash
npm install -g @anthropic-ai/claude-code
```

### Build Errors
Clear cache and reinstall:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf frontend/node_modules backend/node_modules

# Reinstall
node install-global.js
```

## Development vs Production

### Development Mode
For development, use the local scripts:
```bash
# Backend
cd backend && npm run dev

# Frontend (in another terminal)
cd frontend && npm run dev
```

### Production Mode
The global installation runs in production mode with:
- Optimized frontend build
- Bundled backend code
- Static file serving

## System Requirements

- **OS:** Windows, macOS, Linux
- **Node.js:** 20.0.0 or higher
- **Memory:** 512MB minimum
- **Disk Space:** 200MB for installation

## Support

For issues or questions:
- [GitHub Issues](https://github.com/sugyan/claude-code-webui/issues)
- [Documentation](https://github.com/sugyan/claude-code-webui#readme)