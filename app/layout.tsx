import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { currentUser } from '@/lib/auth';
import '../assets/css/style.css';
import './stage.css';

export const metadata: Metadata = {
  title: 'BidYourSite — one project on the block at a time',
  description:
    'A home for abandoned side projects. One website, domain, newsletter or app goes up at a time, opens at $1, and the room decides what it is worth.',
  openGraph: {
    title: 'BidYourSite',
    description: 'One project on the block at a time. Opens at $1.',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%234f39f6'/><text x='50' y='72' font-size='64' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>B</text></svg>"
        />
      </head>
      <body>
        <header className="hdr">
          <div className="wrap hdr-in">
            <a className="logo" href="/">
              <span className="logo-mark">B</span>Bid<em>YourSite</em>
            </a>
            <nav className="nav">
              <a href="/">Stage</a>
              <a href="/rules">Rules</a>
              <a href="/about">About</a>
            </nav>
            <div className="hdr-r">
              {user ? (
                <>
                  <span className="who">@{user.handle}</span>
                  <form method="post" action="/api/auth">
                    <input type="hidden" name="action" value="logout" />
                    <button className="btn btn-g btn-sm" type="submit">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <a className="btn btn-g btn-sm" href="/login">
                  Sign in
                </a>
              )}
              <a className="btn btn-p btn-sm" href="/list">
                List my site
              </a>
            </div>
          </div>
        </header>

        {children}

        <footer>
          <div className="wrap">
            <div className="ft-b" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
              <span>© {new Date().getFullYear()} BidYourSite. One project at a time.</span>
              <span>
                <a href="/rules">Rules</a> · <a href="/about">About</a> ·{' '}
                <a href="mailto:hello@bidyoursite.com">hello@bidyoursite.com</a>
              </span>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
