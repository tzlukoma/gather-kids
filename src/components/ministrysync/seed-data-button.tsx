
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resetDB, seedDB } from "@/lib/seed";
import { Database, LoaderCircle, Trash2, Settings } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SeedDataButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsLoading(true);
    setIsSeeding(true);
    try {
        await resetDB();
        await seedDB();
        toast({
            title: "Database Seeded!",
            description: "The database has been reset and populated with fresh sample data.",
        });
    } catch (e) {
        console.error(e);
        toast({
            title: "Seeding Failed",
            description: "Could not seed the database. Check the console for errors.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
        setIsSeeding(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    setIsResetting(true);
    try {
        await resetDB();
        toast({
            title: "Database Reset!",
            description: "The database has been wiped clean.",
        });
    } catch (e) {
        console.error(e);
        toast({
            title: "Reset Failed",
            description: "Could not reset the database. Check the console for errors.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
        setIsResetting(false);
    }
  };

  return (
    <AlertDialog>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isLoading}>
                    {isLoading ? <LoaderCircle className="animate-spin" /> : <Settings />}
                    <span className="sr-only">Data Settings</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>Data Management</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSeed} disabled={isLoading}>
                    <Database className="mr-2" />
                    <span>Seed Database</span>
                </DropdownMenuItem>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" disabled={isLoading}>
                        <Trash2 className="mr-2" />
                        <span>Reset to Empty</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
            </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will completely wipe all existing data in the database. This cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleReset}>
                Yes, Reset Database
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
}
