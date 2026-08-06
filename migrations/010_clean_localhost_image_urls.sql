-- Clean up hardcoded localhost or port 3000 URLs in categories, series, episodes, banners, and users tables

UPDATE categories 
SET image_url = REGEXP_REPLACE(image_url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
WHERE image_url ~ '^https?://(localhost|127\.0\.0\.1)';

UPDATE series 
SET poster_url = REGEXP_REPLACE(poster_url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
WHERE poster_url ~ '^https?://(localhost|127\.0\.0\.1)';

UPDATE series 
SET banner_url = REGEXP_REPLACE(banner_url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
WHERE banner_url ~ '^https?://(localhost|127\.0\.0\.1)';

UPDATE episodes 
SET thumbnail_url = REGEXP_REPLACE(thumbnail_url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
WHERE thumbnail_url ~ '^https?://(localhost|127\.0\.0\.1)';

UPDATE banners 
SET image_url = REGEXP_REPLACE(image_url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
WHERE image_url ~ '^https?://(localhost|127\.0\.0\.1)';

UPDATE banners 
SET mobile_image_url = REGEXP_REPLACE(mobile_image_url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
WHERE mobile_image_url ~ '^https?://(localhost|127\.0\.0\.1)';

UPDATE users 
SET avatar_url = REGEXP_REPLACE(avatar_url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
WHERE avatar_url ~ '^https?://(localhost|127\.0\.0\.1)';
