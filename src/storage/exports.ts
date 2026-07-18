// Convenience barrel for storage modules (besides keys/storage which are
// infrastructure). Lets callers import a single entry point.
export {
  listCategories,
  saveCategory,
  deleteCategory,
  makeCategory,
  findCategoryByName,
} from './categories'
export {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  reassignTemplatesFromCategory,
  getTemplateForCategory,
  getDefaultTemplate,
  makeTemplate,
} from './templates'
export { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings'
export { seedIfEmpty } from './seed'