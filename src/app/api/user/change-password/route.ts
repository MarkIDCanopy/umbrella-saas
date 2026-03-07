import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/UserAuth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both fields are required." },
        { status: 400 }
      );
    }

    // 1. Retrieve user & hashed password
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // 2. Validate existing password
    const correct = await bcrypt.compare(currentPassword, existing.passwordHash);
    if (!correct) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    // 3. Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // 4. Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error updating password." },
      { status: 500 }
    );
  }
}
