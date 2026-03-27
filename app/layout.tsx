import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Database Management System",
  description: "Next.js migration of Email Database Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="App">
            <h1>✉ Email Database Management System</h1>
          </div>
          <div className='Linkcontainer'>
            <Link href="/">Upload</Link>
            <Link href="/getdata">Get Data</Link>
          </div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
