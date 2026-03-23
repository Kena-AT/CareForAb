/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: '..', // The root of the monorepo is one level up from frontend
  },
};

export default nextConfig;
