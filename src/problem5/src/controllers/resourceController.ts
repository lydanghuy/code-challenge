import { Request, Response } from "express";
import db from "../db/knex";
import { CreateResourceInput, UpdateResourceInput, Resource } from "../models/resource";
import { catchAsync } from "../utils/catchAsync";

export const createResource = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data: CreateResourceInput = req.body;
  const [id] = await db<Resource>("resources").insert({
    name: data.name,
    description: data.description,
    status: data.status,
  });
  const newResource = await db<Resource>("resources").where({ id }).first();
  res.status(201).json(newResource);
});

export const listResources = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { status, name, page = "1", limit = "10" } = req.query;
  
  // Secure integer parsing heavily neutralizing NaN attacks elegantly natively
  const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit as string, 10) || 10);
  const offset = (pageNumber - 1) * pageSize;

  let query = db<Resource>("resources");
  
  if (status) query = query.where("status", status as string);
  if (name) query = query.where("name", "like", `%${name}%`);
  
  // Clone native query sequentially counting absolute volume mapped safely
  const countResult = await query.clone().count<{ count: string | number }[]>("id as count").first();
  const total = Number(countResult?.count || 0);
  
  const resources = await query.select("*").limit(pageSize).offset(offset);
  
  res.json({
    data: resources,
    meta: {
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

export const getResource = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const resource = await db<Resource>("resources").where({ id: Number(id) }).first();
  
  if (!resource) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }
  
  res.json(resource);
});

export const updateResource = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const data: UpdateResourceInput = req.body;
  
  const existing = await db<Resource>("resources").where({ id: Number(id) }).first();
  if (!existing) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }
  
  await db("resources").where({ id: Number(id) }).update({
      ...data,
      updated_at: db.fn.now()
  });
    
  const updatedResource = await db<Resource>("resources").where({ id: Number(id) }).first();
  res.json(updatedResource);
});

export const deleteResource = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const deletedCount = await db("resources").where({ id: Number(id) }).delete();
  
  if (!deletedCount) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }
  
  res.status(204).send();
});
