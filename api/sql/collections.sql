SELECT
  id,
  type,
  texts.title,
  texts.description,
  texts.body,
  original_language,
  post_date,
  published,
  updated_date,
  location_name,
  address1,
  address2,
  city,
  province,
  postal_code,
  country,
  tags,
  featured,
  published,
  hidden,
  verified,
  reviewed_at,
  reviewed_by,
  files,
  links,
  photos,
  videos,
  audio,
  latitude,
  longitude
FROM
  collections,
  get_localized_texts_fallback(collections.id, ${language}, collections.original_language) AS texts
;