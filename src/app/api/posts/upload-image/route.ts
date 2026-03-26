import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { R2ValidationError, uploadCoverImageToR2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authUser = getRequestUser(request);
    if (!authUser) {
      return jsonError("Authentication required.", 401);
    }

    const formData = await request.formData();
    const candidate = formData.get("file");

    if (!(candidate instanceof File)) {
      return jsonError("Missing file upload.", 400);
    }

    const url = await uploadCoverImageToR2(candidate, authUser.userId);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    if (error instanceof R2ValidationError) {
      return jsonError(error.message, 400);
    }

    const message =
      error instanceof Error ? error.message : "Failed to upload image.";
    return jsonError(message, 500);
  }
}
