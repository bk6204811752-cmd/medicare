import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Missing Cloudinary environment variables");
      return NextResponse.json(
        { error: "Upload service not configured." },
        { status: 500 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "medicare/profiles";

    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(signatureString)
      .digest("hex");

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadForm = new FormData();
    uploadForm.append("file", new Blob([buffer], { type: file.type }), file.name);
    uploadForm.append("folder", folder);
    uploadForm.append("timestamp", timestamp);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("signature", signature);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const uploadRes = await fetch(cloudinaryUrl, {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error("Cloudinary upload failed:", uploadRes.status, errBody);
      return NextResponse.json(
        { error: "Image upload failed." },
        { status: 502 }
      );
    }

    const cloudinaryData = await uploadRes.json();
    const secureUrl: string = cloudinaryData.secure_url;

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { profilePicUrl: secureUrl },
    });

    return NextResponse.json({ success: true, url: secureUrl });
  } catch (error) {
    console.error("Profile upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload profile picture." },
      { status: 500 }
    );
  }
}
