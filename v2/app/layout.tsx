import { Inter, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
})

export const metadata = {
    title: "JSON Forge - Professional JSON Editor & Visualizer",
    description:
        "A professional-grade JSON formatter, validator, and minifier with interactive graph visualization.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(
                "antialiased",
                inter.variable,
                jetbrainsMono.variable
            )}
        >
            <body className="h-dvh overflow-hidden">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <TooltipProvider>
                        {children}
                    </TooltipProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    )
}
