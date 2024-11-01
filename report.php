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
 * Report for interactivevideo module
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/locallib.php');

$id = required_param('id', PARAM_INT); // Course_module ID.

$cm = get_coursemodule_from_id('interactivevideo', $id,  0,  false,  MUST_EXIST);
$moduleinstance = $DB->get_record('interactivevideo', ['id' => $cm->instance], '*', MUST_EXIST);
$group = optional_param('group', 0, PARAM_INT);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);

$context = context_module::instance($cm->id);

if (!has_capability('mod/interactivevideo:viewreport', $context)) {
    // Redirect to course view.
    redirect(
        new moodle_url('/course/view.php', ['id' => $course->id]),
        get_string('notaccessreport', 'mod_interactivevideo'),
        5,
        \core\output\notification::NOTIFY_ERROR
    );
}

require_login($course, true, $cm);
if ($moduleinstance->displayoptions) {
    $moduleinstance->displayoptions = json_decode($moduleinstance->displayoptions, true);
} else {
    $moduleinstance->displayoptions = [];
}
if (isset($moduleinstance->displayoptions['theme']) && $moduleinstance->displayoptions['theme'] != '') {
    $PAGE->force_theme($moduleinstance->displayoptions['theme']);
}
// External css.
$PAGE->requires->css(new moodle_url($CFG->wwwroot . '/mod/interactivevideo/libraries/DataTables/datatables.min.css'));

$PAGE->set_url('/mod/interactivevideo/report.php', ['id' => $cm->id, 'group' => $group]);
$PAGE->set_title(get_string('reportfor', 'interactivevideo', format_string($moduleinstance->name)));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);
$PAGE->set_pagelayout('embedded');
$PAGE->activityheader->disable();

$stringman = get_string_manager();
// Get all enabled content types.
$contenttypes = interactivevideo_util::get_all_activitytypes();
foreach ($contenttypes as $subplugin) {
    $stringcomponent = $subplugin['stringcomponent'];
    $strings = $stringman->load_component_strings($stringcomponent, current_language());
    $PAGE->requires->strings_for_js(array_keys($strings), $stringcomponent);
}

$strings = $stringman->load_component_strings('mod_interactivevideo', current_language());
$PAGE->requires->strings_for_js(array_keys($strings), 'mod_interactivevideo');

// Get all interactions for moduleid.
$items = interactivevideo_util::get_items($moduleinstance->id, $context->id, false);
// Remove items that are not in the enabled content types.
$items = array_filter($items, function ($item) use ($contenttypes) {
    return in_array($item->type, array_map(function ($contenttype) {
        return $contenttype["name"];
    }, $contenttypes));
});

// Order the items by timestamp.
usort($items, function ($a, $b) {
    return $a->timestamp - $b->timestamp;
});

// Get skip segments.
$skip = array_filter($items, function ($item) {
    return $item->type === 'skipsegment';
});

$items = array_map(function ($item) use ($contenttypes) {
    $relatedcontenttype = array_filter($contenttypes, function ($contenttype) use ($item) {
        return $contenttype["name"] == $item->type;
    });
    $relatedcontenttype = array_values($relatedcontenttype)[0];

    $item->prop = json_encode($relatedcontenttype);
    $item->typetitle = $relatedcontenttype["title"];
    $item->icon = $relatedcontenttype["icon"];

    return $item;
}, $items);

$allitems = $items;

// Get content types that hasreport = true.
$reportables = array_filter($contenttypes, function ($contenttype) {
    return $contenttype["hasreport"];
});

$reportables = array_map(function ($reportable) {
    return $reportable["name"];
}, $reportables);

$reportables = array_values($reportables);

// Filter items that are within the time limit start and end (if end time is set).
$contenttypenames = array_map(function ($contenttype) {
    return $contenttype["name"];
}, $contenttypes);
$items = array_filter($items, function ($item) use ($moduleinstance, $skip, $contenttypenames, $reportables) {
    // Remove items that has no completion or hasreport = false.
    if (!in_array($item->type, $reportables)) {
        return false;
    }

    if ($item->hascompletion == 0 && $item->timestamp >= 0) {
        return false;
    }

    // Remove items that are not within the time limit.
    if (($item->timestamp < $moduleinstance->start || $item->timestamp > $moduleinstance->end) && $item->timestamp >= 0) {
        return false;
    }

    // Remove items that are within the skip segment.
    foreach ($skip as $ss) {
        if ($item->timestamp > $ss->timestamp && $item->timestamp < $ss->title) {
            return false;
        }
    }

    return true;
});

$itemids = array_map(function ($item) {
    return $item->id;
}, $items);

// Use Bootstrap icons instead of fontawesome icons to avoid issues fontawesome icons support in Moodle 4.1.
$PAGE->requires->css(new moodle_url('/mod/interactivevideo/libraries/bootstrap-icons/bootstrap-icons.min.css'));

echo $OUTPUT->header();
$primary = new core\navigation\output\primary($PAGE);
$renderer = $PAGE->get_renderer('core');
$primarymenu = $primary->export_for_template($renderer);
$datafortemplate = [
    "cmid" => $cm->id,
    "returnurl" => new moodle_url('/course/view.php', ['id' => $course->id]),
    "completion" => '<h4 class="mb-0 border-left border-danger pl-3 text-truncate">'
        . format_string($moduleinstance->name) . '</h4>',
    "manualcompletion" => 1,
    "settingurl" => has_capability('mod/interactivevideo:edit', $context)
        ? new moodle_url('/course/modedit.php', ['update' => $cm->id]) : '',
    "reporturl" => '',
    "interactionsurl" => has_capability('mod/interactivevideo:edit', $context)
        ? new moodle_url('/mod/interactivevideo/interactions.php', ['id' => $cm->id]) : '',
    "useravatar" => $primarymenu['user'],
    "viewurl" => new moodle_url('/mod/interactivevideo/view.php', ['id' => $cm->id]),
    "backupurl" => has_capability('moodle/backup:backupactivity', $context) ? new moodle_url(
        '/backup/backup.php',
        ['cm' => $cm->id, 'id' => $course->id]
    ) : '',
    "restoreurl" => has_capability('moodle/restore:restoreactivity', $context) ? new moodle_url(
        '/backup/restorefile.php',
        ['contextid' => $context->id]
    ) : '',
];


echo $OUTPUT->render_from_template('mod_interactivevideo/pagenav', $datafortemplate);

echo $OUTPUT->render_from_template('mod_interactivevideo/blocksettingshack', []);

echo '<textarea class="d-none" id="itemsdata">' . json_encode(array_values($allitems)) . '</textarea>';
// Get total xp from $items.
$totalxp = array_reduce($items, function ($carry, $item) {
    return $carry + $item->xp;
}, 0);

echo '<div id="reporttable" class="p-3" style="margin-top: 70px;">';
groups_print_activity_menu($cm, $PAGE->url);
echo html_writer::start_tag('table', [
    'id' => 'completiontable',
    'class' => 'table table-sm table-bordered table-striped w-100',
]);
echo '<thead class="sticky-top bg-white">';
echo '<tr>';
echo '<th id="id">' . get_string('id', 'mod_interactivevideo') . '</th>';
echo '<th id="participant" class="bg-white sticky-left-0">' . get_string('participant', 'mod_interactivevideo') . '</th>';
echo '<th id="firstname">' . get_string('firstname') . '</th>';
echo '<th id="lastname">' . get_string('lastname') . '</th>';
echo '<th id="email">' . get_string('email') . '</th>';
echo '<th id="timecreated">' . get_string('timestarted', 'mod_interactivevideo') . '</th>';
echo '<th id="timecompleted">' . get_string('timecompleted', 'mod_interactivevideo') . '</th>';
echo '<th id="completionpercentage">' . get_string('completionpercentage', 'mod_interactivevideo') . '</th>';
echo '<th id="xp">' . get_string('xp', 'mod_interactivevideo') . '<br>/' . $totalxp . '</th>';
foreach ($items as $item) {
    $i = $item->icon;
    echo '<th class="rotate" id="item-' . $item->id . '" data-item="' . $item->id
        . '" data-type="' . $item->type . '"><div><i title="' . $item->typetitle . '" class="fa-fw fa mx-1 ' . $i
        . '"></i><a href="javascript:void(0)"
      data-toggle="tooltip" data-trigger="focus" data-title="' . format_string($item->title)
        . '">' . format_string($item->title) . '</a></div></th>';
}
echo '</tr>';
echo html_writer::end_tag('thead');
echo html_writer::start_tag('tbody');
echo html_writer::end_tag('tbody');
echo html_writer::end_tag('table');
echo '</div>';

if ($moduleinstance->source == 'url') {
    $url = $moduleinstance->videourl;
} else {
    $fs = get_file_storage();
    $files = $fs->get_area_files(
        $context->id,
        'mod_interactivevideo',
        'video',
        0,
        'filesize DESC',
    );
    $file = reset($files);
    if (!$file) {
        $url = '';
    } else {
        $url = moodle_url::make_pluginfile_url(
            $file->get_contextid(),
            $file->get_component(),
            $file->get_filearea(),
            $file->get_itemid(),
            $file->get_filepath(),
            $file->get_filename()
        )->out();
    }
    $moduleinstance->type = 'html5video';
}

$PAGE->requires->js_call_amd('mod_interactivevideo/report', "init", [
    $cm->instance,
    $group,
    $moduleinstance->grade,
    $itemids,
    $moduleinstance->completionpercentage,
    $url,
    $moduleinstance->type,
    $cm->id,
    $course->id,
    $moduleinstance->start,
    $moduleinstance->end,
]);

echo $OUTPUT->footer();
