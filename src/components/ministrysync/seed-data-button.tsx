
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resetDB, seedDB } from "@/lib/seed";
import { Database, LoaderCircle } from "lucide-react";
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
  } from "@/components/ui/alert-dialog"

export function SeedDataButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSeed = async () => {
    setIsLoading(true);
    try {
        await resetDB();
        await seedDB();
        toast({
            title: "Database Seeded!",
            description: "The database has been populated with fresh sample data.",
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
    }
  };

  return (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isLoading}>
                {isLoading ? (
                    <LoaderCircle className="animate-spin" />
                ) : (
                    <Database />
                )}
                <span>Seed Database</span>
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will completely wipe all existing data in the database and replace it with new sample data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSeed}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
