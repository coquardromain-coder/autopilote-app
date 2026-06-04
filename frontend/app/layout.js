import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'AutoPilote — Votre équipe d\'agents IA pour TPE/PME',
  description:
    'AutoPilote pilote 17 agents IA spécialisés (CRM, prospection, support, compta, devis…) ' +
    'orchestrés par Pilot pour automatiser votre TPE/PME.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {/* Le contexte d'authentification enveloppe toute l'application */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
