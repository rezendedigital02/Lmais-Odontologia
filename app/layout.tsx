import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Dashboard Clínica | L+ Odontologia",
  description: "Dashboard de gestão da clínica L+ Odontologia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-background">
        <Sidebar />
        <div className="md:ml-60 flex flex-col min-h-screen pb-16 md:pb-0">
          <Header />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
