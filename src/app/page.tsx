import { redirect } from "next/navigation";

// Home redirects to the marketplace (the product's landing surface).
export default function Home() {
  redirect("/skills_marketplace");
}
