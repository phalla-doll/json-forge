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

export const metadata: Metadata = {
    title: "JSON Forge — JSON editor & visualizer",
    description:
        "JSON editor and visualizer with formatting, validation, interactive graph and table views, and AI-assisted generation and repair.",
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
