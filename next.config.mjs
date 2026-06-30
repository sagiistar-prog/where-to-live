/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ignored: [
          "**/.git/**",
          "**/.next/**",
          "**/node_modules/**",
          "I:/System Volume Information/**",
          "I:/$RECYCLE.BIN/**",
        ],
      };
    }

    return config;
  },
  async redirects() {
    return [
      {
        source: "/buy",
        destination: "/city?mode=buy",
        permanent: false,
      },
      {
        source: "/knowledge",
        destination: "/evidence",
        permanent: false,
      },
      {
        source: "/demo",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/report/demo",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/report",
        destination: "/report/latest",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
