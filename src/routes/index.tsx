import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import NossaCasamento from "@/components/NossaCasamento";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nosso Casamento — o workspace do casal" },
      { name: "description", content: "Planejamento do casamento, lua de mel, orçamento e tarefas do casal em um só lugar." },
      { property: "og:title", content: "Nosso Casamento — o workspace do casal" },
      { property: "og:description", content: "Planejamento do casamento, lua de mel, orçamento e tarefas do casal em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <ClientOnly fallback={<div className="loading-screen"><p>abrindo o workspace de vocês…</p></div>}>
        <NossaCasamento />
      </ClientOnly>
      <Toaster />
    </>
  );
}
