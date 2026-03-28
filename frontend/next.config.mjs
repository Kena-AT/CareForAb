/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  turbopack: {
    // Use an absolute path so Next/Turbopack resolve env and workspace files correctly on Windows
    root: __dirname,
  },
};

export default nextConfig;
