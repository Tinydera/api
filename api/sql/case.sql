SELECT row_to_json(results.*) as results from (
SELECT
  id,
  title,
  COALESCE(general_issues, '{}') as general_issues,
  COALESCE(specific_topics, '{}') as specific_topics,
  COALESCE(description, '') as description,
  body,
  city,
  province,
  country,
  latitude,
  longitude,
  scope_of_influence,
  get_components(id, 'en') as has_components,
  get_object_title(is_component_of, 'en') as is_component_of,
  files,
  links,
  photos,
  videos,
  audio,
  EXTRACT(EPOCH FROM start_date) as start_date,
  EXTRACT(EPOCH FROM end_date) as end_date,
  ongoing,
  time_limited,
  COALESCE(purposes, '{}') as purposes,
  COALESCE(approaches, '{}') as approaches,
  public_spectrum,
  number_of_participants,
  open_limited,
  recruitment_method,
  COALESCE(targeted_participants, '{}') as targeted_participants,
  COALESCE(method_types, '{}') as method_types,
  COALESCE(tools_techniques_types, '{}') as tools_techniques_types,
  COALESCE(get_object_title_list(specific_methods_tools_techniques, 'en', cases.original_language), '{}') as specific_methods_tools_techniques,
  legality,
  facilitators,
  facilitator_training,
  facetoface_online_or_both,
  COALESCE(participants_interactions, '{}') as participants_interactions,
  COALESCE(learning_resources, '{}') as learning_resources,
  COALESCE(decision_methods, '{}') as decision_methods,
  COALESCE(if_voting, '{}') as if_voting,
  COALESCE(insights_outcomes, '{}') as insights_outcomes,
  get_object_title(primary_organizer, 'en') as primary_organizer,
  COALESCE(organizer_types, '{}') as organizer_types,
  funder,
  COALESCE(funder_types, '{}') as funder_types,
  staff,
  volunteers,
  impact_evidence,
  COALESCE(change_types, '{}') as change_types,
  COALESCE(implementers_of_change, '{}') as implementers_of_change,
  formal_evaluation,
  evaluation_reports,
  evaluation_links,
  EXTRACT(EPOCH FROM post_date) as post_date,
  EXTRACT(EPOCH FROM updated_date) as updated_date,
  completeness,
  COALESCE(get_object_title_list(collections, 'en', cases.original_language), '{}') as collections
FROM
  cases,
  get_localized_texts_fallback(cases.id, 'en', cases.original_language) as localized_texts
WHERE
  cases.hidden = false ${facets:raw}
ORDER BY ${sortby:raw} ${orderby:raw}
LIMIT ${limit}
OFFSET ${offset}

) AS results ;
