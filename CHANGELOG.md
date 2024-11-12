# Changelog

All notable changes to this project will be documented in this file.

## [RC0.1] - 2024-11-01

### First release

## [RC0.2] - 2024-11-12
### Added
- Closed caption/subtitle for Vimeo, Dailymotion, and YouTube.
- Set video quality for Vimeo (only works with videos from PRO+).
- Bulk create interactive video activities by drag-n-dropping a CSV file on course page. CSV file must contain at least the videourl column.
- Support for left sidebar if plugin implements it. (hassidebar class to the body)
- New language (PT_BR) contributed by @eduardokraus

### Fixed
- If grade set to 0, update_grade method will create an endless loop until memory runs out.
- Dailymotion autoplay behavior.
- Other bugs fix.

### Update
- When saving progress, only update grade if grademax isn't 0 and gradeinstance exists.
- When video start and end time are incorrect for some reason (e.g. < 0, > duration, start >= end, end == 0), update start and end columns in the interactivevideo table on first access.
- Styling improvements.