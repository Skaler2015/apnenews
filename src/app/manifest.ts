import type { MetadataRoute } from 'next';

// PWA manifest (spec §71). Installable shell.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ApneNews — हिंदी समाचार',
    short_name: 'ApneNews',
    description: 'हिंदी में तेज़, विश्वसनीय खबरें',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e1013',
    theme_color: '#c8102e',
    lang: 'hi',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
