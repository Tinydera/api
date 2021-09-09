WITH full_thing AS (
  SELECT
    -- not user editable
    id,
    post_date,
    updated_date,
    published,
    featured,
    completeness,
    -- user-contributed content
    texts.title,
    texts.description,
    texts.body,
     -- media links
    photos,
    files,
    videos,
    links,
    audio,
    -- text values
    city,
    province,
    country,
    -- floats
    latitude,
    longitude,
    -- key values
    sector,
    -- key lists
    scope_of_influence,
    type_method,
    type_tool,
    specific_topics,
    general_issues,
    -- ids
    get_object_title_list(specific_methods_tools_techniques, 'en', organizations.original_language) as specific_methods_tools_techniques,
    COALESCE(get_object_title_list(collections, 'en', organizations.original_language), '{}') as collections
FROM
    organizations,
    get_localized_texts_fallback(organizations.id, 'en', organizations.original_language) AS texts
WHERE
    organizations.hidden = false
ORDER BY ${sortby:raw} ${orderby:raw}
LIMIT ${limit}
OFFSET ${offset}
)
SELECT to_json(full_thing.*) results FROM full_thing
;