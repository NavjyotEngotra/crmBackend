import express from "express";
import {
    createCompany,
    getCompanies,
    getCompanyById,
    getDeletedCompanies,
    searchCompaniesByName,
    updateCompany,
    updateStatus,
    getOwnedCompanies
} from "../controllers/companyController.js";
import { isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createCompany);
router.get("/", getCompanies);
router.get("/search", searchCompaniesByName);
router.get("/deleted", getDeletedCompanies);
router.get("/getOwnedCompanies",getOwnedCompanies);
router.get("/:id", getCompanyById);
router.put("/:id", updateCompany);
router.put("/update-status/:id", isAdmin,updateStatus);


export default router;
