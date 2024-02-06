"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";



type Species = Database["public"]["Tables"]["species"]["Row"];

const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Use Zod to define the shape + requirements of a Species entry; used in form validation
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type FormData = z.infer<typeof speciesSchema>;

// React component for SpeciesDetailDialog
export default function SpeciesDetailsDialog({ species, currentUser }: { species: Species; currentUser: string }) {

  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  const defaultValues: Partial<FormData> = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };

  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  // Event handler for submissions
  const onSubmit = async (input: FormData) => {
    // Instantiates supabase client
    const supabase = createBrowserSupabaseClient();

    // Updates species row in supabase
    const { error } = await supabase.from("species").update(input).eq("id", species.id);

    // Checks for error
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Switch to non editing mode
    setIsEditing(false);

    // Cleans and gets new data
    form.reset(input);
    router.refresh();

    // Returns confirmation message
    return toast({
      title: "Changes saved!",
      description: "Saved your changes to " + input.scientific_name + ".",
    });
  };

  // Event handler for starting to edit form
  const startEditing = (e: MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  // Event handler for trying to cancel changes
  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();

    // Creates pop-up to ensure you intentionally are trying to cancel
    if (!window.confirm("Revert all unsaved changes?")) {
      return;
    }

    form.reset(defaultValues);
    setIsEditing(false);
  };

  // Event handler for trying to delete a species card
  const handleDelete = async (input: FormData) => {
    if (!window.confirm("Are you sure you want to delete this species?")) {
      return;
    }

    const supabase = createBrowserSupabaseClient();

    // Deletes the species row from Supabase
    const { error } = await supabase.from("species").delete().eq("id", species.id);;

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }
    router.refresh();

    return toast({
      title: "Species deleted!",
      description: "Successfully deleted " + input.scientific_name + ".",
    });
  };

  // This is from the dialog in add-species-dialog file
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name} </DialogTitle>
          {species.common_name && <DialogDescription>{species.common_name}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input readOnly={!isEditing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Common Name</FormLabel>
                      <FormControl>
                        <Input readOnly={!isEditing} value={value ?? ""} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    <Select disabled={!isEditing} onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((kingdom, index) => (
                            <SelectItem key={index} value={kingdom}>
                              {kingdom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Total population</FormLabel>
                      <FormControl>
                        {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                        <Input
                          readOnly={!isEditing}
                          type="number"
                          value={value ?? ""}
                          {...rest}
                          onChange={(event) => field.onChange(+event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input readOnly={!isEditing} value={value ?? ""} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because textareas can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea readOnly={!isEditing} value={value ?? ""} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              {species.author === currentUser && <div className="flex">
                {isEditing ? (
                  <>
                    <Button type="submit" className="ml-1 mr-1 flex-auto">
                      Confirm
                    </Button>
                    <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" className="ml-1 mr-1 flex-auto" onClick={startEditing}>
                      Edit species
                    </Button>
                    <Button type="button" variant="outlined" color="error" className="ml-1 mr-1 flex-auto"  onClick={() => void handleDelete(form.getValues())}>
                      Delete
                    </Button>
                  </>
                )}
              </div>}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
