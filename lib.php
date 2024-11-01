<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Callback implementations for Interactivevideo
 *
 * Documentation: {@link https://moodledev.io/docs/apis/plugintypes/mod}
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('INTERACTIVEVIDEO_DISPLAY_INLINE', 1);
/**
 * Return if the plugin supports $feature.
 *
 * @param string $feature Constant representing the feature.
 * @return true | null True if the feature is supported, null otherwise.
 */
function interactivevideo_supports($feature) {
    switch ($feature) {
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_BACKUP_MOODLE2:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        case FEATURE_COMPLETION_TRACKS_VIEWS:
            return true;
        case FEATURE_MOD_PURPOSE:
            return MOD_PURPOSE_CONTENT;
        case FEATURE_COMPLETION_HAS_RULES:
            return true;
        case FEATURE_GRADE_HAS_GRADE:
            return true;
        case FEATURE_GROUPS:
            return true;
        case FEATURE_GROUPINGS:
            return true;
        default:
            return null;
    }
}

/**
 * Returns subplugins with class name.
 * @param string $classname The class name.
 * @return array The subplugins.
 */
function interactivevideo_get_subplugins($classname) {
    $allsubplugins = explode(',', get_config('mod_interactivevideo', 'enablecontenttypes'));
    $subpluginclass = [];
    foreach ($allsubplugins as $subplugin) {
        $class = $subplugin . '\\' . $classname;
        if (class_exists($class)) {
            $subpluginclass[] = $class;
        }
    }
    return $subpluginclass;
}

/**
 * Mod edit form display options
 *
 * @param mixed $moduleinstance
 * @return mixed
 */
function interactivevideo_display_options($moduleinstance) {
    $options = [];
    $options['disablechapternavigation'] = $moduleinstance->disablechapternavigation;
    $options['preventskipping'] = $moduleinstance->preventskipping;
    $options['useoriginalvideocontrols'] = $moduleinstance->useoriginalvideocontrols;
    $options['hidemainvideocontrols'] = $moduleinstance->hidemainvideocontrols;
    $options['preventseeking'] = $moduleinstance->preventseeking;
    $options['disableinteractionclick'] = $moduleinstance->disableinteractionclick;
    $options['disableinteractionclickuntilcompleted'] = $moduleinstance->disableinteractionclickuntilcompleted;
    $options['hideinteractions'] = $moduleinstance->hideinteractions;
    $options['theme'] = $moduleinstance->theme;
    $options['distractionfreemode'] = $moduleinstance->distractionfreemode;
    $options['darkmode'] = $moduleinstance->distractionfreemode == 1 ? $moduleinstance->darkmode : 0;
    $options['usefixedratio'] = $moduleinstance->distractionfreemode == 1 ? $moduleinstance->usefixedratio : 1;
    $options['pauseonblur'] = $moduleinstance->pauseonblur;
    $options['usecustomposterimage'] = $moduleinstance->usecustomposterimage;
    $options['displayinline'] = $moduleinstance->displayinline;
    $options['cardsize'] = $moduleinstance->cardsize;
    $options['cardonly'] = $moduleinstance->cardonly;
    $options['showposterimageright'] = $moduleinstance->showposterimageright;
    $options['usecustomdescription'] = $moduleinstance->usecustomdescription;
    $options['customdescription'] = $moduleinstance->customdescription ?? '';
    $options['launchinpopup'] = $moduleinstance->launchinpopup;
    $options['showprogressbar'] = $moduleinstance->showprogressbar;
    $options['showcompletionrequirements'] = $moduleinstance->showcompletionrequirements;
    $options['showposterimage'] = $moduleinstance->showposterimage;
    $options['showname'] = $moduleinstance->showname;
    $options['autoplay'] = $moduleinstance->autoplay;
    $options['columnlayout'] = $moduleinstance->columnlayout;
    $options['showdescription'] = $moduleinstance->showdescription;
    return $options;
}

/**
 * Saves a new instance of the mod_interactivevideo into the database.
 *
 * Given an object containing all the necessary data, (defined by the form
 * in mod_form.php) this function will create a new instance and return the id
 * number of the instance.
 *
 * @param object $moduleinstance An object from the form.
 * @param mod_interactivevideo_mod_form $mform The form.
 * @return int The id of the newly inserted record.
 */
function interactivevideo_add_instance($moduleinstance, $mform = null) {
    global $DB, $USER;

    $cmid = $moduleinstance->coursemodule;

    $moduleinstance->timecreated = time();
    $moduleinstance->timemodified = time();

    if (empty($moduleinstance->displayasstartscreen)) {
        $moduleinstance->displayasstartscreen = 0;
    }

    $moduleinstance->text = $moduleinstance->endscreentext;

    $moduleinstance->endscreentext = json_encode($moduleinstance->endscreentext);

    $moduleinstance->displayoptions = json_encode(interactivevideo_display_options($moduleinstance));

    $moduleinstance->id = $DB->insert_record('interactivevideo', $moduleinstance);

    if (!empty($moduleinstance->completionexpected)) {
        \core_completion\api::update_completion_date_event(
            $moduleinstance->coursemodule,
            'interactivevideo',
            $moduleinstance->id,
            $moduleinstance->completionexpected
        );
    }

    $DB->set_field('course_modules', 'instance', $moduleinstance->id, ['id' => $cmid]);
    $context = context_module::instance($cmid);

    if ($mform && !empty($moduleinstance->text['itemid'])) {
        $draftitemid = $moduleinstance->text['itemid'];
        $moduleinstance->endscreentext = file_save_draft_area_files(
            $draftitemid,
            $context->id,
            'mod_interactivevideo',
            'endscreentext',
            0,
            ['subdirs' => 0],
            $moduleinstance->text['text']
        );
        $DB->update_record('interactivevideo', $moduleinstance);
    }

    // Handle the file upload for video.
    if ($moduleinstance->source == 'url') {
        // Make sure the video field is empty.
        $DB->set_field('interactivevideo', 'video', '', ['id' => $moduleinstance->id]);

        // Delete the draft area files. This is normally done by the cron job, but we might as well do it now.
        if (!empty($moduleinstance->video)) {
            $fs = get_file_storage();
            $usercontext = context_user::instance($USER->id);
            $fs->delete_area_files($usercontext->id, 'user', 'draft', $moduleinstance->video);
        }
    } else {
        $draftitemid = $moduleinstance->video;
        // Move the file from draft area to the correct area.
        file_save_draft_area_files(
            $draftitemid,
            $context->id,
            'mod_interactivevideo',
            'video',
            0,
        );

        // Clear the videourl field.
        $DB->set_field('interactivevideo', 'videourl', '', ['id' => $moduleinstance->id]);

        // Delete the draft area files. This is normally done by the cron job, but we might as well do it now.
        $usercontext = context_user::instance($USER->id);
        $fs = get_file_storage();
        $fs->delete_area_files($usercontext->id, 'user', 'draft', $draftitemid);
    }

    // Save poster image file from draft area.
    $draftitemid = isset($moduleinstance->posterimagefile) ? $moduleinstance->posterimagefile : null;
    if ($draftitemid) {
        $moduleinstance->posterimage = file_save_draft_area_files(
            $draftitemid,
            $context->id,
            'mod_interactivevideo',
            'posterimage',
            0
        );
    }

    interactivevideo_grade_item_update($moduleinstance);

    // Handle external plugins.
    $subplugins = interactivevideo_get_subplugins('ivmform');
    foreach ($subplugins as $subplugin) {
        if (method_exists($subplugin, 'add_instance')) {
            $subplugin::add_instance($moduleinstance, $mform, $context);
        }
    }

    return $moduleinstance->id;
}

/**
 * Updates an instance of the mod_interactivevideo in the database.
 *
 * Given an object containing all the necessary data (defined in mod_form.php),
 * this function will update an existing instance with new data.
 *
 * @param object $moduleinstance An object from the form in mod_form.php.
 * @param mod_interactivevideo_mod_form $mform The form.
 * @return bool True if successful, false otherwise.
 */
function interactivevideo_update_instance($moduleinstance, $mform = null) {
    global $DB, $USER;
    $moduleinstance->id = $moduleinstance->instance;
    // Before we do anything, we need to check if the module instance has any video file, so we can delete it later.
    $oldvideo = $DB->get_field('interactivevideo', 'video', ['id' => $moduleinstance->id]);
    $moduleinstance->timemodified = time();
    $cmid = $moduleinstance->coursemodule;
    $draftitemid = $moduleinstance->endscreentext['itemid'];
    $text = $moduleinstance->endscreentext['text'];

    $moduleinstance->timemodified = time();

    // Put the endscreentext stdClass into a single field.
    $moduleinstance->endscreentext = json_encode($moduleinstance->endscreentext);
    // Put all the display options into a single field.
    $moduleinstance->displayoptions = json_encode(interactivevideo_display_options($moduleinstance));

    $completiontimeexpected = !empty($moduleinstance->completionexpected) ? $moduleinstance->completionexpected : null;
    \core_completion\api::update_completion_date_event(
        $moduleinstance->coursemodule,
        'interactivevideo',
        $moduleinstance->id,
        $completiontimeexpected
    );

    $context = context_module::instance($cmid);
    if ($draftitemid) {
        $moduleinstance->endscreentext = file_save_draft_area_files(
            $draftitemid,
            $context->id,
            'mod_interactivevideo',
            'endscreentext',
            0,
            ['subdirs' => 0],
            $text
        );
    }

    if ($moduleinstance->source == 'url') {
        // Delete video file if any.
        if ($oldvideo) {
            // Delete the draft area files.
            $fs = get_file_storage();
            $fs->delete_area_files($context->id, 'mod_interactivevideo', 'video', 0);
            if ($moduleinstance->video) {
                $usercontext = context_user::instance($USER->id);
                $fs->delete_area_files($usercontext->id, 'user', 'draft', $moduleinstance->video);
            }
            $moduleinstance->video = '';
        }
    } else {
        if ($oldvideo != $moduleinstance->video) {
            // Move the file from draft area to the correct area. This process will delete the old file, if any.
            $draftitemid = $moduleinstance->video;
            file_save_draft_area_files(
                $draftitemid,
                $context->id,
                'mod_interactivevideo',
                'video',
                0,
            );
            // Delete the draft area files. This is normally done by the cron job, but we might as well do it now.
            $usercontext = context_user::instance($USER->id);
            $fs = get_file_storage();
            $fs->delete_area_files(
                $usercontext->id,
                'user',
                'draft',
                $draftitemid
            );
        }

        // Make sure the videourl field is empty.
        $moduleinstance->videourl = '';
    }

    // Finally update the record.
    $DB->update_record('interactivevideo', $moduleinstance);

    // Save poster image file from draft area.
    $draftitemid = $moduleinstance->posterimagefile;
    if ($draftitemid) {
        $moduleinstance->posterimage = file_save_draft_area_files(
            $draftitemid,
            $context->id,
            'mod_interactivevideo',
            'posterimage',
            0
        );
    }

    // Let's update the grade item.
    interactivevideo_grade_item_update($moduleinstance);
    interactivevideo_update_grades($moduleinstance);

    // Handle external plugins.
    $subplugins = interactivevideo_get_subplugins('ivmform');
    foreach ($subplugins as $subplugin) {
        if (method_exists($subplugin, 'update_instance')) {
            $subplugin::update_instance($moduleinstance, $mform, $context);
        }
    }

    return true;
}

/**
 * Removes an instance of the mod_interactivevideo from the database.
 *
 * @param int $id Id of the module instance.
 * @return bool True if successful, false on failure.
 */
function interactivevideo_delete_instance($id) {
    global $DB;

    $exists = $DB->get_record('interactivevideo', ['id' => $id]);
    if (!$exists) {
        return false;
    }

    $cm = get_coursemodule_from_instance('interactivevideo', $id);

    // Handle external plugins.
    $subplugins = interactivevideo_get_subplugins('ivmform');
    foreach ($subplugins as $subplugin) {
        if (method_exists($subplugin, 'delete_instance')) {
            $subplugin::delete_instance($exists, $cm);
        }
    }

    \core_completion\api::update_completion_date_event($cm->id, 'interactivevideo', $exists->id, null);

    interactivevideo_grade_item_delete($exists);

    $DB->delete_records('interactivevideo', ['id' => $id]);

    // Delete all the annotations and their items.
    $DB->delete_records('interactivevideo_items', ['annotationid' => $id]);

    // Delete all the completion records.
    $DB->delete_records('interactivevideo_completion', ['cmid' => $id]);

    // Delete all the logs.
    $DB->delete_records('interactivevideo_log', ['cmid' => $id]);

    return true;
}

/**
 * Returns the lists of all browsable file areas within the given module context.
 *
 * The file area 'intro' for the activity introduction field is added automatically
 * by {@see file_browser::get_file_info_context_module()}.
 *
 * @package     mod_interactivevideo
 * @category    files
 *
 * @param stdClass $course
 * @param stdClass $cm
 * @param stdClass $context
 * @return string[].
 */
function interactivevideo_get_file_areas($course, $cm, $context) {
    return [
        'public',
        'content',
        'endscreentext',
        'attachments',
        'text1',
        'text2',
        'text3',
    ];
}

/**
 * File browsing support for mod_interactivevideo file areas.
 *
 * @package     mod_interactivevideo
 * @category    files
 *
 * @param file_browser $browser
 * @param array $areas
 * @param stdClass $course
 * @param stdClass $cm
 * @param stdClass $context
 * @param string $filearea
 * @param int $itemid
 * @param string $filepath
 * @param string $filename
 * @return file_info Instance or null if not found.
 */
function interactivevideo_get_file_info($browser, $areas, $course, $cm, $context, $filearea, $itemid, $filepath, $filename) {
    return null;
}

/**
 * Serves the files from the mod_interactivevideo file areas.
 *
 * @package     mod_interactivevideo
 * @category    files
 *
 * @param stdClass $course The course object.
 * @param stdClass $cm The course module object.
 * @param stdClass $context The mod_interactivevideo's context.
 * @param string $filearea The name of the file area.
 * @param array $args Extra arguments (itemid, path).
 * @param bool $forcedownload Whether or not force download.
 * @param array $options Additional options affecting the file serving.
 */
function interactivevideo_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, $options = []) {

    if ($filearea != 'public') {
        require_login($course, true, $cm);
    }

    $itemid = array_shift($args);
    $filename = array_pop($args);
    if (!$args) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }
    // Retrieve the file from the Files API.
    $fs = get_file_storage();
    $file = $fs->get_file($context->id, 'mod_interactivevideo', $filearea, $itemid, $filepath, $filename);
    if (!$file) {
        send_file_not_found();
    }

    // Finally send the file.
    send_stored_file($file, 0, 0, $forcedownload, $options);
}

/**
 * Extends the settings navigation with the mod_interactivevideo settings.
 *
 * This function is called when the context for the page is a mod_interactivevideo module.
 * This is not called by AJAX so it is safe to rely on the $PAGE.
 *
 * @param settings_navigation $settingsnav {@see settings_navigation}
 * @param navigation_node $interactivevideonode {@see navigation_node}
 */
function interactivevideo_extend_settings_navigation($settingsnav, $interactivevideonode = null) {
    $page = $settingsnav->get_page();

    // Interaction tab.
    if (has_capability('mod/interactivevideo:edit', $page->context)) {
        $interactivevideonode->add(
            get_string('interactions', 'mod_interactivevideo'),
            new moodle_url('/mod/interactivevideo/interactions.php', ['id' => $page->cm->id]),
            $interactivevideonode::TYPE_SETTING,
            null,
            null,
            new pix_icon('i/edit', '')
        );
    }

    // Report tab.
    if (has_capability('mod/interactivevideo:viewreport', $page->context)) {
        $interactivevideonode->add(
            get_string('report', 'mod_interactivevideo'),
            new moodle_url('/mod/interactivevideo/report.php', ['id' => $page->cm->id, 'group' => 0]),
            $interactivevideonode::TYPE_SETTING,
            null,
            null,
            new pix_icon('i/report', '')
        );
    }
}

/**
 * Add a get_coursemodule_info function.
 *
 * Given a course_module object, this function returns any "extra" information that may be needed
 * when printing this activity in a course listing.  See get_array_of_activities() in course/lib.php.
 *
 * @param stdClass $coursemodule The coursemodule object (record).
 * @return cached_cm_info An object on information that the courses
 *                        will know about (most noticeably, an icon).
 */
function interactivevideo_get_coursemodule_info($coursemodule) {
    global $DB;
    $dbparams = ['id' => $coursemodule->instance];
    $interactive = $DB->get_record('interactivevideo', $dbparams, '*');
    if (!$interactive) {
        return false;
    }

    $result = new cached_cm_info();
    $result->name = $interactive->name;
    $result->customdata['displayoptions'] = $interactive->displayoptions;
    if ($coursemodule->showdescription) {
        $result->content = format_module_intro('interactivevideo', $interactive, $coursemodule->id, false);
    }

    if ($coursemodule->completion == COMPLETION_TRACKING_AUTOMATIC) {
        $result->customdata['customcompletionrules']['completionpercentage'] = $interactive->completionpercentage;
        // Add extended completion.
        $result->customdata['extendedcompletion'] = $interactive->extendedcompletion ?? '[]';
        foreach (json_decode($result->customdata['extendedcompletion']) as $rule => $value) {
            $result->customdata['customcompletionrules'][$rule] = $value;
        }
        // Pass startendtime to be used in the completion tracking.
        $result->customdata['startendtime'] = $interactive->start . "-" . $interactive->end;
    }
    return $result;
}

/**
 * Dynamically updates the course module information.
 *
 * @param cm_info $cm The course module information object.
 */
function interactivevideo_cm_info_dynamic(cm_info $cm) {
    global $PAGE;
    if (strpos($PAGE->bodyclasses, 'path-course-view') === false) {
        return;
    }
    // Set after link.
    $afterlink = '';

    $context = context_module::instance($cm->id);
    if (has_capability('mod/interactivevideo:edit', $context)) {
        $afterlink .= html_writer::link(
            new moodle_url('/course/modedit.php?', ['update' => $cm->id]),
            '<i class="fa fa-edit" aria-hidden="true"></i>',
            [
                'class' => 'p-1 mr-1',
                'title' => get_string('edit', 'mod_interactivevideo'),
                'aria-label' => get_string('edit', 'mod_interactivevideo'),
            ]
        );

        $afterlink .= html_writer::link(
            new moodle_url('/mod/interactivevideo/interactions.php', ['id' => $cm->id]),
            '<i class="fa fa-bullseye" aria-hidden="true"></i>',
            [
                'class' => 'p-1 mr-1',
                'title' => get_string('interactions', 'mod_interactivevideo'),
                'aria-label' => get_string('interactions', 'mod_interactivevideo'),
            ]
        );
    }
    if (has_capability('mod/interactivevideo:viewreport', $context)) {
        $afterlink .= html_writer::link(
            new moodle_url('/mod/interactivevideo/report.php', ['id' => $cm->id, 'group' => 0]),
            '<i class="fa fa-table" aria-hidden="true"></i>',
            [
                'class' => 'p-1 mr-1',
                'title' => get_string('report', 'mod_interactivevideo'),
                'aria-label' => get_string('report', 'mod_interactivevideo'),
            ]
        );
    }

    $cm->set_after_link($afterlink);

    $customdata = $cm->customdata;
    $displayoptions = json_decode($customdata['displayoptions']);
    if (isset($displayoptions->displayinline) && $displayoptions->displayinline == INTERACTIVEVIDEO_DISPLAY_INLINE) {
        $cm->set_no_view_link();
    }
}

/**
 * Callback function to display custom information for the interactive video module.
 *
 * This function is called when viewing the course module information.
 *
 * @param cm_info $cm The course module information object.
 */
function interactivevideo_cm_info_view(cm_info $cm) {
    $customdata = $cm->customdata;
    $displayoptions = json_decode($customdata['displayoptions']);
    $displayinline = isset($displayoptions->displayinline) && $displayoptions->displayinline == INTERACTIVEVIDEO_DISPLAY_INLINE;
    if ($displayinline) {
        $cm->set_content(interactivevideo_displayinline($cm));
    }
}

/**
 * Displays the interactive video inline.
 *
 * @param cm_info $cm Course module information.
 */
function interactivevideo_displayinline(cm_info $cm) {
    global $DB, $USER, $CFG, $OUTPUT, $PAGE;

    // Get data from interactivevideo and interactivevideo_items and interactivevideo_completion for current user.
    $interactivevideo = $DB->get_record(
        'interactivevideo',
        ['id' => $cm->instance],
        'id, name, start, end, type, posterimage, intro, introformat, completionpercentage'
    );

    if (!$interactivevideo) {
        return '';
    }

    $displayoptions = json_decode($cm->customdata['displayoptions']);
    if (isset($displayoptions->usecustomposterimage) && $displayoptions->usecustomposterimage) {
        $fs = get_file_storage();
        $file = $fs->get_area_files(
            $cm->context->id,
            'mod_interactivevideo',
            'posterimage',
            0,
            'filesize DESC',
        );
        $file = reset($file);
        if ($file) {
            $posterimage = moodle_url::make_pluginfile_url(
                $file->get_contextid(),
                $file->get_component(),
                $file->get_filearea(),
                $file->get_itemid(),
                $file->get_filepath(),
                $file->get_filename()
            );
            $interactivevideo->posterimage = $posterimage->out();
        }
    }
    $duration = $interactivevideo->end - $interactivevideo->start;
    // Convert to hh:mm:ss format.
    $duration = gmdate($duration > 3600 * 60 ? 'H:i:s' : 'i:s', (int) $duration);

    // Format the intro: keep text only and truncate it.
    $datafortemplate = [
        'interactivevideo' => $interactivevideo,
        'cm' => $cm,
        'launchinpopup' => isset($displayoptions->launchinpopup) && $displayoptions->launchinpopup,
        'baseurl' => $CFG->wwwroot,
        'duration' => $duration,
        'formattedname' => format_string($cm->name),
        'showdescription' => $cm->showdescription,
        'formattedintro' => format_module_intro('interactivevideo', $interactivevideo, $cm->id, false),
        'size' => isset($displayoptions->cardsize) ? $displayoptions->cardsize : 'large',
        'issmall' => isset($displayoptions->cardsize)
            && ($displayoptions->cardsize == 'small' || $displayoptions->cardsize == 'medium'
                || $displayoptions->cardsize == 'mediumlarge'),
        'columnlayout' => isset($displayoptions->columnlayout) ? $displayoptions->columnlayout : '1',
    ];

    if (isset($displayoptions->cardsize)) {
        $datafortemplate['usecustomdesc'] = isset($displayoptions->usecustomdescription) && $displayoptions->usecustomdescription;
        $datafortemplate['customdesc'] = isset($displayoptions->customdescription) ? $displayoptions->customdescription : '';
        $datafortemplate['showposterimageright'] = isset($displayoptions->showposterimageright)
            && $displayoptions->showposterimageright;
        $datafortemplate['showposterimage'] = isset($displayoptions->showposterimage) && $displayoptions->showposterimage;
        $datafortemplate['showprogressbar'] = isset($displayoptions->showprogressbar) && $displayoptions->showprogressbar;
        $datafortemplate['showcompletion'] = isset($displayoptions->showcompletionrequirements)
            && $displayoptions->showcompletionrequirements;
        $datafortemplate['cardonly'] = isset($displayoptions->cardonly) && $displayoptions->cardonly;
        $datafortemplate['showname'] = isset($displayoptions->showname) && $displayoptions->showname;

        if ($datafortemplate['cardonly']) {
            $datafortemplate['showposterimageright'] = false;
            $datafortemplate['usecustomdesc'] = false;
            $datafortemplate['showdescription'] = false;
            $datafortemplate['showposterimage'] = true;
            $datafortemplate['columnlayout'] = false;
        }
        if ($datafortemplate['usecustomdesc']) {
            $datafortemplate['showdescription'] = true;
            $datafortemplate['formattedintro'] = $datafortemplate['customdesc'];
        }
    }

    if (!$cm->uservisible) {
        return $OUTPUT->render_from_template('mod_interactivevideo/activitycard', $datafortemplate);
    }

    // Completion details.
    $completion = null;
    $getcompletion = false;
    if ($datafortemplate['launchinpopup']) {
        $getcompletion = true;
    }

    if ($datafortemplate['showcompletion']) {
        $getcompletion = true;
    }

    if ($USER->id <= 1) { // Guest user.
        $getcompletion = false;
    }

    if ($getcompletion) {
        $completiondetails = \core_completion\cm_completion_details::get_instance($cm, $USER->id);
        if ($CFG->branch < 404) {
            $completion = $OUTPUT->activity_information($cm, $completiondetails, []);
        } else {
            $activitycompletion = new \core_course\output\activity_completion($cm, $completiondetails);
            $output = $PAGE->get_renderer('core');
            $activitycompletiondata = (array) $activitycompletion->export_for_template($output);
            if ($activitycompletiondata["hascompletion"]) {
                $completion = $OUTPUT->render_from_template('core_course/activity_info', $activitycompletiondata);
            }
        }
    }
    $datafortemplate['completion'] = $completion;

    // Get interactive_items.
    $select = "annotationid = ? AND ((timestamp >= ? AND timestamp <= ?) OR timestamp < 0) "
        . "AND (hascompletion = 1 OR type = 'skipsegment'"
        . ($datafortemplate['showprogressbar'] ? " OR type = 'analytics')" : ')');

    $relevantitems = $DB->get_records_select(
        'interactivevideo_items',
        $select,
        [$cm->instance, $interactivevideo->start, $interactivevideo->end],
        '',
        'id, type, xp, timestamp, title, char1, hascompletion'
    );

    $skipsegment = array_filter($relevantitems, function ($item) {
        return $item->type === 'skipsegment';
    });

    $analytics = array_filter($relevantitems, function ($item) {
        return $item->type === 'analytics';
    });
    $analytics = reset($analytics);

    $relevantitems = array_filter($relevantitems, function ($item) use ($skipsegment) {
        foreach ($skipsegment as $ss) {
            if ($item->timestamp > $ss->timestamp && $item->timestamp < $ss->title && $item->timestamp >= 0) {
                return false;
            }
        }
        if ($item->type === 'skipsegment') {
            return false;
        }
        return true;
    });

    if ($USER->id > 1) {
        $usercompletion = $DB->get_records(
            'interactivevideo_completion',
            [
                'userid' => $USER->id,
                'cmid' => $cm->instance,
            ],
            'xp, completionpercentage, completeditems' . ($analytics ? ', completiondetails' : '')
        );
        $usercompletion = reset($usercompletion);
    } else {
        require_once($CFG->dirroot . '/mod/interactivevideo/locallib.php');
        $usercompletion = interactivevideo_util::get_progress($cm->instance, 1, false);
    }

    if (!$relevantitems) {
        $datafortemplate['noitems'] = true;
        if (!$usercompletion) {
            $datafortemplate['new'] = true;
        }
        return $OUTPUT->render_from_template('mod_interactivevideo/activitycard', $datafortemplate);
    }

    if (!$usercompletion) {
        $datafortemplate['new'] = true;
        $usercompletion = [
            'xp' => 0,
            'completionpercentage' => 0,
            'completeditems' => '[]',
            'completiondetails' => '[]',
        ];
    } else {
        $usercompletion = (array) $usercompletion;
    }
    if ($usercompletion['completeditems'] == '') {
        $usercompletion['completeditems'] = '[]';
    }
    $completeditems = json_decode($usercompletion['completeditems'], true);
    $datafortemplate['completeditems'] = count($completeditems);

    // Remove analytics that does not have completion.
    $relevantitems = array_filter($relevantitems, function ($item) {
        return $item->hascompletion == 1;
    });

    $datafortemplate['noitems'] = count($relevantitems) == 0;

    if (!$datafortemplate['noitems']) {
        $datafortemplate['totalitems'] = count($relevantitems);
        $datafortemplate['totalxp'] = array_sum(array_column($relevantitems, 'xp'));

        if ((float) $datafortemplate['totalxp'] == 0) {
            $datafortemplate['noxp'] = true;
        }

        // Get completion information.
        $usercompletion['completionpercentage'] = round(($datafortemplate['completeditems'] / $datafortemplate['totalitems'])
            * 100);
        $datafortemplate['usercompletion'] = $usercompletion;
        $datafortemplate['completed'] = $usercompletion['completionpercentage'] == 100
            || ($interactivevideo->completionpercentage > 0
                && $usercompletion['completionpercentage'] >= $interactivevideo->completionpercentage);
    }

    if ($analytics && $datafortemplate['showprogressbar']) {
        $datafortemplate['analyticsexpected'] = (int) $analytics->char1;
        $datafortemplate['hasanalytics'] = true;
        $datafortemplate['analytics'] = 0;
        $datafortemplate['analyticscompleted'] = false;
        if ($usercompletion) {
            $analyticsid = $analytics->id;
            $completiondetails = (array)json_decode($usercompletion['completiondetails'], true);
            $completiondetails = array_map(function ($item) {
                $item = json_decode($item, true);
                return (object)$item;
            }, $completiondetails);

            $analyticsitem = array_filter($completiondetails, function ($item) use ($analyticsid) {
                return $item->id == $analyticsid;
            });
            $analyticsitem = reset($analyticsitem);

            if ($analyticsitem) {
                $datafortemplate['analytics'] = $analyticsitem->percentage;
            }

            if ($datafortemplate['analytics'] == 100 || ($datafortemplate['analyticsexpected'] > 0
                && $datafortemplate['analytics'] >= $datafortemplate['analyticsexpected'])) {
                $datafortemplate['analyticscompleted'] = true;
            }
        }
    }

    return $OUTPUT->render_from_template('mod_interactivevideo/activitycard', $datafortemplate);
}

if ($CFG->branch <= 403) {
    /**
     * Adds JavaScript before the footer is rendered.
     *
     * This function is called to add JavaScript before the footer is rendered
     * when the page is a course view.
     */
    function interactivevideo_before_footer() {
        global $PAGE;
        if (strpos($PAGE->bodyclasses, 'path-course-view') === false) {
            return;
        }
        $PAGE->requires->js_call_amd('mod_interactivevideo/launch', 'init');
    }
}

/**
 * Creates or updates grade item for the given mod_interactivevideo instance.
 *
 * Needed by {@see grade_update_mod_grades()}.
 *
 * @param stdClass $moduleinstance Instance object with extra cmidnumber and modname property.
 * @param mixed $grades Null to update all grades, false to delete all grades, or array of user grades.
 * @return void.
 */
function interactivevideo_grade_item_update($moduleinstance, $grades = null) {
    global $CFG;
    require_once($CFG->libdir . '/gradelib.php');

    if (!isset($moduleinstance->courseid)) {
        $moduleinstance->courseid = $moduleinstance->course;
    }

    $item = [];
    $item['iteminfo'] = null;
    $item['itemname'] = clean_param($moduleinstance->name, PARAM_NOTAGS);
    if ($moduleinstance->grade > 0) {
        $item['gradetype'] = GRADE_TYPE_VALUE;
        $item['grademax']  = $moduleinstance->grade;
        $item['grademin']  = 0;
    } else {
        $item['gradetype'] = GRADE_TYPE_NONE;
    }

    if ($grades === 'reset') {
        $item['reset'] = true;
        $grades = null;
    }

    grade_update(
        '/mod/interactivevideo',
        $moduleinstance->course,
        'mod',
        'interactivevideo',
        $moduleinstance->id,
        0,
        $grades,
        $item
    );
}

/**
 * Delete grade item for given mod_interactivevideo instance.
 *
 * @param stdClass $moduleinstance Instance object.
 * @return grade_item.
 */
function interactivevideo_grade_item_delete($moduleinstance) {
    global $CFG;
    require_once($CFG->libdir . '/gradelib.php');
    if (!isset($moduleinstance->courseid)) {
        $moduleinstance->courseid = $moduleinstance->course;
    }

    return grade_update(
        '/mod/interactivevideo',
        $moduleinstance->courseid,
        'mod',
        'interactivevideo',
        $moduleinstance->id,
        0,
        null,
        ['deleted' => 1]
    );
}

/**
 * Update mod_interactivevideo grades in the gradebook.
 *
 * Needed by {@see grade_update_mod_grades()}.
 *
 * @param stdClass $moduleinstance Instance object with extra cmidnumber and modname property.
 * @param int $userid Update grade of specific user only, 0 means all participants.
 */
function interactivevideo_update_grades($moduleinstance, $userid = 0) {
    global $CFG;
    require_once($CFG->libdir . '/gradelib.php');
    if ($moduleinstance->grade == 0) {
        interactivevideo_update_grades($moduleinstance);
    } else if ($grades = interactivevideo_get_user_grades($moduleinstance, $userid)) {
        interactivevideo_grade_item_update($moduleinstance, $grades);
    } else {
        interactivevideo_grade_item_update($moduleinstance);
    }
}

/**
 * Get user grades for the mod_interactivevideo module.
 *
 * @param stdClass $moduleinstance The module instance object.
 * @param int $userid The user ID (optional).
 * @return array The user grades.
 */
function interactivevideo_get_user_grades($moduleinstance, $userid = 0) {
    global $CFG, $DB;
    require_once($CFG->libdir . '/gradelib.php');
    // Get user grades from the grade_grades table with key as userid.
    $grades = [];
    if ($userid) {
        $sql = "SELECT g.userid AS userid, g.rawgrade AS rawgrade, g.usermodified AS usermodified
                FROM {grade_grades} g
                LEFT JOIN {grade_items} gi ON g.itemid = gi.id
                WHERE gi.iteminstance = :iteminstance AND gi.itemmodule = :itemmodule AND g.userid = :userid";
        $params = ['iteminstance' => $moduleinstance->id, 'itemmodule' => 'interactivevideo', 'userid' => $userid];
        $grades = $DB->get_records_sql($sql, $params);
    } else {
        $sql = "SELECT g.userid AS userid, g.rawgrade AS rawgrade, g.usermodified AS usermodified
                FROM {grade_grades} g
                LEFT JOIN {grade_items} gi ON g.itemid = gi.id
                WHERE gi.iteminstance = :iteminstance AND gi.itemmodule = :itemmodule";
        $params = ['iteminstance' => $moduleinstance->id, 'itemmodule' => 'interactivevideo'];
        $grades = $DB->get_records_sql($sql, $params);
    }
    return $grades;
}

/**
 * Reset all user grades for the mod_interactivevideo module.
 *
 * @param stdClass $data The module instance object.
 * @return array The status.
 */
function interactivevideo_reset_userdata($data) {
    global $DB;
    $status = [];
    $resetcompletion = $data->reset_completion;
    $courseid = $data->courseid;

    if ($resetcompletion) { // Reset completion and grade since they are related.
        $DB->delete_records_select(
            'interactivevideo_completion',
            'cmid IN (SELECT id FROM {interactivevideo} WHERE course = :courseid)',
            ['courseid' => $courseid]
        );

        // Delete interactivevideo_log.
        $DB->delete_records_select(
            'interactivevideo_log',
            'cmid IN (SELECT id FROM {interactivevideo} WHERE course = :courseid)',
            ['courseid' => $courseid]
        );

        // Delete interactivevideo associated files in text1, text2, text3 and attachments areas.
        $fs = get_file_storage();
        // Get context ids for all interactivevideo instances in the course.
        $coursemoduleids = $DB->get_fieldset_select(
            'course_modules',
            'id',
            'module = :module AND course = :course',
            ['module' => $DB->get_field('modules', 'id', ['name' => 'interactivevideo']), 'course' => $courseid]
        );

        $contextids = $DB->get_fieldset_select(
            'context',
            'id',
            'instanceid IN (' . implode(',', $coursemoduleids) . ') AND contextlevel = :contextlevel',
            ['contextlevel' => CONTEXT_MODULE]
        );

        foreach ($contextids as $contextid) {
            $fs->delete_area_files($contextid, 'mod_interactivevideo', 'text1');
            $fs->delete_area_files($contextid, 'mod_interactivevideo', 'text2');
            $fs->delete_area_files($contextid, 'mod_interactivevideo', 'text3');
            $fs->delete_area_files($contextid, 'mod_interactivevideo', 'attachments');
        }

        // Get all related modules and reset their grades.
        $interactivevideos = $DB->get_records('interactivevideo', ['course' => $courseid]);
        foreach ($interactivevideos as $interactivevideo) {
            interactivevideo_grade_item_update($interactivevideo, 'reset');
        }

        $status[] = [
            'component' => get_string('modulenameplural', 'interactivevideo'),
            'item' => get_string('resetcompletion', 'interactivevideo'),
            'error' => false,
        ];
    }

    if ($data->reset_gradebook_grades) {
        $interactivevideos = $DB->get_records('interactivevideo', ['course' => $courseid]);
        foreach ($interactivevideos as $interactivevideo) {
            interactivevideo_grade_item_update($interactivevideo, 'reset');
        }

        $status[] = [
            'component' => get_string('modulenameplural', 'interactivevideo'),
            'item' => get_string('resetgrades', 'interactivevideo'),
            'error' => false,
        ];
    }

    return $status;
}

/**
 * Get content of the interaction.
 *
 * @param mixed $arg
 */
function interactivevideo_output_fragment_getcontent($arg) {
    $prop = json_decode($arg['prop']);
    $class = $prop->class;

    if (!class_exists($class)) {
        return json_encode($arg);
    }
    $contenttype = new $class($arg);
    return $contenttype->get_content($arg);
}
