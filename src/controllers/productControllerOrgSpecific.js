import Product from "../models/ProductModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import Category from "../models/CategoryModel.js"; // ✅ Import Category model
import jwt from "jsonwebtoken";
import { getUserInfo } from "../utilities/getUserInfo.js";
import mongoose from "mongoose";

// Create Product (only Organization)
export const createProduct = async (req, res) => {
    try {
        const organizationId =
            req.user.role === "organization"
                ? req.user.id
                : req.user.organizationId;

        const {
            name,
            code,
            category,
            price,
            description,
            owner_id,
            tax,
            stockQuantity,
            commissionRate,
            tentativeDate,
        } = req.body;

        if (tax && (tax < 0 || tax > 100)) {
            return res.status(400).json({
                success: false,
                message: "Tax percentage must be between 0 and 100",
            });
        }

        if (stockQuantity && stockQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Stock quantity must be greater than 0",
            });
        }

        if (commissionRate && (commissionRate < 0 || commissionRate > 100)) {
            return res.status(400).json({
                success: false,
                message: "Commission rate must be between 0 and 100",
            });
        }

        const existingProduct = await Product.findOne({
            organization_id: organizationId,
            $or: [{ name }, { code }],
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message:
                    "Product with same name or code already exists in your organization",
            });
        }

        // ✅ Validate category exists
        const validCategory = await Category.findById(category);
        if (!validCategory) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid category ID" });
        }

        const newProduct = new Product({
            organization_id: organizationId,
            name,
            code,
            category,
            price,
            description,
            tax,
            stockQuantity,
            commissionRate,
            tentativeDate,
            owner_id: req.user.role === "team_member" ? req.user.id : owner_id,
            createdBy: req.user.id
        });

        await newProduct.save();

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: newProduct,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Product
export const updateProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info) {
            return res
                .status(401)
                .json({
                    success: false,
                    message: "Unauthorized access",
                });
        }

        if (info.type !== "organization" && info.type !== "team_member") {
            return res
                .status(401)
                .json({
                    success: false,
                    message: "Only organizations and team members can update products",
                });
        }

        const organizationId = info.type === "organization" ? info.user._id : info.organization_id;

        const { id } = req.params;
        const updateData = { ...req.body };

        const product = await Product.findById(id);

        if (
            !product ||
            product.organization_id.toString() !== info.user._id.toString()
        ) {
            return res
                .status(404)
                .json({ success: false, message: "Product not found" });
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
                    message:
                        "Another product with the same name or code exists in your organization",
                });
            }
        }

        // ✅ Validate updated category if provided
        if (updateData.category) {
            const validCategory = await Category.findById(updateData.category);
            if (!validCategory) {
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid category ID" });
            }
        }

        delete updateData.organization_id;
        delete updateData.status;

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
            new: true,
        });

        res.json({
            success: true,
            message: "Product updated",
            product: updatedProduct,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Soft Delete
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || (info.type !== "organization" && info.type !== "team_member")) {
            return res
                .status(401)
                .json({
                    success: false,
                    message: "Only organizations and team members can update product status",
                });
        }

        const { id } = req.params;
        const { status } = req.body;

        const product = await Product.findById(id);

        if (
            !product ||
            product.organization_id.toString() !== info.user._id.toString()
        ) {
            return res
                .status(404)
                .json({ success: false, message: "Product not found" });
        }

        product.status = status;
        await product.save();

        res.json({ success: true, message: "Product status updated", product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Owned Products
export const getOwnedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token)
            return res
                .status(401)
                .json({ success: false, message: "Token missing" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });

        const products = await Product.find({
            organization_id: teamMember.organization_id,
            owner_id: teamMember._id,
            status: 1,
        }).populate("category"); // ✅ Populate category

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Search by Category (expects ObjectId)
export const searchProductsByCategory = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const { category } = req.query;
        if (!category || !mongoose.Types.ObjectId.isValid(category)) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Valid category ID is required",
                });
        }

        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            status: 1,
            category,
        }).populate("category");

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search by Name
export const searchProductsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res
                .status(400)
                .json({ success: false, message: "Product name is required" });
        }

        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            name: { $regex: name, $options: "i" },
        }).populate("category");

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get by ID
export const getProductById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const { id } = req.params;

        const product = await Product.findById(id).populate("category");

        if (
            !product ||
            product.organization_id.toString() !==
                (info.user.organization_id || info.user._id).toString()
        ) {
            return res
                .status(403)
                .json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Deleted Products with Pagination
export const getDeletedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
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
            .limit(limit)
            .populate("category");

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

// All Products with Optional Filters
export const getProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const productId = req.query.id;
        if (productId) {
            const product = await Product.findOne({
                _id: productId,
                organization_id: organizationId,
            }).populate("category");
            if (!product) {
                return res
                    .status(404)
                    .json({ success: false, message: "Product not found" });
            }
            return res.json({ success: true, product });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const status =
            req.query.status !== undefined ? parseInt(req.query.status) : 1;
        const search = req.query.search?.trim();

        const query = { organization_id: organizationId };
        if (!isNaN(status)) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const [products, totalCount] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("category"),
            Product.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            products,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
