import express from "express";
import {
    createCompany,
    getCompanies,
    getCompanyById,
    getDeletedCompanies,
    searchCompaniesByName,
    updateCompany,
    updateStatus
} from "../controllers/companyController.js";

const router = express.Router();

router.post("/", createCompany);
router.get("/", getCompanies);
router.get("/search", searchCompaniesByName);
router.get("/deleted", getDeletedCompanies);
router.get("/:id", getCompanyById);
router.put("/:id", updateCompany);
router.put("/update-status/:id", updateStatus);

export default router;
