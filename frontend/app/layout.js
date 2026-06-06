import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';

// Typographie : Inter (titres + corps), JetBrains Mono (données)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'AutoPilote — Votre équipe d\'agents IA pour TPE/PME',
  description:
    'AutoPilote pilote 17 agents IA spécialisés (CRM, prospection, support, compta, devis…) ' +
    'orchestrés par le Directeur pour automatiser votre TPE/PME.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        {/* Le contexte d'authentification enveloppe toute l'application */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
