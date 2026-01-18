# 📱 MCP Server for Expo Project

MCP Server (Model Context Protocol) that allows Claude Desktop to manipulate files and execute commands in your React Native project with Expo.

---

## 🚀 Prerequisites

- **Node.js** 16+ installed
- **npm** or **yarn**
- **Claude Desktop** installed
- Your Expo project at: `C:\Users\{user}\Documents\ReactNative\mi-primera-app`

---

## 📦 Installation

### 1. Install global dependencies

```bash
npm install -g tsx
npm install -D @types/node
```

**`tsx`**: Allows running TypeScript files directly  
**`@types/node`**: TypeScript types for Node.js

### 2. Download the MCP file

Place the `mcp-server.ts` file at:

```
C:\Users\{user}\Documents\ReactNative\mcp-server.ts
```

### 3. Configure Claude Desktop

Create or edit the configuration file at:

**Windows:**
```
C:\Users\{user}\AppData\Roaming\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

**File content:**

```json
{
  "mcpServers": {
    "demoapp": {
      "command": "npx",
      "args": [
        "tsx",
        "C:\\Users\\{user}\\Documents\\ReactNative\\mcp-server.ts"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

⚠️ **Note for Windows:** Use `\\` instead of `/` in paths.

### 4. Restart Claude Desktop

Close Claude Desktop completely and reopen it.

---

## ✅ Verify it works

In Claude Desktop, you should see in Settings → Connectors that `demoapp` is enabled.

---

## 🛠️ Available Tools

### 1. **list_files** - List files

```
Claude, list the files in the "." directory
```

**Parameters:**
- `dirPath` (optional): Directory path. Default: "."
- `recursive` (optional): List recursively. Default: false

**Example:**
```
Claude, list_files with dirPath: "app" recursive: true
```

---

### 2. **read_file** - Read files

```
Claude, read the content of "app/_layout.tsx"
```

**Parameters:**
- `filePath`: Path of the file to read

**Example:**
```
Claude, read_file of "package.json"
```

---

### 3. **write_file** - Create/Modify files

```
Claude, create a new file "app/screens/HomeScreen.tsx" with a basic React Native component
```

**Parameters:**
- `filePath`: Path where to create/modify
- `content`: File content
- `createDirectories` (optional): Create folders if they don't exist. Default: true

**Example:**
```
Claude, write in "app/utils/helpers.ts" a function that adds two numbers
```

---

### 4. **execute_command** - Execute commands

```
Claude, execute "npm install react-navigation"
```

**Parameters:**
- `command`: Command to execute
- `cwd` (optional): Directory where to execute

**Examples:**
```
Claude, execute "npx expo doctor"
Claude, execute "npm install" in the "." directory
```

---

### 5. **get_app_config** - Read app.json

```
Claude, show me the app.json configuration
```

No parameters.

---

### 6. **schedule_notification** - Schedule notifications

```
Claude, schedule a notification that says "Hello Leonor" in 5 minutes
```

**Parameters:**
- `title`: Notification title
- `body`: Message body
- `triggerTime`: ISO 8601 format (e.g., "2026-01-18T15:30:00Z")
- `repeatInterval` (optional): "none", "daily", "weekly", "monthly"
- `data` (optional): Additional data

**Example:**
```
Claude, schedule a notification with:
- title: "Reminder"
- body: "Check your students"
- triggerTime: "2026-01-18T09:00:00Z"
- repeatInterval: "daily"
```

---

## 💡 Usage Examples

### Change a color in your app

```
Claude, read app/_layout.tsx and change all blue colors (#4a90e2) to red (#FF0000)
```

### Create a new component

```
Claude, create a new file "app/screens/DetailsScreen.tsx" with a component that shows student details
```

### Install a package

```
Claude, install @react-navigation/native using npm
```

### View project structure

```
Claude, list_files with dirPath: "." recursive: true to see the complete structure
```

### Get Expo configuration

```
Claude, get_app_config to see the current configuration
```

---

## 🔒 Security

The MCP is configured to **only access**:

```
C:\Users\{user}\Documents\ReactNative\mi-primera-app
```

**Cannot:**
- Access folders outside this path
- Execute dangerous commands (this is the user's responsibility)
- Modify files outside the project

---

## 🐛 Troubleshooting

### MCP doesn't appear in Claude Desktop

**Solution:**
1. Verify that the `claude_desktop_config.json` file is in the correct location
2. Completely restart Claude Desktop
3. Check that the path to `mcp-server.ts` is correct

### Error: "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:**
```bash
npm install @modelcontextprotocol/sdk zod
```

### Error: "Access denied. Only allowed to..."

**Solution:**
Make sure you use relative paths to your project. For example:
- ✅ Correct: `"app/_layout.tsx"`
- ❌ Incorrect: `"C:\Users\{user}\Documents\ReactNative\mi-primera-app\app\_layout.tsx"`

### Changes are not visible in Expo

**Solution:**
Expo automatically detects changes. If it doesn't work:
1. Save the file in your editor
2. Wait 2-3 seconds
3. The app should reload automatically

---

## 📝 Complete configuration file

```json
{
  "mcpServers": {
    "demoapp": {
      "command": "npx",
      "args": [
        "tsx",
        "C:\\Users\\{user}\\Documents\\ReactNative\\mcp-server.ts"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

---

## 🎯 Recommended workflow

1. **Open Claude Desktop**
2. **Request changes to your app:**
   ```
   Claude, read app/_layout.tsx and then change the color of the "Edit" button to green
   ```
3. **The MCP will:**
   - Read the file
   - Understand the context
   - Make the changes
   - Write the updated file
4. **Expo detects the changes and reloads automatically**

---

## 📚 More information

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Claude Desktop Documentation](https://claude.ai/download)
- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)

---

## 🚨 Important notes

- The MCP only works with **Claude Desktop**, not with claude.ai web
- Changes to files are applied immediately
- Always verify changes before committing to git
- Use `git diff` to review changes before pushing

---

**Ready!** Now you can use Claude to manipulate your Expo project intelligently. 🎉