/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cấu hình bổ sung nếu cần
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
