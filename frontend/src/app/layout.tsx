//src/app/layout.tsx
import Header from '@/components/Header';
import { Providers } from "@/store/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflowX: "hidden" }}>
        <main style={{ paddingTop: "80px" }}>{/* Ajuste selon la hauteur du Header */}
          <Providers>
        <Header />
        {children}</Providers>
        </main>
      </body>
    </html>
  );
}
