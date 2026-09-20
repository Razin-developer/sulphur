-- User-facing app details are stored separately from the immutable uploaded filename.
alter table apk_artifact add column display_name text;
alter table apk_artifact add column description text;

update apk_artifact set display_name = original_name where display_name is null;

alter table apk_artifact alter column display_name set not null;
alter table apk_artifact add constraint apk_artifact_display_name_length check (char_length(display_name) between 1 and 120);
alter table apk_artifact add constraint apk_artifact_description_length check (description is null or char_length(description) <= 1000);
