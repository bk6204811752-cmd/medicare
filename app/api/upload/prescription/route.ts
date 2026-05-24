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
    const saleId = (formData.get("saleId") as string) || null;
    const doctorName = (formData.get("doctorName") as string) || null;
    const patientName = (formData.get("patientName") as string) || null;
    const notes = (formData.get("notes") as string) || null;

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

    const cleanEnv = (val: string | undefined): string => {
      if (!val) return "";
      let res = val.trim();
      if (res.startsWith('"') && res.endsWith('"')) {
        res = res.substring(1, res.length - 1);
      }
      if (res.startsWith("'") && res.endsWith("'")) {
        res = res.substring(1, res.length - 1);
      }
      return res.trim();
    };

    const cloudName = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME);
    const apiKey = cleanEnv(process.env.CLOUDINARY_API_KEY);
    const apiSecret = cleanEnv(process.env.CLOUDINARY_API_SECRET);

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Missing Cloudinary environment variables");
      return NextResponse.json(
        { error: "Upload service not configured." },
        { status: 500 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "medicare/prescriptions";

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
      let errMsg = "Prescription image upload failed.";
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.error && parsed.error.message) {
          errMsg = `Cloudinary: ${parsed.error.message}`;
        }
      } catch (e) {}
      return NextResponse.json(
        { error: errMsg },
        { status: 502 }
      );
    }

    const cloudinaryData = await uploadRes.json();
    const secureUrl: string = cloudinaryData.secure_url;

    const prescription = await prisma.prescriptionImage.create({
      data: {
        tenantId: user.tenantId,
        saleId,
        imageUrl: secureUrl,
        doctorName,
        patientName,
        notes,
      },
    });

    return NextResponse.json({ success: true, data: prescription });
  } catch (error) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload prescription image." },
      { status: 500 }
    );
  }
}
