/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/courses.html", destination: "/courses", permanent: true },
      { source: "/consulting.html", destination: "/consulting", permanent: true },
      { source: "/nfc-cards.html", destination: "/nfc-cards", permanent: true },
      { source: "/documents.html", destination: "/documents", permanent: true }
    ];
  }
};

export default nextConfig;
