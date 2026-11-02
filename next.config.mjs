/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained server that the pipeline can deploy as a folder.
  output: 'standalone',
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
