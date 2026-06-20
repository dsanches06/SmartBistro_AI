import {
  getAllStaff,
  getStaffByUserId,
  createStaff,
  updateStaffHireDate,
  deleteStaff,
  isStaffMember,
} from "../services/staffService.js";

// GET /staff
export const getAll = async (req, res) => {
  try {
    res.json(await getAllStaff());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /staff/:userId
export const getByUserId = async (req, res) => {
  try {
    const staff = await getStaffByUserId(req.params.userId);
    if (!staff) return res.status(404).json({ error: "Staff member não encontrado" });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /staff/:userId/check
export const check = async (req, res) => {
  try {
    res.json({ is_staff: await isStaffMember(req.params.userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /staff
export const create = async (req, res) => {
  try {
    const { user_id, hire_date } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id é obrigatório" });
    res.status(201).json(await createStaff(user_id, hire_date));
  } catch (err) {
    const status = err.message.includes("não encontrado") ? 404 : 409;
    res.status(status).json({ error: err.message });
  }
};

// PUT /staff/:userId
export const update = async (req, res) => {
  try {
    const { hire_date } = req.body;
    if (!hire_date) return res.status(400).json({ error: "hire_date é obrigatório" });
    res.json(await updateStaffHireDate(req.params.userId, hire_date));
  } catch (err) {
    res.status(err.message.includes("não encontrado") ? 404 : 500).json({ error: err.message });
  }
};

// DELETE /staff/:userId
export const remove = async (req, res) => {
  try {
    res.json(await deleteStaff(req.params.userId));
  } catch (err) {
    res.status(err.message.includes("não encontrado") ? 404 : 500).json({ error: err.message });
  }
};
