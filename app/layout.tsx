import { Google_Sans_Code, Geist } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const googleSansCode = Google_Sans_Code({
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
                        googleSansCode.variable
                    , "font-sans", geist.variable)}
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
