"use client";

import dynamic from "next/dynamic";

const ProfileScreen = dynamic(
  () => import("@/components/screens/ProfileScreen").then((mod) => mod.ProfileScreen),
  { ssr: false }
);

export default function ProfilePage() {
  return <ProfileScreen />;
}
