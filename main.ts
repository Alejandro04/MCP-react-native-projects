import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// ============ CONFIGURACIÓN DE SEGURIDAD ============
// Normaliza la ruta para Windows
const ALLOWED_BASE_PATH = path.resolve("");

console.error(`[DEBUG] ALLOWED_BASE_PATH: ${ALLOWED_BASE_PATH}`);

// Función para validar que la ruta está dentro del directorio permitido
function validatePath(filePath: string): { valid: boolean; error?: string; fullPath?: string } {
  try {
    // Normaliza ambas rutas para comparación consistente
    const fullPath = path.resolve(path.join(ALLOWED_BASE_PATH, filePath));
    const allowedResolved = path.resolve(ALLOWED_BASE_PATH);
    
    console.error(`[DEBUG] Validando: filePath="${filePath}"`);
    console.error(`[DEBUG] fullPath="${fullPath}"`);
    console.error(`[DEBUG] allowedResolved="${allowedResolved}"`);
    
    // Verificar que la ruta resuelta está dentro del directorio permitido
    if (!fullPath.startsWith(allowedResolved)) {
      return {
        valid: false,
        error: `Acceso denegado. Solo se permite manipular archivos dentro de: ${ALLOWED_BASE_PATH}`
      };
    }

    return { valid: true, fullPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[validatePath] error:', message);

    return {
      valid: false,
      error: `Ruta inválida: ${message}`,
    }
  }
}

// Crear una instancia del servidor
const server = new McpServer({
  name: "demoapp",
  version: "1.0.0",
});

// ============ TOOL 1: Schedule Notification ============
const notificationSchema = z.object({
  title: z.string().describe("Título de la notificación"),
  body: z.string().describe("Cuerpo del mensaje de la notificación"),
  triggerTime: z.string().describe("Tiempo en el que se disparará la notificación (formato ISO 8601, ej: '2024-01-20T10:00:00Z')"),
  repeatInterval: z.enum(["none", "daily", "weekly", "monthly"]).optional().default("none").describe("Intervalo de repetición de la notificación"),
  data: z.record(z.string(), z.any()).optional().describe("Datos adicionales para pasar con la notificación")
});

server.registerTool(
  "schedule_notification",
  {
    description: "Programa una notificación local para la aplicación React Native. Útil para recordatorios, alertas y mensajes programados.",
    inputSchema: notificationSchema
  },
  async ({ title, body, triggerTime, repeatInterval = "none", data = {} }) => {
    try {
      const triggerDate = new Date(triggerTime);
      if (Number.isNaN(triggerDate.getTime())) {
        throw new TypeError("Formato de fecha inválido");
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
              message: `Notificación "${title}" programada para ${triggerDate.toLocaleString()}`
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

// ============ TOOL 2: Read File ============
const readFileSchema = z.object({
  filePath: z.string().describe("Ruta del archivo a leer (relativa a tu proyecto Expo)")
});

server.registerTool(
  "read_file",
  {
    description: "Lee el contenido de un archivo en tu proyecto Expo",
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
                error: validation.error ?? "Ruta inválida"
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
  filePath: z.string().describe("Ruta del archivo a escribir (relativa a tu proyecto Expo)"),
  content: z.string().describe("Contenido a escribir en el archivo"),
  createDirectories: z.boolean().optional().default(true).describe("Crear directorios si no existen")
});

server.registerTool(
  "write_file",
  {
    description: "Escribe o modifica un archivo en tu proyecto Expo. Si el archivo no existe, lo crea.",
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
              message: `Archivo creado/actualizado correctamente`,
              size: content.length
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

// ============ TOOL 4: List Files ============
const listFilesSchema = z.object({
  dirPath: z.string().optional().default(".").describe("Ruta del directorio a listar (relativa a tu proyecto Expo)"),
  recursive: z.boolean().optional().default(false).describe("Listar directorios recursivamente")
});

server.registerTool(
  "list_files",
  {
    description: "Lista archivos en un directorio del proyecto Expo",
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
  command: z.string().describe("Comando a ejecutar en la terminal (ej: npm install, npx expo update, etc.)"),
  cwd: z.string().optional().describe("Directorio donde ejecutar el comando (relativo a tu proyecto Expo)")
});

server.registerTool(
  "execute_command",
  {
    description: "Ejecuta un comando en la terminal dentro de tu proyecto Expo. Útil para instalar paquetes o actualizar código.",
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

// ============ TOOL 6: Get App Config ============
server.registerTool(
  "get_app_config",
  {
    description: "Obtiene la configuración actual del proyecto Expo (app.json)",
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

// Establecer el transporte y conectar el servidor
const transport = new StdioServerTransport();
await server.connect(transport);

console.error(`MCP Server 'demoapp' iniciado y escuchando en stdio`);
console.error(`✅ Directorio permitido: ${ALLOWED_BASE_PATH}`);