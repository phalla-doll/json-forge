/** @type {import('next').NextConfig} */
const securityHeaders = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig = {
    experimental: {
        optimizePackageImports: [
            "@hugeicons/react",
            "@hugeicons/core-free-icons",
            "radix-ui",
        ],
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
}

export default nextConfig
