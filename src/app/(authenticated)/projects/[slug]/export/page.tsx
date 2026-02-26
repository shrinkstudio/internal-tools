export default async function ExportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#EDEDED]">Export Proposal</h1>
      <p className="mt-2 text-sm text-[#888888]">
        PDF export for project: {slug}
      </p>
    </div>
  );
}
