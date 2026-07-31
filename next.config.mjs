/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  serverComponentsExternalPackages: ["firebase-admin"],
};

export default nextConfig;
