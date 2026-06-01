import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { SubmissionDetail } from "@/components/skills/submission-detail";

export const metadata = {
  title: "Submission - CherryIN",
  description: "Submission review status and timeline.",
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="bg-muted/30 text-foreground selection:bg-primary/30 relative min-h-screen w-full overflow-x-clip font-sans">
      <Header />
      <main className="relative z-10 flex w-full flex-col items-center">
        <Suspense fallback={null}>
          <SubmissionDetail submissionId={id} />
        </Suspense>
      </main>
    </div>
  );
}
