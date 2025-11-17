import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteAllRead } from "@/lib/notifications";

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteAllRead(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete read notifications" },
      { status: 500 }
    );
  }
}
