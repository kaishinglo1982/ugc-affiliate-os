"use client";

import { useRef } from "react";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Benutzermenü">
          <Avatar>
            <AvatarFallback>{initials || <UserIcon className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="font-medium">{name}</p>
          <p className="text-xs font-normal text-[var(--color-foreground-muted)]">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <Settings className="h-4 w-4" /> Einstellungen
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-[var(--color-destructive)] focus:text-[var(--color-destructive)]"
          onSelect={(event) => {
            event.preventDefault();
            logoutFormRef.current?.requestSubmit();
          }}
        >
          <LogOut className="h-4 w-4" /> Abmelden
        </DropdownMenuItem>
        <form ref={logoutFormRef} action={logoutAction} className="hidden" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
