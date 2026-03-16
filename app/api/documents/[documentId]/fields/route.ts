import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { documentId } = await params;

  return NextResponse.json({
    success: true,
    documentId,
    fields: [],
  });
}