import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// ============ SECURITY CONTEXT ============
// Normalized base path for allowed file operations
const ALLOWED_BASE_PATH = ""

console.error(`[DEBUG] ALLOWED_BASE_PATH: ${ALLOWED_BASE_PATH}`);

// Function to validate that a given path is within the allowed base path
function validatePath(filePath: string): { valid: boolean; error?: string; fullPath?: string } {
  try {
    // Normalize both paths for consistent comparison
    const fullPath = path.resolve(path.join(ALLOWED_BASE_PATH, filePath));
    const allowedResolved = path.resolve(ALLOWED_BASE_PATH);
    
    console.error(`[DEBUG] Validating path: filePath="${filePath}"`);
    console.error(`[DEBUG] fullPath="${fullPath}"`);
    console.error(`[DEBUG] allowedResolved="${allowedResolved}"`);
    
    // Verified that the fullPath starts with the allowed base path
    if (!fullPath.startsWith(allowedResolved)) {
      return {
        valid: false,
        error: `Denny access: ${ALLOWED_BASE_PATH}`
      };
    }

    return { valid: true, fullPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[validatePath] error:', message);

    return {
      valid: false,
      error: `Invalid path: ${message}`,
    }
  }
}

// Create a server instance
const server = new McpServer({
  name: "demoapp",
  version: "1.0.0",
});

// ============ TOOL 1: Schedule Notification ============
const notificationSchema = z.object({
  title: z.string().describe("Notification title"),
  body: z.string().describe("Notification body"),
  triggerTime: z.string().describe("Time when the notification will be triggered (ISO 8601 format, e.g., '2024-01-20T10:00:00Z')"),
  repeatInterval: z.enum(["none", "daily", "weekly", "monthly"]).optional().default("none").describe("Notification repeat interval"),
  data: z.record(z.string(), z.any()).optional().describe("Additional data to pass with the notification")
});

server.registerTool(
  "schedule_notification",
  {
    description: "Schedule a local notification for the React Native app. Useful for reminders, alerts, and scheduled messages.",
    inputSchema: notificationSchema
  },
  async ({ title, body, triggerTime, repeatInterval = "none", data = {} }) => {
    try {
      const triggerDate = new Date(triggerTime);
      if (Number.isNaN(triggerDate.getTime())) {
        throw new TypeError("Invalid date format");
      }

      const notification = {
        id: `notif_${Date.now()}`,
        title,
        body,
        triggerTime: triggerDate.toISOString(),
        repeatInterval,
        data,
        createdAt: new Date().toISOString(),
        status: "scheduled"
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              notification,
              message: `Notification "${title}" scheduled for ${triggerDate.toLocaleString()}`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============ TOOL 2: Read File ============
const readFileSchema = z.object({
  filePath: z.string().describe("Path to the file to read (relative to your Expo project)")
});

server.registerTool(
  "read_file",
  {
    description: "Read the contents of a file in your Expo project",
    inputSchema: readFileSchema
  },
  async ({ filePath }) => {
    try {
      const validation = validatePath(filePath);
      if (!validation.valid || !validation.fullPath) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: validation.error ?? "Invalid path"
              }, null, 2)
            }
          ],
          isError: true
        };
      }

      const fullPath = validation.fullPath;
      const content = await fs.readFile(fullPath, "utf-8");
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              filePath,
              content
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============ TOOL 3: Write File ============
const writeFileSchema = z.object({
  filePath: z.string().describe("Path to the file to write (relative to your Expo project)"),
  content: z.string().describe("Content to write to the file"),
  createDirectories: z.boolean().optional().default(true).describe("Create directories if they do not exist")
});

server.registerTool(
  "write_file",
  {
    description: "Write or modify a file in your Expo project. If the file does not exist, it will be created.",
    inputSchema: writeFileSchema
  },
  async ({ filePath, content, createDirectories = true }) => {
    try {
      const validation = validatePath(filePath);
      if (!validation.valid || !validation.fullPath) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: validation.error ?? "Ruta inválida"
              }, null, 2)
            }
          ],
          isError: true
        };
      }

      const fullPath = validation.fullPath;
      const dir = path.dirname(fullPath);

      if (createDirectories) {
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(fullPath, content, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              filePath,
              message: `File created/updated successfully. Size: ${content.length} bytes`,
              size: content.length
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============ TOOL 4: List Files ============
const listFilesSchema = z.object({
  dirPath: z.string().optional().default(".").describe("Path to the directory to list (relative to your Expo project)"),
  recursive: z.boolean().optional().default(false).describe("List directories recursively")
});

server.registerTool(
  "list_files",
  {
    description: "List files in a directory of the Expo project. Can list recursively if needed.",
    inputSchema: listFilesSchema
  },
  async ({ dirPath = ".", recursive = false }) => {
    try {
      const validation = validatePath(dirPath);
      if (!validation.valid || !validation.fullPath) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: validation.error ?? "Ruta inválida"
              }, null, 2)
            }
          ],
          isError: true
        };
      }

      const fullPath = validation.fullPath;

      type FileOrDirectory =
        | { type: "directory"; path: string; name: string }
        | { type: "file"; path: string; name: string; size: number };

      async function listDir(dir: string): Promise<FileOrDirectory[]> {
        const files = await fs.readdir(dir);
        const results: FileOrDirectory[] = [];

        for (const file of files) {
          if (file.startsWith(".")) continue;
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          const relativePath = path.relative(ALLOWED_BASE_PATH, filePath);

          if (stat.isDirectory()) {
            results.push({
              type: "directory",
              path: relativePath,
              name: file
            });
            if (recursive) {
              const nested = await listDir(filePath);
              results.push(...nested);
            }
          } else {
            results.push({
              type: "file",
              path: relativePath,
              name: file,
              size: stat.size
            });
          }
        }
        return results;
      }

      const files = await listDir(fullPath);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              dirPath,
              files,
              count: files.length
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============ TOOL 5: Execute Command ============
const executeCommandSchema = z.object({
  command: z.string().describe("Command to execute in the terminal (e.g., npm install, npx expo update, etc.)"),
  cwd: z.string().optional().describe("Directory to execute the command in (relative to your Expo project)")
});

server.registerTool(
  "execute_command",
  {
    description: "Execute a command in the terminal within your Expo project. Useful for installing packages or updating code.",
    inputSchema: executeCommandSchema
  },
  async ({ command, cwd }) => {
    try {
      let workingDir = ALLOWED_BASE_PATH;
      
      if (cwd) {
        const validation = validatePath(cwd);
        if (!validation.valid || !validation.fullPath) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: validation.error ?? "Ruta inválida"
                }, null, 2)
              }
            ],
            isError: true
          };
        }
        workingDir = validation.fullPath;
      }

      const { exec } = await import("node:child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync(command, { cwd: workingDir, maxBuffer: 10 * 1024 * 1024 });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              command,
              cwd: workingDir,
              stdout,
              stderr: stderr || null
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============ TOOL 6: Get App Config ============
server.registerTool(
  "get_app_config",
  {
    description: "Get the current configuration of the Expo project (app.json)",
    inputSchema: z.object({})
  },
  async () => {
    try {
      const appJsonPath = path.join(ALLOWED_BASE_PATH, "app.json");
      const content = await fs.readFile(appJsonPath, "utf-8");
      const config = JSON.parse(content);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              config
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// Set up the transport and connect the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error(`MCP Server 'demoapp' started and listening on stdio`);
console.error(`✅ Allowed directory path: ${ALLOWED_BASE_PATH}`);