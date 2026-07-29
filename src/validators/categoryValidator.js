const validateCategory = (data, isUpdate = false) => {
  if (!isUpdate && (!data.name || data.name.trim() === '')) {
    return 'Name is required';
  }
  if (isUpdate && data.name !== undefined && data.name.trim() === '') {
    return 'Name cannot be empty';
  }
  return null;
};

module.exports = { validateCategory };
