import { AdminSkillDetail } from "@/components/admin/skills/admin-skill-detail";

export default async function AdminSkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminSkillDetail submissionId={id} />;
}
