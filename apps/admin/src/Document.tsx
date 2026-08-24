import type { ParentProps } from 'solid-js';
import { HydrationScript } from '@solidjs/web';

const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

const FAVICON_MARK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><ellipse cx="50" cy="50" rx="40" ry="17" stroke="#16233f" stroke-width="6"/><ellipse cx="50" cy="50" rx="40" ry="17" stroke="#dd8b2e" stroke-width="6" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="40" ry="17" stroke="#2f9fb8" stroke-width="6" transform="rotate(120 50 50)"/><circle cx="50" cy="50" r="10" fill="#16233f"/></svg>';

const FAVICON = `data:image/svg+xml,${encodeURIComponent(FAVICON_MARK)}`;

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('qrnlab-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" href={FAVICON} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href={FONT_STYLESHEET} rel="stylesheet" />
        <title>QRNLab — Dashboard</title>
        <script>{THEME_SCRIPT}</script>
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
