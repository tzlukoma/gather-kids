
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string }[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyPlaceholder?: string;
    clearable?: boolean;
}

export function Combobox({ 
    options, 
    value, 
    onChange, 
    placeholder = "Select an option...", 
    searchPlaceholder = "Search...",
    emptyPlaceholder = "No option found.",
    clearable = false
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[250px] justify-between"
            >
            {value ? selectedLabel : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
            <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
                <CommandEmpty>{emptyPlaceholder}</CommandEmpty>
                <CommandGroup>
                {options.map((option) => (
                    <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                        onChange(option.value === value ? null : option.value)
                        setOpen(false)
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {option.label}
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </PopoverContent>
        </Popover>
        {clearable && value && (
            <Button variant="ghost" size="icon" onClick={() => onChange(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
            </Button>
        )}
    </div>
  )
}
