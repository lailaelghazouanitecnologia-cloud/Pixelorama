import { serve, file } from "bun";
import { join } from "path";

const PORT = 3000;
const PUBLIC_DIR = join(import.meta.dir, "../public");

// In-memory storage for projects
interface PixelProject {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  palette: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  pixels: number[][]; // RGBA values per pixel
}

const projects: Map<string, PixelProject> = new Map();

// API Routes
async function handleAPI(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // Health check
  if (path === "/api/health") {
    return Response.json({ status: "ok", timestamp: new Date().toISOString() }, { headers });
  }

  // Projects CRUD
  if (path === "/api/projects" && method === "GET") {
    return Response.json(Array.from(projects.values()), { headers });
  }

  if (path === "/api/projects" && method === "POST") {
    const body = await req.json();
    const project: PixelProject = {
      id: crypto.randomUUID(),
      name: body.name || "Untitled",
      width: body.width || 32,
      height: body.height || 32,
      layers: [{
        id: crypto.randomUUID(),
        name: "Layer 1",
        visible: true,
        opacity: 1,
        pixels: Array(body.height || 32).fill(null).map(() =>
          Array((body.width || 32) * 4).fill(0)
        ),
      }],
      palette: body.palette || ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    projects.set(project.id, project);
    return Response.json(project, { headers, status: 201 });
  }

  if (path.startsWith("/api/projects/") && method === "GET") {
    const id = path.split("/")[3];
    const project = projects.get(id);
    if (!project) {
      return Response.json({ error: "Project not found" }, { headers, status: 404 });
    }
    return Response.json(project, { headers });
  }

  if (path.startsWith("/api/projects/") && method === "PUT") {
    const id = path.split("/")[3];
    const project = projects.get(id);
    if (!project) {
      return Response.json({ error: "Project not found" }, { headers, status: 404 });
    }
    const body = await req.json();
    const updated = { ...project, ...body, updatedAt: new Date() };
    projects.set(id, updated);
    return Response.json(updated, { headers });
  }

  if (path.startsWith("/api/projects/") && method === "DELETE") {
    const id = path.split("/")[3];
    if (!projects.has(id)) {
      return Response.json({ error: "Project not found" }, { headers, status: 404 });
    }
    projects.delete(id);
    return Response.json({ success: true }, { headers });
  }

  // Export endpoint
  if (path === "/api/export" && method === "POST") {
    const body = await req.json();
    // Here you would implement actual export logic
    return Response.json({
      success: true,
      message: "Export functionality placeholder",
      format: body.format || "png"
    }, { headers });
  }

  return Response.json({ error: "Not found" }, { headers, status: 404 });
}

// Static file serving
async function serveStatic(pathname: string): Promise<Response> {
  const filePath = join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  const bunFile = file(filePath);

  if (await bunFile.exists()) {
    return new Response(bunFile);
  }

  // Try index.html for SPA routing
  const indexFile = file(join(PUBLIC_DIR, "index.html"));
  if (await indexFile.exists()) {
    return new Response(indexFile);
  }

  return new Response("Not Found", { status: 404 });
}

// Main server
const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/api")) {
      return handleAPI(req);
    }

    return serveStatic(url.pathname);
  },
});

console.log(`🎨 Pixel Editor running at http://localhost:${server.port}`);
