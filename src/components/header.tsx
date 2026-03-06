"use client";

import { signOut } from "next-auth/react";

interface HeaderProps {
  user: { name?: string | null; image?: string | null };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900">
        🔍 Auto Search Summary
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user.name}</span>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
