import express from "express";
import {
    createContact,
    updateContact,
    getContacts,
    getDeletedContacts,
    deleteContact,
    searchContactsByName
} from "../controllers/contactController.js";
import { isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createContact);
router.put("/:id", updateContact);
router.get("/", getContacts);
router.get("/deleted", getDeletedContacts);
router.put("/delete/:id",isAdmin, deleteContact);
router.get("/search", searchContactsByName);

export default router;
