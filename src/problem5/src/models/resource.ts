import { z } from "zod";

export const CreateResourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"], {
    message: "Invalid status parameter provided" // Do not reveal valid status to client side
  }).default("ACTIVE"),
});

export const UpdateResourceSchema = CreateResourceSchema.partial();

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;

export interface Resource {
  id: number;
  name: string;
  description: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}
