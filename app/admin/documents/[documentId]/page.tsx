type PageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function AdminDocumentPage({ params }: PageProps) {
  const { documentId } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Admin Document</h1>
      <p className="mt-2">Document ID: {documentId}</p>
    </main>
  );
}