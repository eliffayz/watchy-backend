const slugify = (text) => {
  if (!text) return '';
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ş': 's', 'ü': 'u', 'ı': 'i', 'ö': 'o',
    'Ç': 'C', 'Ğ': 'G', 'Ş': 'S', 'Ü': 'U', 'İ': 'I', 'Ö': 'O'
  };
  let result = text;
  for (let key in trMap) {
    result = result.replace(new RegExp(key, 'g'), trMap[key]);
  }
  return result
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           
    .replace(/[^\w\-]+/g, '')       
    .replace(/\-\-+/g, '-')         
    .replace(/^-+/, '')             
    .replace(/-+$/, '');            
};

module.exports = slugify;
