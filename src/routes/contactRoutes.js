import express from "express";
import {
    createContact,
    updateContact,
    getContacts,
    getDeletedContacts,
    updateStatus,
    searchContactsByName,
    getContactById,
    getOwnedContacts
} from "../controllers/contactController.js";
import { isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createContact);
router.put("/:id", updateContact);
router.get("/", getContacts);
router.get("/deleted", getDeletedContacts);
router.put("/update-status/:id",isAdmin, updateStatus);
router.get("/search", searchContactsByName);
router.get("/getOwnedContacts", getOwnedContacts);
router.get("/:id", getContactById);


export default router;
