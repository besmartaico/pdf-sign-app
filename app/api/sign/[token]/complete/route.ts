import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  const { token } = await params;

  return NextResponse.json({
    success: true,
    token,
    message: "Sign completion endpoint is wired up.",
  });
}
