import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "CryptoShield — Real-Time Volatility Detection & ML Risk Forecast",
  description:
    "Cyber Financial Dashboard untuk pemantauan risiko pasar kripto real-time menggunakan K-Means Anomaly Detection dan Random Forest Prediction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} dark`}
    >
      <body className="min-h-screen bg-[#0B0F19] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
