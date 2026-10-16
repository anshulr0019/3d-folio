import Head from "next/head";
import Portfolio from "../App";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Anshul Kumar — Creative Developer</title>
        <meta
          name="description"
          content="Anshul Kumar's creative developer portfolio, featuring selected web products and an interactive Three.js world."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Portfolio />
    </>
  );
}
