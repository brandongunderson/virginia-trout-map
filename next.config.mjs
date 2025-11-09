/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules in client side
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false, 
      path: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
    };
    
    // More explicit alias configuration for @ imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './',
    };
    
    // Additional resolve configuration
    config.resolve.modules = [
      'node_modules',
      ...(config.resolve.modules || []),
    ];
    
    // Ensure TypeScript and other extensions are properly resolved
    config.resolve.extensions = [
      '.js', 
      '.jsx', 
      '.ts', 
      '.tsx',
      '.mjs',
      ...(config.resolve.extensions || [])
    ];
    
    return config;
  },
  // Ensure proper environment setup
  experimental: {
    esmExternals: 'loose'
  },
  // Clean output for Vercel
  swcMinify: true,
  compress: true,
};

export default nextConfig;
