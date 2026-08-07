const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const mappings = {
  // Categories
  '1785760816325-309205927.jpg': 'genre_romance.jpg',
  '1785760816831-466067897.jpg': 'genre_drama.jpg',
  '1785760817273-704267329.jpg': 'genre_action.jpg',
  '1785760817579-563579002.jpg': 'genre_scifi.jpg',
  '1785760817903-866666672.jpg': 'genre_thriller.jpg',
  '1785760818193-398483893.jpg': 'genre_mystery.jpg',
  '1785760818500-713254696.jpg': 'genre_fantasy.jpg',
  '1785760819057-590188894.jpg': 'genre_comedy.jpg',
  '1785760819355-595923152.jpg': 'genre_horror.jpg',
  '1785760819634-534444991.jpg': 'genre_documentary.jpg',

  // Banners & Series
  '1785760819977-197621839.png': 'billionaires.png',
  '1785760820325-32319867.png': 'secret_affairs.png',
  '1785760821112-7971537.png': 'dark_desires.png',
  '1785760821391-739480326.jpg': 'hero_shadows_of_destiny.jpg',
  '1785760820613-213457709.jpg': 'post_apocalyptic.jpg',
  '1785760820862-171940097.jpg': 'shadows_of_the_past.jpg',
  '1785760821666-295184607.jpg': 'cw_the_cage.jpg',
};

console.log('Copying and aliasing images in uploads directory...');

for (const [targetName, sourceName] of Object.entries(mappings)) {
  const sourcePath = path.join(uploadsDir, sourceName);
  const targetPath = path.join(uploadsDir, targetName);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied ${sourceName} -> ${targetName}`);
  } else {
    console.warn(`! Source not found: ${sourceName}`);
  }
}

console.log('Uploads synchronization complete.');
