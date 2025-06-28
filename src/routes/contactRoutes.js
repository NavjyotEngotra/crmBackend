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
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

router.post("/",checkPermission("contact.create"), createContact);
router.put("/:id",checkPermission("contact.update"), updateContact);
router.get("/",checkPermission("contact.read"), getContacts);
router.get("/deleted",checkPermission("contact.read"), getDeletedContacts);
router.put("/update-status/:id",checkPermission("contact.update"),isAdmin, updateStatus);
router.get("/search",checkPermission("contact.read"), searchContactsByName);
router.get("/getOwnedContacts",checkPermission("contact.read"), getOwnedContacts);
router.get("/:id",checkPermission("contact.read"), getContactById);


export default router;
