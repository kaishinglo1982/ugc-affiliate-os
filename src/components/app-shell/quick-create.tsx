"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { QUICK_ACTIONS } from "@/lib/quick-actions";

export function QuickCreate() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="primary">
          <Plus className="h-4 w-4" /> Neu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {QUICK_ACTIONS.map((action) => (
          <DropdownMenuItem key={action.id} asChild>
            <Link href={action.href}>
              <action.icon className="h-4 w-4" />
              {action.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
