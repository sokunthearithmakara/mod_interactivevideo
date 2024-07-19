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
 * TODO describe file interactions
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/locallib.php');

// Course module id.
$id = optional_param('id', 0, PARAM_INT);

// Activity instance id.
$i = optional_param('i', 0, PARAM_INT);

if ($id) {
    $cm = get_coursemodule_from_id('interactivevideo', $id, 0, false, MUST_EXIST);
    $course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
    $moduleinstance = $DB->get_record('interactivevideo', ['id' => $cm->instance], '*', MUST_EXIST);
} else {
    $moduleinstance = $DB->get_record('interactivevideo', ['id' => $i], '*', MUST_EXIST);
    $course = $DB->get_record('course', ['id' => $moduleinstance->course], '*', MUST_EXIST);
    $cm = get_coursemodule_from_instance('interactivevideo', $moduleinstance->id, $course->id, false, MUST_EXIST);
}

require_login($course, true, $cm);

$modulecontext = context_module::instance($cm->id);

// Check if the user has capability to edit the interactions.
if (!has_capability('mod/interactivevideo:edit', $modulecontext)) {
    redirect(
        new moodle_url('/course/view.php', ['id' => $course->id]),
        get_string('nopermissiontoaddinteractions', 'mod_interactivevideo'),
        null,
        \core\output\notification::NOTIFY_ERROR
    );
}
// Prepare strings for js files using string manager.
$subplugins = get_config('mod_interactivevideo', 'enablecontenttypes');
$subplugins = explode(',', $subplugins);
$stringman = get_string_manager();
foreach ($subplugins as $subplugin) {
    $strings = $stringman->load_component_strings('ivplugin_' . $subplugin, current_language());
    $PAGE->requires->strings_for_js(array_keys($strings), 'ivplugin_' . $subplugin);
}

$strings = $stringman->load_component_strings('mod_interactivevideo', current_language());
$PAGE->requires->strings_for_js(array_keys($strings), 'mod_interactivevideo');
$PAGE->requires->jquery_plugin('ui-css');
$PAGE->activityheader->disable();

$PAGE->set_url('/mod/interactivevideo/interactions.php', ['id' => $cm->id]);
$PAGE->set_title(format_string($moduleinstance->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($modulecontext);
$PAGE->set_pagelayout('embedded');
$PAGE->add_body_class('page-interactions');

$contentoptions = interactivevideo_util::get_all_activitytypes();

// Sort the content types by title.
usort($contentoptions, function ($a, $b) {
    return strcmp($a['title'], $b['title']);
});

$coursecontext = context_course::instance($course->id);

// Check if the interactivevideo is attempted by users.
$attempted = $DB->record_exists_select('interactivevideo_completion', 'cmid = ? AND completionpercentage > 0 ', [$cm->instance]);

// Use Bootstrap icons instead of fontawesome icons to avoid issues fontawesome icons support in Moodle 4.1.
$PAGE->requires->css(new moodle_url('/mod/interactivevideo/libraries/bootstrap-icons/bootstrap-icons.min.css'));

echo $OUTPUT->header();

if ($moduleinstance->source == 'url') {
    $url = $moduleinstance->videourl;
} else {
    $fs = get_file_storage();
    $files = $fs->get_area_files(
        $modulecontext->id,
        'mod_interactivevideo',
        'video',
        0,
        'id',
    );
    $file = reset($files);
    $url = moodle_url::make_pluginfile_url(
        $file->get_contextid(),
        $file->get_component(),
        $file->get_filearea(),
        $file->get_itemid(),
        $file->get_filepath(),
        $file->get_filename()
    )->out();
    $moduleinstance->type = 'html5video';
}

// Display page navigation.
$datafortemplate = [
    "returnurl" => new moodle_url('/course/view.php', ['id' => $course->id]),
    "canedit" => has_capability('mod/interactivevideo:edit', $modulecontext),
    "completion" => '<button class="btn btn-primary text-uppercase" type="button"
      id="addcontent" data-toggle="modal" aria-expanded="false" data-target="#contentmodal">
      <i class="bi bi-plus-lg mr-2"></i>'
        . get_string('add', 'mod_interactivevideo') . '</button>' . ($attempted ? '<button class="btn btn-sm ml-2"
          type="button" data-toggle="popover" data-html="true" data-content=\'' .
            get_string('interactionscannotbeedited', 'mod_interactivevideo') . '\'>
         <i class="bi bi-exclamation-circle-fill text-warning" style="font-size: 25px"></i></button>' : ''),
    "manualcompletion" => 1,
    "settingurl" => has_capability('mod/interactivevideo:edit', $modulecontext)
        ? new moodle_url('/course/modedit.php', ['update' => $cm->id]) : '',
    "reporturl" => has_capability('mod/interactivevideo:viewreport', $modulecontext)
        ? new moodle_url('/mod/interactivevideo/report.php', ['id' => $cm->id]) : '',
    "interactionsurl" => '',
    "useravatar" => $OUTPUT->user_picture($USER, ['class' => 'userpicture ml-2', 'size' => 35]),
    "viewurl" => new moodle_url('/mod/interactivevideo/view.php', ['id' => $cm->id]),
    "backupurl" => has_capability('moodle/backup:backupactivity', $modulecontext) ? new moodle_url(
        '/backup/backup.php',
        ['cm' => $cm->id, 'id' => $course->id]
    ) : '',
    "restoreurl" => has_capability('moodle/restore:restoreactivity', $modulecontext) ? new moodle_url(
        '/backup/restorefile.php',
        ['contextid' => $modulecontext->id]
    ) : '',
];

echo $OUTPUT->render_from_template('mod_interactivevideo/pagenav', $datafortemplate);

$datafortemplate = [
    "contenttype" => $contentoptions,
    "html5" => $moduleinstance->type == 'html5video',
    "title" => format_string($moduleinstance->name),
];

echo $OUTPUT->render_from_template('mod_interactivevideo/editor', $datafortemplate);

$PAGE->requires->js_call_amd(
    'mod_interactivevideo/editannotation',
    'init',
    [
        $url,
        $cm->id,
        $cm->instance,
        $course->id,
        $moduleinstance->start,
        $moduleinstance->end,
        $coursecontext->id,
        $moduleinstance->type,
    ]
);

echo $OUTPUT->footer();
