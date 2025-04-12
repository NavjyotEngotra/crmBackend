import Product from "../models/ProductModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";
import { getUserInfo } from "../utilities/getUserInfo.js";



// Create Product (only Organization)
export const createProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.type !== "organization") {
            return res.status(401).json({ success: false, message: "Only organizations can create products" });
        }

        const { name, code, category, price, description, owner_id } = req.body;

        const existingProduct = await Product.findOne({
            organization_id: info.user._id,
            $or: [{ name }, { code }],
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: "Product with same name or code already exists in your organization",
            });
        }

        const newProduct = new Product({
            organization_id: info.user._id,
            name,
            code,
            category,
            price,
            description,
            owner_id,
        });

        await newProduct.save();

        res.status(201).json({ success: true, message: "Product created successfully", product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Product (only Organization)
export const updateProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.type !== "organization") {
            return res.status(401).json({ success: false, message: "Only organizations can update products" });
        }

        const { id } = req.params;
        const updateData = { ...req.body };

        const product = await Product.findById(id);

        if (!product || product.organization_id.toString() !== info.user._id.toString()) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (updateData.name || updateData.code) {
            const duplicateProduct = await Product.findOne({
                _id: { $ne: id },
                organization_id: info.user._id,
                $or: [
                    updateData.name ? { name: updateData.name } : {},
                    updateData.code ? { code: updateData.code } : {},
                ],
            });

            if (duplicateProduct) {
                return res.status(400).json({
                    success: false,
                    message: "Another product with the same name or code exists in your organization",
                });
            }
        }

        delete updateData.organization_id;
        delete updateData.status;

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

        res.json({ success: true, message: "Product updated", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Soft Delete Product (only Organization)
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.type !== "organization") {
            return res.status(401).json({ success: false, message: "Only organizations can delete products" });
        }

        const { id } = req.params;
        const { status } = req.body;

        const product = await Product.findById(id);

        if (!product || product.organization_id.toString() !== info.user._id.toString()) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        product.status = status;
        await product.save();

        res.json({ success: true, message: "Product status updated", product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get products Owned by Logged-In Team Member
export const getOwnedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Token missing" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const products = await Product.find({
            organization_id: teamMember.organization_id,
            owner_id: teamMember._id,
            status: 1, // only active contacts
        });

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search Product by Category
export const searchProductsByCategory = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { category } = req.query;

        if (!category || category.trim() === "") {
            return res.status(400).json({ success: false, message: "Category is required" });
        }

        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            status: 1, // Only active products
            category: { $regex: category, $options: "i" }, // Case-insensitive search
        });

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search Product by Name
export const searchProductsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res.status(400).json({ success: false, message: "Product name is required" });
        }
        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            // status: 1, // Only active products
            name: { $regex: name, $options: "i" }, // Case-insensitive search
        });

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Product by ID
export const getProductById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }


        const { id } = req.params;

        const product = await Product.findById(id);

        if (!product || product.organization_id.toString() !== (info.user.organization_id||  info.user._id).toString()) {
            return res.status(403).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Deleted Products with Pagination
export const getDeletedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            status: 0,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Product.countDocuments({
            organization_id: info.user.organization_id || info.user._id,
            status: 0,
        });

        res.json({
            success: true,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalDeletedProducts: totalCount,
            products,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            status: 1,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Product.countDocuments({
            organization_id: info.user.organization_id || info.user._id,
            status: 1,
        });

        res.json({
            success: true,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalDeletedProducts: totalCount,
            products,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};