import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#f4f4ed" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <noscript>
          <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
            <h1>Anshul Kumar — Full-Stack Developer</h1>
            <p>I build web apps, SaaS products, and interactive web experiences.</p>
            <p><a href="https://github.com/anshulr0019">Explore my projects on GitHub</a></p>
            <p><a href="mailto:anshulrajput338@gmail.com">Get in touch</a></p>
          </main>
        </noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
