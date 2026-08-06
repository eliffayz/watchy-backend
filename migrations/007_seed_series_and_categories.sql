-- Migration 007: Seed Categories, Series, Episodes, and Banners

-- 1. Insert Categories
INSERT INTO categories (id, name, slug, description, image_url, active, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Romance', 'romance', 'Tutkulu aşklar ve duygusal hikayeler', '/uploads/genre_romance.jpg', true, 1),
  ('a0000000-0000-0000-0000-000000000002', 'Drama', 'drama', 'Derin karakterler ve sürükleyici dramlar', '/uploads/genre_drama.jpg', true, 2),
  ('a0000000-0000-0000-0000-000000000003', 'Action', 'action', 'Soluksuz aksiyon ve macera', '/uploads/genre_action.jpg', true, 3),
  ('a0000000-0000-0000-0000-000000000004', 'Sci-Fi', 'sci-fi', 'Geleceğin dünyaları ve bilim kurgu', '/uploads/genre_scifi.jpg', true, 4),
  ('a0000000-0000-0000-0000-000000000005', 'Thriller', 'thriller', 'Nefes kesen gerilim ve gizem', '/uploads/genre_thriller.jpg', true, 5),
  ('a0000000-0000-0000-0000-000000000006', 'Mystery', 'mystery', 'Karanlık sırlar ve çözülemeyen gizemler', '/uploads/genre_mystery.jpg', true, 6),
  ('a0000000-0000-0000-0000-000000000007', 'Fantasy', 'fantasy', 'Büyülü diyarlar ve efsaneler', '/uploads/genre_fantasy.jpg', true, 7),
  ('a0000000-0000-0000-0000-000000000008', 'Comedy', 'comedy', 'Kahkaha dolu eğlenceli anlar', '/uploads/genre_comedy.jpg', true, 8),
  ('a0000000-0000-0000-0000-000000000009', 'Horror', 'horror', 'Korku ve gerilim dolu anlar', '/uploads/genre_horror.jpg', true, 9),
  ('a0000000-0000-0000-0000-000000000010', 'Documentary', 'documentary', 'Gerçek hikayeler ve belgeseller', '/uploads/genre_documentary.jpg', true, 10)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

-- 2. Insert Series
INSERT INTO series (id, title, slug, description, short_description, poster_url, banner_url, language, country, release_year, age_rating, status, featured, premium, free_episode_count, seasons_count) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Billionaires', 'billionaires', 'Güç, zenginlik ve entrikanın zirvesinde geçen lüks bir yaşam hikayesi.', 'Zenginliğin ardındaki karanlık sırlar.', '/uploads/billionaires.png', '/uploads/billionaires.png', 'tr', 'TR', 2026, '18+', 'published', true, true, 4, 1),
  ('b0000000-0000-0000-0000-000000000002', 'Secret Affairs', 'secret-affairs', 'Karanlık sırlar ve yasak ilişkilerle örülü tutkulu bir aşk draması.', 'Aşk ve yalanlar arasında tehlikeli bir dans.', '/uploads/secret_affairs.png', '/uploads/secret_affairs.png', 'tr', 'TR', 2026, '18+', 'published', true, true, 4, 1),
  ('b0000000-0000-0000-0000-000000000003', 'Post Apocalyptic', 'post-apocalyptic', 'Yıkılmış bir dünyada hayatta kalmak için verilen amansız mücadele. Survival is everything.', 'Kıyamet sonrası hayatta kalma savaşı.', '/uploads/post_apocalyptic.jpg', '/uploads/post_apocalyptic.jpg', 'tr', 'TR', 2026, '16+', 'published', true, false, 4, 1),
  ('b0000000-0000-0000-0000-000000000004', 'Shadows of the Past', 'shadows-of-the-past', 'Geçmişin karanlık gölgeleri ve çözülemeyen gizemli bir cinayet zinciri.', 'Geçmiş asla peşinizi bırakmaz.', '/uploads/shadows_of_the_past.jpg', '/uploads/shadows_of_the_past.jpg', 'tr', 'TR', 2026, '16+', 'published', true, false, 4, 1),
  ('b0000000-0000-0000-0000-000000000005', 'Dark Desires', 'dark-desires', 'Tehlikeli arzular, baştan çıkarıcı oyunlar ve unutulmaz bir gerilim.', 'Arzuların karanlık yüzüyle tanışın.', '/uploads/dark_desires.png', '/uploads/dark_desires.png', 'tr', 'TR', 2026, '18+', 'published', true, true, 4, 1),
  ('b0000000-0000-0000-0000-000000000006', 'Shadows of Destiny', 'shadows-of-destiny', 'Kaderin gölgesinde yazılan destansı bir kahramanlık hikayesi.', 'Kaderin çağrısına kulak verin.', '/uploads/hero_shadows_of_destiny.jpg', '/uploads/hero_shadows_of_destiny.jpg', 'tr', 'TR', 2026, '13+', 'published', true, false, 4, 1),
  ('b0000000-0000-0000-0000-000000000007', 'The Cage', 'the-cage', 'Kafeste başlayan dövüş ve intikam dolu bir aksiyon macerası.', 'Kafesten kurtulmanın tek bir yolu var.', '/uploads/cw_the_cage.jpg', '/uploads/cw_the_cage.jpg', 'tr', 'TR', 2026, '16+', 'published', false, false, 4, 1)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  poster_url = EXCLUDED.poster_url,
  banner_url = EXCLUDED.banner_url,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  premium = EXCLUDED.premium,
  age_rating = EXCLUDED.age_rating;

-- 3. Connect Series to Categories
INSERT INTO series_categories (series_id, category_id) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'), -- Billionaires: Romance
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'), -- Billionaires: Drama
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'), -- Secret Affairs: Romance
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'), -- Secret Affairs: Drama
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004'), -- Post Apocalyptic: Sci-Fi
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003'), -- Post Apocalyptic: Action
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005'), -- Post Apocalyptic: Thriller
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006'), -- Shadows of the Past: Mystery
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005'), -- Shadows of the Past: Thriller
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001'), -- Dark Desires: Romance
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005'), -- Dark Desires: Thriller
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000007'), -- Shadows of Destiny: Fantasy
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003'), -- Shadows of Destiny: Action
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003'), -- The Cage: Action
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002')  -- The Cage: Drama
ON CONFLICT (series_id, category_id) DO NOTHING;

-- 4. Insert Episodes for Billionaires
INSERT INTO episodes (series_id, season_number, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status, premium, published_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 1, 1, 'Bölüm 1: Veliahtın Dönüşü', 'Şehre dönen veliaht, ailenin karanlık imparatorluğunu devralmaya hazırlanıyor.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 120, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 2, 'Bölüm 2: Gizli Anlaşma', 'Şirketin gizli hissedarı ortaya çıkınca dengeler altüst olur.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 115, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 3, 'Bölüm 3: Maskeli Balo', 'Lüks bir baloda yaşanan beklenmedik karşılaşma her şeyi değiştirir.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 130, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 4, 'Bölüm 4: İhanet', 'En yakın dostun sırtından vurmasıyla başlayan intikam planı.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 125, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 5, 'Bölüm 5: Büyük Çöküş', 'Borsa manipülasyonu ile imparatorluk sarsılıyor.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 140, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 6, 'Bölüm 6: Tehlikeli İttifak', 'Düşmanla yapılan anlaşma beklenmedik sonuçlar doğurur.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4', 110, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 7, 'Bölüm 7: Şantaj', 'Eski kayıtlardan çıkan belgeler herkesi köşeye sıkıştırır.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 135, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 8, 'Bölüm 8: Yüzleşme', 'İki güçlü ailenin kaçınılmaz yüzleşmesi.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 120, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 9, 'Bölüm 9: Son Karar', 'Aşk ve güç arasında seçim yapma vakti geldi.', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4', 145, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 1, 10, 'Bölüm 10: Sezon Finali', 'İmparatorluğun gerçek sahibi kim olacak?', '/uploads/billionaires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 150, 'published', true, NOW())
ON CONFLICT (series_id, season_number, episode_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  video_url = EXCLUDED.video_url,
  status = EXCLUDED.status,
  premium = EXCLUDED.premium;

-- 5. Insert Episodes for Secret Affairs
INSERT INTO episodes (series_id, season_number, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status, premium, published_at) VALUES
  ('b0000000-0000-0000-0000-000000000002', 1, 1, 'Bölüm 1: Yasak Çekim', 'İlk bakışta başlayan ve asla bitmeyecek bir tutku.', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 105, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000002', 1, 2, 'Bölüm 2: Gece Randevusu', 'Gözlerden uzak bir buluşma, geri dönüşü olmayan bir yola sokar.', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 110, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000002', 1, 3, 'Bölüm 3: Şüphe Tohumları', 'Gizlenen gerçekler gün yüzüne çıkmaya başlıyor.', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 115, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000002', 1, 4, 'Bölüm 4: İtiraf', 'Duyguların artık saklanamayacağı o an.', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 120, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000002', 1, 5, 'Bölüm 5: Tuzak', 'Yasak ilişkiyi ortaya çıkarmak isteyen bir düşman var.', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 130, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000002', 1, 6, 'Bölüm 6: Kırılma Noktası', 'Güven kaybolduğunda aşk ayakta kalabilir mi?', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4', 125, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000002', 1, 7, 'Bölüm 7: Tehlikeli Oyun', 'Herkes kendi kartını oynamaya başlar.', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 110, 'published', true, NOW()),
  ('b0000000-0000-0000-0000-000000000002', 1, 8, 'Bölüm 8: Sezon Finali', 'Aşk mı kazanacak yoksa sırlar mı?', '/uploads/secret_affairs.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 140, 'published', true, NOW())
ON CONFLICT (series_id, season_number, episode_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  video_url = EXCLUDED.video_url,
  status = EXCLUDED.status,
  premium = EXCLUDED.premium;

-- 6. Insert Episodes for Post Apocalyptic, Shadows of the Past, Dark Desires, Shadows of Destiny, The Cage
INSERT INTO episodes (series_id, season_number, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status, premium, published_at) VALUES
  ('b0000000-0000-0000-0000-000000000003', 1, 1, 'Bölüm 1: Kül Şehir', 'Yıkımın ardından harabeler arasında hayatta kalma mücadelesi başlar.', '/uploads/post_apocalyptic.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 110, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000003', 1, 2, 'Bölüm 2: Son Sığınak', 'Bir grup kurtulan güvenli bölge arayışına çıkar.', '/uploads/post_apocalyptic.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 115, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000003', 1, 3, 'Bölüm 3: Radyasyon Bölgesi', 'Tehlikeli topraklardan geçerken yaşanan kayıplar.', '/uploads/post_apocalyptic.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 120, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000003', 1, 4, 'Bölüm 4: Yeni Dünya', 'İnsanlığın yeniden doğuşu için ilk adım.', '/uploads/post_apocalyptic.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 125, 'published', false, NOW()),
  
  ('b0000000-0000-0000-0000-000000000004', 1, 1, 'Bölüm 1: Sisli Sokaklar', 'Eski bir Londra gecesinde işlenen esrarengiz cinayet.', '/uploads/shadows_of_the_past.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 115, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000004', 1, 2, 'Bölüm 2: İpuçları', 'Dedektif geçmişle bağlantılı bir mektup bulur.', '/uploads/shadows_of_the_past.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 120, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000004', 1, 3, 'Bölüm 3: Karanlık Koridorlar', 'Eski malikanedeki gizli geçitler açığa çıkar.', '/uploads/shadows_of_the_past.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 110, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000004', 1, 4, 'Bölüm 4: Gerçek Katil', 'Beklenmedik bir şüphelinin itirafları.', '/uploads/shadows_of_the_past.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 130, 'published', false, NOW()),

  ('b0000000-0000-0000-0000-000000000005', 1, 1, 'Bölüm 1: Kırmızı Kadife', 'Lüks bir otelde başlayan baştan çıkarıcı oyun.', '/uploads/dark_desires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 105, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000005', 1, 2, 'Bölüm 2: Sınırları Aşmak', 'Kuralların yıkıldığı ve arzuların öne çıktığı an.', '/uploads/dark_desires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 110, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000005', 1, 3, 'Bölüm 3: Gizli Kamera', 'Otel odasında kaydedilen görüntüler şantaj malzemesi olur.', '/uploads/dark_desires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 115, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000005', 1, 4, 'Bölüm 4: Tutkunun Bedeli', 'Tehlikeli aşkın hesabı ödenmek zorunda.', '/uploads/dark_desires.png', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 125, 'published', false, NOW()),

  ('b0000000-0000-0000-0000-000000000006', 1, 1, 'Bölüm 1: Seçilmiş Kişi', 'Eski bir kehanet gerçekleşmek üzere uyanıyor.', '/uploads/hero_shadows_of_destiny.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 120, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000006', 1, 2, 'Bölüm 2: Kılıcın Uyanışı', 'Kayıp silahın bulunmasıyla yeni güçler kazanılır.', '/uploads/hero_shadows_of_destiny.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 115, 'published', false, NOW()),

  ('b0000000-0000-0000-0000-000000000007', 1, 1, 'Bölüm 1: İlk Dövüş', 'Kafese adım atan dövüşçünün hayatta kalma sınavı.', '/uploads/cw_the_cage.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 95, 'published', false, NOW()),
  ('b0000000-0000-0000-0000-000000000007', 1, 2, 'Bölüm 2: Şampiyonun Gazabı', 'Unvan maçı öncesinde yaşanan gerilim.', '/uploads/cw_the_cage.jpg', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 100, 'published', false, NOW())
ON CONFLICT (series_id, season_number, episode_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  video_url = EXCLUDED.video_url,
  status = EXCLUDED.status,
  premium = EXCLUDED.premium;

-- 7. Insert Banners
INSERT INTO banners (id, title, subtitle, image_url, series_id, button_text, sort_order, active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Billionaires', 'Lüks, Güç ve İntikam', '/uploads/billionaires.png', 'b0000000-0000-0000-0000-000000000001', 'Hemen İzle', 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'Secret Affairs', 'Yasak Aşkın Tehlikeli Çekimi', '/uploads/secret_affairs.png', 'b0000000-0000-0000-0000-000000000002', 'Şimdi İzle', 2, true),
  ('c0000000-0000-0000-0000-000000000003', 'Dark Desires', 'Karanlık Arzuların Fısıltısı', '/uploads/dark_desires.png', 'b0000000-0000-0000-0000-000000000005', 'Keşfet', 3, true),
  ('c0000000-0000-0000-0000-000000000004', 'Shadows of Destiny', 'Kaderin Çağrısına Kulak Verin', '/uploads/hero_shadows_of_destiny.jpg', 'b0000000-0000-0000-0000-000000000006', 'İzle', 4, true),
  ('c0000000-0000-0000-0000-000000000005', 'Post Apocalyptic', 'Survival Is Everything', '/uploads/post_apocalyptic.jpg', 'b0000000-0000-0000-0000-000000000003', 'Başla', 5, true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  image_url = EXCLUDED.image_url,
  series_id = EXCLUDED.series_id,
  button_text = EXCLUDED.button_text,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;
