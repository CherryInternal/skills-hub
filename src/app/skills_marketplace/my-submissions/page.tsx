import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { MySubmissions } from "@/components/skills/my-submissions";

export const metadata = {
  title: "My Submissions - CherryIN",
  description: "Track the review status of your submitted skills.",
};

export default function MySubmissionsPage() {
  return (
    <div className="bg-muted/30 text-foreground selection:bg-primary/30 relative min-h-screen w-full overflow-x-clip font-sans">
      <Header />
      <main className="relative z-10 flex w-full flex-col items-center">
        <Suspense fallback={null}>
          <MySubmissions />
        </Suspense>
      </main>
    </div>
  );
}
