/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Force firebase-admin to be treated as an external package
      config.externals.push("firebase-admin");
    }
    return config;
  },
};

export default nextConfig;
