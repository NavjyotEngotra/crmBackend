import Product from "../models/ProductModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import Category from "../models/CategoryModel.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getUserInfo } from "../utilities/getUserInfo.js";
import responseSender from "../utilities/responseSender.js";

// Create Product
export const createProduct = async (req, res) => {
    try {
        const organizationId = req.user.role === "organization"
            ? req.user.id
            : req.user.organizationId;

        const {
            name, code, category, price, description,
            owner_id, tax, stockQuantity, commissionRate, tentativeDate
        } = req.body;

        if (tax && (tax < 0 || tax > 100)) {
            return responseSender(res, 400, false, null,"Tax percentage must be between 0 and 100");
        }

        if (stockQuantity && stockQuantity < 0) {
            return responseSender(res, 400, false,null, "Stock quantity must be greater than 0");
        }

        if (commissionRate && (commissionRate < 0 || commissionRate > 100)) {
            return responseSender(res, 400, false,null, "Commission rate must be between 0 and 100");
        }

        const existingProduct = await Product.findOne({
            organization_id: organizationId,
            $or: [{ name }, { code }],
        });

        if (existingProduct) {
            return responseSender(res, 400, false,null, "Product with same name or code already exists in your organization");
        }

        const validCategory = await Category.findById(category);
        if (!validCategory) {
            return responseSender(res, 400, false, null,"Invalid category ID");
        }

        const newProduct = new Product({
            organization_id: organizationId,
            name, code, category, price, description,
            tax, stockQuantity, commissionRate, tentativeDate,
            owner_id: req.user.role === "team_member" ? req.user.id : owner_id,
            createdBy: req.user.id
        });

        await newProduct.save();

        return responseSender(res, 201, true,  { product: newProduct });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

// Update Product
export const updateProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let organizationId;

        if (decoded.role === 'organization') {
            organizationId = decoded.id;
        } else {
            const teamMember = await TeamMember.findById(decoded.id);
            if (!teamMember || teamMember.status !== 1) {
                return responseSender(res, 401, false,null, "Unauthorized");
            }
            organizationId = teamMember.organization_id;
        }

        const { id } = req.params;
        const updateData = { ...req.body };

        const product = await Product.findById(id);
        if (!product || product.organization_id.toString() !== organizationId.toString()) {
            return responseSender(res, 404, false,null, "Product not found");
        }

        if (updateData.name || updateData.code) {
            const duplicateProduct = await Product.findOne({
                _id: { $ne: id },
                organization_id: organizationId,
                $or: [
                    updateData.name ? { name: updateData.name } : {},
                    updateData.code ? { code: updateData.code } : {},
                ],
            });

            if (duplicateProduct) {
                return responseSender(res, 400, false,null, "Another product with the same name or code exists in your organization");
            }
        }

        if (updateData.category) {
            const validCategory = await Category.findById(updateData.category);
            if (!validCategory) {
                return responseSender(res, 400, false,null, "Invalid category ID");
            }
        }

        delete updateData.organization_id;

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
        return responseSender(res, 200, true,  { product: updatedProduct });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

// Soft Delete
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let organizationId;

        if (decoded.role === 'organization') {
            organizationId = decoded.id;
        } else {
            const teamMember = await TeamMember.findById(decoded.id);
            if (!teamMember || teamMember.status !== 1) {
                return responseSender(res, 401, false,null, "Unauthorized");
            }
            organizationId = teamMember.organization_id;
        }

        const { id } = req.params;
        const { status } = req.body;

        const product = await Product.findById(id);
        if (!product || product.organization_id.toString() !== organizationId.toString()) {
            return responseSender(res, 404, false, null,"Product not found");
        }

        product.status = status;
        await product.save();

        return responseSender(res, 200, true,  { product });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

// Owned Products
export const getOwnedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return responseSender(res, 401, false,null, "Token missing");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);
        if (!teamMember || teamMember.status !== 1)
            return responseSender(res, 401, false, null,"Unauthorized");

        const products = await Product.find({
            organization_id: teamMember.organization_id,
            owner_id: teamMember._id,
            status: 1,
        }).populate("category");

        return responseSender(res, 200, true,  { products });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

// Search by Category
export const searchProductsByCategory = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return responseSender(res, 401, false,null, "Unauthorized");
        }

        const { category } = req.query;
        if (!category || !mongoose.Types.ObjectId.isValid(category)) {
            return responseSender(res, 400, false, null,"Valid category ID is required");
        }

        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            status: 1,
            category,
        }).populate("category");

        return responseSender(res, 200, true, { products });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

// Search by Name
export const searchProductsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return responseSender(res, 401, false, null, "Unauthorized");
        }

        const { name } = req.query;
        if (!name || name.trim() === "") {
            return responseSender(res, 400, false, null,"Product name is required");
        }

        const products = await Product.find({
            organization_id: info.user.organization_id || info.user._id,
            name: { $regex: name, $options: "i" },
        }).populate("category");

        return responseSender(res, 200, true,  { products });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

// Get Product by ID
export const getProductById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return responseSender(res, 401, false,null, "Unauthorized");
        }

        const { id } = req.params;
        const product = await Product.findById(id).populate("category");

        if (!product || product.organization_id.toString() !== (info.user.organization_id || info.user._id).toString()) {
            return responseSender(res, 403, false, null,"Product not found");
        }

        return responseSender(res, 200, true,  { product });
    } catch (error) {
        return responseSender(res, 500, false, null,error.message);
    }
};

// Deleted Products (Paginated)
export const getDeletedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return responseSender(res, 401, false, null,"Unauthorized");
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const query = {
            organization_id: info.user.organization_id || info.user._id,
            status: 0,
        };

        const [products, totalCount] = await Promise.all([
            Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("category"),
            Product.countDocuments(query),
        ]);

        return responseSender(res, 200, true,  {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalDeletedProducts: totalCount,
            products,
        });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

// Get All Products (with Filters and Pagination)
export const getProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return responseSender(res, 401, false,null, "Unauthorized");
        }

        const organizationId = info.user.organization_id || info.user._id;

        const populateFields = [
            { path: "category", select: "name" },
            { path: "organization_id", select: "name email" },
            { path: "owner_id", select: "name email" },
        ];

        const productId = req.query.id;
        if (productId) {
            const product = await Product.findOne({
                _id: productId,
                organization_id: organizationId,
            }).populate(populateFields);

            if (!product) return responseSender(res, 404, false,null, "Product not found");
            return responseSender(res, 200, true,  { product });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const status = req.query.status !== undefined ? parseInt(req.query.status) : 1;
        const search = req.query.search?.trim();

        const query = { organization_id: organizationId };
        if (!isNaN(status)) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const [products, totalCount] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate(populateFields),
            Product.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return responseSender(res, 200, true, {
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
        return responseSender(res, 500, false, error.message);
    }
};
