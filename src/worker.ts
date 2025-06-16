import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

interface Env {
  DB: D1Database;
  __STATIC_CONTENT: KVNamespace;
  R2: R2Bucket;
  AUTH_SECRET: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Handle API routes
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env, ctx);
      }

      // Try to serve the asset from KV
      try {
        return await getAssetFromKV(
          { request, waitUntil: ctx.waitUntil.bind(ctx) },
          { 
            ASSET_MANIFEST: assetManifest,
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            cacheControl: {
              browserTTL: 60 * 60 * 24, // 1 day
              edgeTTL: 60 * 60 * 24 * 365, // 1 year
              bypassCache: false
            }
          }
        );
      } catch (e) {
        // If the asset is not found, serve index.html for SPA routing
        return await getAssetFromKV(
          { 
            request: new Request(new URL('/index.html', request.url)),
            waitUntil: ctx.waitUntil.bind(ctx)
          },
          { 
            ASSET_MANIFEST: assetManifest,
            ASSET_NAMESPACE: env.__STATIC_CONTENT
          }
        );
      }
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  }
};

async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  
  // Video endpoints
  if (url.pathname.startsWith('/api/video/')) {
    const key = url.pathname.replace('/api/video/', '');
    console.log('Attempting to fetch video:', key);

    try {
      const object = await env.R2.get(key);
      
      if (object === null) {
        console.error('Video not found:', key);
        return new Response('Video not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Content-Type', 'video/mp4');
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'public, max-age=31536000');

      // Handle range requests for video streaming
      const range = request.headers.get('range');
      if (range) {
        const [start, end] = range.replace('bytes=', '').split('-');
        const startByte = parseInt(start, 10);
        const endByte = end ? parseInt(end, 10) : object.size - 1;
        const chunkSize = endByte - startByte + 1;

        headers.set('Content-Range', `bytes ${startByte}-${endByte}/${object.size}`);
        headers.set('Content-Length', chunkSize.toString());

        // Create a TransformStream to handle the video data
        const { readable, writable } = new TransformStream();
        
        // Start streaming the video data
        object.body.pipeTo(writable).catch(error => {
          console.error('Error piping stream:', error);
        });

        return new Response(readable, {
          status: 206,
          headers,
        });
      }

      // For non-range requests, stream the entire video
      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      console.error('Error fetching video:', error);
      return new Response('Error fetching video', { status: 500 });
    }
  }

  // Media endpoints (images)
  if (url.pathname.startsWith('/api/media/')) {
    // Only allow GET and POST
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { 'Allow': 'GET, POST' },
      });
    }

    // Handle POST: Upload via multipart/form-data
    if (request.method === 'POST') {
      const auth = request.headers.get('Authorization');
      const expectedAuth = `Bearer ${env.AUTH_SECRET}`;
      
      if (!auth || auth !== expectedAuth) {
        return new Response('Unauthorized', { status: 401 });
      }

      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return new Response('Expected multipart/form-data', { status: 400 });
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const customName = formData.get('filename')?.toString();
        
        if (!file) {
          return new Response('File not found in form data', { status: 400 });
        }

        const uploadKey = customName || file.name;
        const fileType = file.type || 'application/octet-stream';
        
        await env.R2.put(uploadKey, file.stream(), {
          httpMetadata: { contentType: fileType },
        });

        return new Response(`Uploaded "${uploadKey}" to R2`, { status: 200 });
      } catch (err) {
        return new Response(`Upload failed: ${(err as Error).message}`, {
          status: 500,
        });
      }
    }

    // Handle GET: Retrieve object
    const key = url.pathname.replace('/api/media/', '');
    console.log('Attempting to fetch media:', key);

    try {
      const object = await env.R2.get(key);
      
      if (object === null) {
        console.error('Media not found:', key);
        return new Response('Media not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      
      // Set appropriate content type based on file extension
      const extension = key.split('.').pop()?.toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) {
        headers.set('Content-Type', `image/${extension}`);
        headers.set('Cache-Control', 'public, max-age=31536000');
      }

      // For non-range requests or images, return the full content
      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      console.error('Error fetching media:', error);
      return new Response('Error fetching media', { status: 500 });
    }
  }

  // User endpoints
  if (url.pathname === '/api/users' && request.method === 'POST') {
    const body = await request.json() as { email: string; name: string; password: string };
    
    const result = await env.DB.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).bind(body.email, body.name, body.password).run();
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.pathname === '/api/users' && request.method === 'GET') {
    const users = await env.DB.prepare('SELECT id, email, name, created_at FROM users').all();
    return new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Todo endpoints
  if (url.pathname === '/api/todos') {
    if (request.method === 'GET') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response('User ID is required', { status: 400 });
      }

      const todos = await env.DB.prepare(
        'SELECT * FROM todos WHERE user_id = ?'
      ).bind(userId).all();
      
      return new Response(JSON.stringify(todos), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (request.method === 'POST') {
      const body = await request.json() as { title: string; userId: number };
      const result = await env.DB.prepare(
        'INSERT INTO todos (title, completed, user_id) VALUES (?, ?, ?)'
      ).bind(body.title, false, body.userId).run();
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Not Found', { status: 404 });
}
