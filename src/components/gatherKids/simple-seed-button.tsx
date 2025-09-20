
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks";
import { resetDB, seedDB } from "@/lib/seed";
import { Database, LoaderCircle } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

interface SimpleSeedButtonProps {
    variant?: VariantProps<typeof buttonVariants>["variant"];
    size?: VariantProps<typeof buttonVariants>["size"];
}

export function SimpleSeedButton({ variant = "destructive", size = "lg" }: SimpleSeedButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSeed = async () => {
    setIsLoading(true);
    try {
        await resetDB();
        await seedDB();
        toast({
            title: "Database Seeded!",
            description: "The database has been reset and populated with fresh sample data.",
        });
        // A full page reload might be good to ensure all components refresh
        window.location.reload();
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
    <Button onClick={handleSeed} disabled={isLoading} variant={variant} size={size}>
        {isLoading ? <LoaderCircle className="animate-spin mr-2" /> : <Database className="mr-2" />}
        {isLoading ? "Seeding..." : "Seed Sample Data"}
    </Button>
  );
}
