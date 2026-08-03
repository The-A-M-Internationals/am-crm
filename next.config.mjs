/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
