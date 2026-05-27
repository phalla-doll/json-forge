import { Google_Sans_Code, Geist } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Metadata } from "next";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const googleSansCode = Google_Sans_Code({
    subsets: ["latin"],
    variable: "--font-mono",
});

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://json.manthaa.dev";
const siteName = "JSON Forge";
const title = "JSON Forge — JSON editor & visualizer";
const description =
    "Modern JSON editor and visualizer with formatting, validation, interactive graph and table views, diff, and AI-assisted generation and repair.";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: title,
        template: "%s — JSON Forge",
    },
    description,
    applicationName: siteName,
    keywords: [
        "JSON editor",
        "JSON visualizer",
        "JSON formatter",
        "JSON validator",
        "JSON diff",
        "JSON to table",
        "JSON graph",
        "AI JSON generator",
        "JSON repair",
        "developer tools",
    ],
    authors: [{ name: "Manthaa" }],
    creator: "Manthaa",
    publisher: "Manthaa",
    category: "developer tools",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        url: siteUrl,
        siteName,
        title,
        description,
        locale: "en_US",
        images: [
            {
                url: "/og-image-main.png",
                width: 1920,
                height: 1080,
                alt: "JSON Forge — Modern JSON editor and visualizer",
                type: "image/png",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og-image-main.png"],
    },
    icons: {
        icon: "/icon.svg",
        shortcut: "/icon.svg",
        apple: "/apple-icon",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(
                "antialiased",
                googleSansCode.variable,
                "font-sans",
                geist.variable,
            )}
        >
            <body className="h-dvh overflow-hidden">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <TooltipProvider>{children}</TooltipProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
