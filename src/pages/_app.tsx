import type { AppProps } from "next/app";
import { AnimatePresence, motion } from "framer-motion";
import SmoothScrollProvider from "../components/SmoothScrollProvider";
import "lenis/dist/lenis.css";
import "../index.css";

export default function PortfolioApp({ Component, pageProps, router }: AppProps) {
  const routeKey = router.asPath.split("#")[0];

  return (
    <SmoothScrollProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={routeKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <Component {...pageProps} />
        </motion.div>
      </AnimatePresence>
    </SmoothScrollProvider>
  );
}
