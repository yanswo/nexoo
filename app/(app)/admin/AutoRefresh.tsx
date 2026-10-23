"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Atualiza a lista sozinha, para você ver posts novos durante a apresentação.
export default function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
