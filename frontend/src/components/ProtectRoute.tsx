// ProtectRoute.tsx
"use client";
import { useAppSelector } from "@/store/slices/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/types/user";

export default function ProtectRoute({ allowedRoles, children }: { allowedRoles: Role[]; children: React.ReactNode }) {
  const user = useAppSelector((state) => state.user.profile);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    } else if (!allowedRoles.includes(user.role)) {
      router.replace("/access-denied");
    }
  }, [user, allowedRoles, router]);

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }
  return <>{children}</>;
}
