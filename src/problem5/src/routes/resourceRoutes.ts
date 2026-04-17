import { Router } from "express";
import { 
  createResource, 
  listResources, 
  getResource, 
  updateResource, 
  deleteResource 
} from "../controllers/resourceController";
import { validateRequest } from "../middlewares/validateRequest";
import { CreateResourceSchema, UpdateResourceSchema } from "../models/resource";

const router = Router();

router.post("/", validateRequest(CreateResourceSchema), createResource);
router.get("/", listResources);
router.get("/:id", getResource);
router.put("/:id", validateRequest(UpdateResourceSchema), updateResource);
router.delete("/:id", deleteResource);

export default router;
