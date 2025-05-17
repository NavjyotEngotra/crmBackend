
import Meeting from "../models/MeetingModel.js";
import { getUserInfo } from "../utilities/getUserInfo.js";

export const createMeeting = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
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
        res.status(201).json({ success: true, meeting });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
            return res.status(404).json({ success: false, message: "Meeting not found" });
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

        res.json({ success: true, meeting: updatedMeeting });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
            return res.status(404).json({ success: false, message: "Meeting not found" });
        }

        res.json({ success: true, meeting });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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

        const [meetings, total] = await Promise.all([
            Meeting.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Meeting.countDocuments(query)
        ]);

        res.json({
            success: true,
            meetings,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
            return res.status(404).json({ success: false, message: "Meeting not found" });
        }

        res.json({ success: true, message: "Meeting deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
