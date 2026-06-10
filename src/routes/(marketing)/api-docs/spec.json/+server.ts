import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  return json(spec);
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "LightDrive API",
    version: "2.1.0",
    description:
      "RESTful API for LightDrive — a personal cloud storage solution. All file and folder operations go through `/api/drive/{driveId}/` endpoints.\n\nBase URL: `/api`\n\nAuthentication is session-based (cookie). Shared drives use a token-based URL, not a cookie.",
  },
  servers: [{ url: "/", description: "Local development" }],
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Create a new account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Jane Doe" },
                  email: { type: "string", format: "email", example: "jane@example.com" },
                  password: { type: "string", minLength: 8, example: "s3cret!123" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Account created. Session cookie set." },
          "400": { description: "Validation error (missing or invalid fields)" },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in to existing account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Authenticated. Session cookie set." },
          "401": { description: "Invalid email or password" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Sign out and destroy session",
        responses: { "200": { description: "Logged out. Session cookie cleared." } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the currently authenticated user",
        responses: {
          "200": { description: "Current user object", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "Not authenticated (user is null)" },
        },
      },
    },
    "/api/auth/profile": {
      patch: {
        tags: ["Auth"],
        summary: "Update profile name",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string", description: "New display name" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Profile updated" },
          "401": { description: "Not authenticated" },
        },
      },
    },
    "/api/auth/password": {
      patch: {
        tags: ["Auth"],
        summary: "Change password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 8, description: "New password (min 8 characters)" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password changed" },
          "401": { description: "Not authenticated or incorrect current password" },
        },
      },
    },
    "/api/shares": {
      post: {
        tags: ["Shares"],
        summary: "Create a share link for a file or folder",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [],
                properties: {
                  fileId: { type: "string", description: "File ID (mutually exclusive with folderId)" },
                  folderId: { type: "string", description: "Folder ID (mutually exclusive with fileId)" },
                  permissions: { type: "string", default: "read", description: "Comma-separated: read,upload,delete,edit" },
                  expiresInHours: { type: "integer", nullable: true, description: "Link expiration in hours (null = never expires)" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Share link created", content: { "application/json": { schema: { $ref: "#/components/schemas/Share" } } } },
          "404": { description: "File/Folder not found" },
        },
      },
      get: {
        tags: ["Shares"],
        summary: "List shares for a file, folder, or all shares",
        parameters: [
          { name: "fileId", in: "query", required: false, schema: { type: "string" }, description: "Filter by file ID" },
          { name: "folderId", in: "query", required: false, schema: { type: "string" }, description: "Filter by folder ID" },
          { name: "all", in: "query", required: false, schema: { type: "string", enum: ["true"] }, description: "Set to 'true' to list all shares for the current user" },
        ],
        responses: {
          "200": { description: "Share list", content: { "application/json": { schema: { type: "object", properties: { shares: { type: "array", items: { $ref: "#/components/schemas/Share" } } } } } } },
        },
      },
      patch: {
        tags: ["Shares"],
        summary: "Update share link permissions or expiration",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string", description: "Share ID to update" },
                  permissions: { type: "string", description: "Comma-separated: read,upload,delete,edit" },
                  expiresInHours: { type: "integer", nullable: true, description: "New expiration in hours, or null for never" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Share updated" } },
      },
      delete: {
        tags: ["Shares"],
        summary: "Revoke a share link",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["id"], properties: { id: { type: "string", description: "Share ID to revoke" } } },
            },
          },
        },
        responses: { "200": { description: "Share revoked" } },
      },
    },
    "/api/shares/{token}": {
      get: {
        tags: ["Shares"],
        summary: "Get share info, download shared file, or browse shared folder",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" }, description: "Share token from the share link URL" }],
        responses: {
          "200": { description: "For file shares: file binary (appropriate Content-Type). For folder shares: JSON redirect to drive view." },
          "404": { description: "Share not found" },
          "410": { description: "Share link has expired" },
        },
      },
    },
    "/api/drive/{driveId}/files": {
      get: {
        tags: ["Drive"],
        summary: "List files in a folder within a drive",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" }, description: "User ID for personal drive, or share token for shared drive" },
          { name: "folderId", in: "query", required: false, schema: { type: "string" }, description: "If omitted, returns root-level files (or shared folder root)" },
        ],
        responses: {
          "200": { description: "File list", content: { "application/json": { schema: { type: "object", properties: { files: { type: "array", items: { $ref: "#/components/schemas/File" } } } } } } },
          "404": { description: "Drive not found" },
        },
      },
      post: {
        tags: ["Drive"],
        summary: "Upload files to a drive (supports chunked and non-chunked uploads)",
        description: "For small files, send the file as `files` directly. For large files (>1MB), send chunks sequentially. On the first chunk (chunkIndex=0), the server returns a `storedName`. Send subsequent chunks with that `storedName` to append to the temporary `.part` file. On the final chunk, the server finalizes the file.\n\nFiles are uploaded sequentially — one file at a time, one chunk at a time.",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" }, description: "User ID for personal drive, or share token with upload permission" },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["files"],
                properties: {
                  files: { type: "array", items: { type: "string", format: "binary" }, description: "File chunk (or entire file for non-chunked uploads)" },
                  folderId: { type: "string", description: "Target folder ID (optional; defaults to root or shared folder root)" },
                  chunkIndex: { type: "string", description: "Chunk sequence number (0-based). Omit for non-chunked uploads." },
                  totalChunks: { type: "string", description: "Total number of chunks. Omit for non-chunked uploads." },
                  storedName: { type: "string", description: "Server-generated stored name from the first chunk response. Required for chunks 1+." },
                  originalName: { type: "string", description: "Original filename. Required for chunked uploads." },
                  fileType: { type: "string", description: "MIME type of the file. Required for chunked uploads." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Upload result",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/UploadComplete" },
                    { $ref: "#/components/schemas/ChunkProgress" },
                  ],
                },
              },
            },
          },
          "400": { description: "Missing required field (e.g., storedName for subsequent chunk)" },
          "403": { description: "Folder not in shared drive or insufficient permissions" },
          "404": { description: "Drive not found or upload not permitted" },
        },
      },
    },
    "/api/drive/{driveId}/files/document": {
      post: {
        tags: ["Drive"],
        summary: "Create a new blank document in a drive",
        parameters: [{ name: "driveId", in: "path", required: true, schema: { type: "string" }, description: "User ID or share token" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "name"],
                properties: {
                  type: { type: "string", enum: ["txt", "md", "csv"], description: "Document type" },
                  name: { type: "string", description: "Filename (without extension)" },
                  folderId: { type: "string", description: "Target folder ID (optional)" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Document created", content: { "application/json": { schema: { $ref: "#/components/schemas/File" } } } } },
      },
    },
    "/api/drive/{driveId}/files/{fileId}": {
      delete: {
        tags: ["Drive"],
        summary: "Delete a file from a drive",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "fileId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "File deleted" } },
      },
      patch: {
        tags: ["Drive"],
        summary: "Move a file within a drive (change parent folder)",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "fileId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { folderId: { type: "string", nullable: true, description: "New parent folder ID. null = move to root." } },
              },
            },
          },
        },
        responses: { "200": { description: "File moved" } },
      },
    },
    "/api/drive/{driveId}/files/{fileId}/content": {
      get: {
        tags: ["Drive"],
        summary: "Get file content for preview or editing",
        description: "Returns parsed content for txt, md, csv, docx, and xlsx files. Other types return `content: null`.",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "fileId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "File content by type",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: { type: "string", description: "Raw text content (txt, md, csv) or HTML (md, docx) or sheet data (xlsx)" },
                    category: { type: "string", enum: ["txt", "md", "csv", "docx", "xlsx"], description: "Detected document category" },
                    html: { type: "string", description: "Rendered HTML (markdown only)" },
                    rows: { type: "array", items: { type: "array" }, description: "Parsed CSV rows (csv only)" },
                    sheetNames: { type: "array", items: { type: "string" }, description: "Sheet names (xlsx only)" },
                    error: { type: "string", description: "Error message if parsing failed" },
                  },
                },
              },
            },
          },
          "403": { description: "File not in shared drive" },
          "404": { description: "Drive, file, or file content not found" },
        },
      },
      put: {
        tags: ["Drive"],
        summary: "Save file content (requires edit permission for shares)",
        description: "Supports txt, md, csv, and xlsx files. Content is written directly to the stored file on disk.",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "fileId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", description: "New file content (text for txt/md/csv, serialized data for xlsx)" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Content saved", content: { "application/json": { schema: { type: "object", properties: { saved: { type: "boolean" } } } } } },
          "400": { description: "File type not editable" },
          "403": { description: "Edit permission not granted for share" },
          "404": { description: "File not found" },
        },
      },
    },
    "/api/drive/{driveId}/files/{fileId}/download": {
      get: {
        tags: ["Drive"],
        summary: "Download a file from a drive (supports Range header for streaming)",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "fileId", in: "path", required: true, schema: { type: "string" } },
          { name: "inline", in: "query", required: false, schema: { type: "string", enum: ["1"] }, description: "Set to '1' to force Content-Disposition: inline (display in browser)" },
        ],
        responses: {
          "200": { description: "File binary stream" },
          "206": { description: "Partial content (Range request)" },
          "404": { description: "File not found" },
        },
      },
    },
    "/api/drive/{driveId}/files/{fileId}/stream": {
      get: {
        tags: ["Drive"],
        summary: "Stream video/audio content with Range support",
        description: "Similar to download but with optimized headers for video/audio streaming. Supports partial content responses.",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "fileId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Full content stream" },
          "206": { description: "Partial content stream (Range request)" },
          "404": { description: "File not found" },
        },
      },
    },
    "/api/drive/{driveId}/files/{fileId}/preview": {
      get: {
        tags: ["Drive"],
        summary: "Get file preview thumbnail (WebP)",
        description: "Returns a WebP-format preview image. Generated automatically on upload for images, videos, and document types.",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "fileId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "WebP preview image", content: { "image/webp": { schema: { type: "string", format: "binary" } } } },
          "404": { description: "Preview not found or not generated" },
        },
      },
    },
    "/api/drive/{driveId}/folders": {
      get: {
        tags: ["Drive"],
        summary: "List folders within a drive",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "parentId", in: "query", required: false, schema: { type: "string" }, description: "Filter by parent folder. Omit for root-level folders." },
          { name: "all", in: "query", required: false, schema: { type: "string", enum: ["true"] }, description: "Set to 'true' to return all folders (ignores parentId)" },
        ],
        responses: { "200": { description: "Folder list", content: { "application/json": { schema: { type: "object", properties: { folders: { type: "array", items: { $ref: "#/components/schemas/Folder" } } } } } } } },
      },
      post: {
        tags: ["Drive"],
        summary: "Create a folder in a drive (requires upload permission for shares)",
        parameters: [{ name: "driveId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", description: "Folder name" },
                  parentId: { type: "string", description: "Parent folder ID (optional; omitted or null = root)" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Folder created", content: { "application/json": { schema: { $ref: "#/components/schemas/Folder" } } } } },
      },
    },
    "/api/drive/{driveId}/folders/{folderId}": {
      delete: {
        tags: ["Drive"],
        summary: "Delete a folder and all its contents recursively",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" } },
          { name: "folderId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Folder deleted" } },
      },
    },
    "/api/drive/{driveId}/info": {
      get: {
        tags: ["Drive"],
        summary: "Get drive info — returns share metadata or indicates personal drive",
        parameters: [
          { name: "driveId", in: "path", required: true, schema: { type: "string" }, description: "User ID for personal drive, or share token for shared drive" },
          { name: "folder", in: "query", required: false, schema: { type: "string" }, description: "For folder shares: subfolder to resolve breadcrumbs for" },
        ],
        responses: {
          "200": {
            description: "Drive info",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: { type: { type: "string", enum: ["personal"] } },
                      description: "Personal drive",
                    },
                    {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["file"] },
                        permissions: { type: "string" },
                        file: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, size: { type: "integer" }, type: { type: "string" } } },
                        expiresAt: { type: "string", format: "date-time", nullable: true },
                      },
                      description: "File share",
                    },
                    {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["folder"] },
                        permissions: { type: "string" },
                        name: { type: "string" },
                        expiresAt: { type: "string", format: "date-time", nullable: true },
                        breadcrumbs: { type: "array", items: { type: "object", properties: { id: { type: "string", nullable: true }, name: { type: "string" } } } },
                      },
                      description: "Folder share",
                    },
                  ],
                },
              },
            },
          },
          "404": { description: "Drive or share not found" },
          "410": { description: "Share link has expired" },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
        },
      },
      Folder: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          userId: { type: "string" },
          parentId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      File: {
        type: "object",
        properties: {
          id: { type: "string" },
          storedName: { type: "string", description: "Obfuscated filename on disk (hex-encoded)" },
          originalName: { type: "string", description: "Original filename as uploaded" },
          size: { type: "integer", description: "File size in bytes" },
          type: { type: "string", description: "MIME type" },
          userId: { type: "string" },
          folderId: { type: "string", nullable: true, description: "Parent folder ID, or null for root" },
          hasPreview: { type: "boolean", description: "Whether a WebP preview thumbnail is available" },
          downloads: { type: "integer", description: "Download count" },
          uploadedAt: { type: "string", format: "date-time" },
        },
      },
      Share: {
        type: "object",
        properties: {
          id: { type: "string" },
          fileId: { type: "string", nullable: true },
          folderId: { type: "string", nullable: true },
          token: { type: "string", description: "Unique URL token for accessing the share" },
          permissions: { type: "string", description: "Comma-separated permissions (read,upload,delete,edit)" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          link: { type: "string", description: "Full share URL" },
        },
      },
      UploadComplete: {
        type: "object",
        properties: {
          uploaded: { type: "integer", description: "Number of files uploaded" },
          files: { type: "array", items: { $ref: "#/components/schemas/File" }, description: "Array of created file records" },
        },
        description: "Returned when a chunked upload completes (final chunk) or for non-chunked uploads",
      },
      ChunkProgress: {
        type: "object",
        properties: {
          chunk: { type: "integer", description: "Index of the chunk just processed" },
          totalChunks: { type: "integer", description: "Total number of chunks expected" },
          storedName: { type: "string", description: "Server-generated stored name — must be sent back with subsequent chunks" },
        },
        description: "Returned for intermediate chunks (not the first or last) during a chunked upload",
      },
    },
  },
};
