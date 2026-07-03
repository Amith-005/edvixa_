import { AppError } from '../../../shared/errors/app-error.js'
import { SubjectModel } from '../models/subject.model.js'
class SubjectService {
  list(activeOnly = true) { return SubjectModel.find(activeOnly ? { isActive: true } : {}).sort({ name: 1 }).lean() }
  async create(input: Record<string, unknown>, userId: string) { return SubjectModel.create({ ...input, createdBy: userId }) }
  async update(id: string, input: Record<string, unknown>) { const value = await SubjectModel.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }); if (!value) throw new AppError(404, 'Subject not found', 'SUBJECT_NOT_FOUND'); return value }
  async remove(id: string) { const value = await SubjectModel.findByIdAndUpdate(id, { isActive: false }, { new: true }); if (!value) throw new AppError(404, 'Subject not found', 'SUBJECT_NOT_FOUND'); return value }
}
export const subjectService = new SubjectService()
