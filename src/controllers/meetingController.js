import Meeting from "../models/MeetingModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";
import  responseSender  from "../utilities/responseSender.js";

export const createMeeting = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info) {
            return responseSender(res, 401, false,null, "Unauthorized");
        }

        const { title, from, to, meeting_type, location, description } = req.body;

        const meeting = new Meeting({
            organization_id: info.user.organization_id || info.user._id,
            title,
            from,
            to,
            meeting_type,
            location,
            description,
            createdBy: info.user._id,
            createdByModel: info.type === 'organization' ? 'Organization' : 'TeamMember',
            updatedBy: info.user._id,
            updatedByModel: info.type === 'organization' ? 'Organization' : 'TeamMember'
        });

        await meeting.save();
        return responseSender(res, 201, true,  { meeting });
    } catch (error) {
        return responseSender(res, 500, false, null,error.message);
    }
};

export const updateMeeting = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        const { id } = req.params;

        const meeting = await Meeting.findOne({
            _id: id,
            organization_id: info.user.organization_id || info.user._id
        });

        if (!meeting) {
            return responseSender(res, 404, false, null,"Meeting not found");
        }

        const updateFields = { ...req.body };
        delete updateFields.organization_id;
        delete updateFields.createdBy;
        delete updateFields.createdByModel;

        updateFields.updatedBy = info.user._id;
        updateFields.updatedByModel = info.type === 'organization' ? 'Organization' : 'TeamMember';

        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        );

        return responseSender(res, 200, true,  { meeting: updatedMeeting });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

export const getMeetingById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        const { id } = req.params;

        const meeting = await Meeting.findOne({
            _id: id,
            organization_id: info.user.organization_id || info.user._id
        });

        if (!meeting) {
            return responseSender(res, 404, false,null, "Meeting not found");
        }

        return responseSender(res, 200, true,  { meeting });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

export const getMeetings = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const query = {
            organization_id: info.user.organization_id || info.user._id
        };

        if (req.query.status !== undefined) {
            query.status = parseInt(req.query.status);
        }

        if (req.query.from || req.query.to) {
            query.from = {};
            if (req.query.from) query.from.$gte = new Date(req.query.from);
            if (req.query.to) query.from.$lte = new Date(req.query.to);
        }

        const [meetings, total] = await Promise.all([
            Meeting.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Meeting.countDocuments(query)
        ]);

        return responseSender(res, 200, true, {
            meetings,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        return responseSender(res, 500, false,null, error.message);
    }
};

export const deleteMeeting = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);
        const { id } = req.params;

        const meeting = await Meeting.findOneAndUpdate(
            {
                _id: id,
                organization_id: info.user.organization_id || info.user._id
            },
            {
                status: 0,
                updatedBy: info.user._id,
                updatedByModel: info.type === 'organization' ? 'Organization' : 'TeamMember'
            },
            { new: true }
        );

        if (!meeting) {
            return responseSender(res, 404, false,null, "Meeting not found");
        }

        return responseSender(res, 200, true,null, "Meeting deleted successfully");
    } catch (error) {
        return responseSender(res, 500, false,null,error.message);
    }
};
