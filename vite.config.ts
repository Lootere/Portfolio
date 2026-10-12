import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, Plugin} from 'vite';

function screenshotUploadPlugin(): Plugin {
  return {
    name: 'screenshot-upload-plugin',
    configureServer(server) {
      server.middlewares.use('/api/upload-screenshot', (req, res) => {
        if (req.method === 'POST') {
          const chunks: any[] = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', () => {
            try {
              const rawBody = Buffer.concat(chunks);
              let filename = 'fast_print_portal.png';
              let fileBuffer = rawBody;

              try {
                const json = JSON.parse(rawBody.toString('utf-8'));
                if (json.data && json.filename) {
                  filename = json.filename;
                  const base64Data = json.data.replace(/^data:image\/\w+;base64,/, '');
                  fileBuffer = Buffer.from(base64Data, 'base64');
                }
              } catch (_) {
                // Raw binary upload
              }

              const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
              const targetDir = path.resolve(__dirname, 'src/assets/screenshots');
              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
              }
              const savePath = path.join(targetDir, safeName);
              fs.writeFileSync(savePath, fileBuffer);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                filename: safeName,
                url: `/src/assets/screenshots/${safeName}`
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), screenshotUploadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
