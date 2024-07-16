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
 * AJAX script for interactivevideo module
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once('../../config.php');
require_once('locallib.php');

$action = required_param('action', PARAM_TEXT);
require_sesskey();
require_login();

switch ($action) {
    case 'get_items':
        $id = required_param('id', PARAM_INT);
        $contextid = required_param('contextid', PARAM_INT);
        $annotations = interactivevideo_util::get_items($id, $contextid);
        $annotations = array_values($annotations);
        echo json_encode($annotations);
        break;
    case 'get_item':
        $id = required_param('id', PARAM_INT);
        $contextid = required_param('contextid', PARAM_INT);
        $item = interactivevideo_util::get_item($id, $contextid);
        echo json_encode($item);
        break;
    case 'copy_item':
        $id = required_param('id', PARAM_INT);
        $contextid = required_param('contextid', PARAM_INT);
        $item = interactivevideo_util::copy_item($id, $contextid);
        echo json_encode($item);
        break;
    case 'get_content':
        $content = required_param('content', PARAM_RAW);
        $id = required_param('id', PARAM_INT);
        $format = FORMAT_HTML;
        $contextid = required_param('contextid', PARAM_INT);
        // Process the content from editor for displaying.
        require_once($CFG->libdir . '/filelib.php');
        $content = file_rewrite_pluginfile_urls($content, 'pluginfile.php', $contextid, 'mod_interactivevideo', 'content', $id);
        $content = interactivevideo_util::format_content($content, $format, $contextid);
        echo $content;
        break;
    case 'delete_item':
        $id = required_param('id', PARAM_INT);
        $contextid = required_param('contextid', PARAM_INT);
        $item = interactivevideo_util::get_item($id, $contextid);
        $DB->delete_records('annotationitems', ['id' => $id]);
        $fs = get_file_storage();
        $fs->delete_area_files($contextid, 'mod_interactivevideo', 'content', $id);
        echo $id;
        break;
    case 'quickeditfield':
        $id = required_param('id', PARAM_INT);
        $field = required_param('field', PARAM_TEXT);
        $value = required_param('value', PARAM_TEXT);
        $contextid = required_param('contextid', PARAM_INT);
        $draftitemid = optional_param('draftitemid', 0, PARAM_INT);
        $item = interactivevideo_util::quick_edit_field($id, $field, $value, $contextid, $draftitemid);
        echo json_encode($item);
        break;
    case 'get_progress':
        $id = required_param('id', PARAM_INT);
        $userid = required_param('uid', PARAM_INT);
        $progress = interactivevideo_util::get_progress($id, $userid);
        echo json_encode($progress);
        break;
    case 'save_progress':
        $id = required_param('id', PARAM_INT);
        $userid = required_param('uid', PARAM_INT);
        $c = required_param('c', PARAM_INT);
        $percentage = required_param('percentage', PARAM_FLOAT);
        $completeditems = required_param('completeditems', PARAM_TEXT);
        $g = required_param('g', PARAM_FLOAT);
        $ginstance = required_param('gradeiteminstance', PARAM_INT);
        $xp = required_param('xp', PARAM_INT);
        $progress = interactivevideo_util::save_progress($id, $userid, $completeditems, $c, $percentage, $g, $ginstance, $xp);
        echo json_encode($progress);
        break;
    case 'getreportdatabygroup':
        $groupid = required_param('groupid', PARAM_INT);
        $cmid = required_param('cmid', PARAM_INT);
        $cxtid = required_param('cxtid', PARAM_INT);
        echo json_encode(array_values(interactivevideo_util::get_report_data_by_group($cmid, $groupid, $cxtid)));
        break;
    case 'getallcontenttypes':
        echo json_encode(interactivevideo_util::get_all_activitytypes());
        break;
    case 'getoembedinfo':
        $url = required_param('url', PARAM_URL);
        // Send get request to the URL.
        $response = file_get_contents($url);
        if (!$response) {
            require_once($CFG->libdir . '/filelib.php');
            $curl = new curl(['ignoresecurity' => true]);
            $curl->setHeader('Content-Type: application/json');

            $response = $curl->get($url);
        }
        echo $response;
        break;
    case 'get_log':
        $userid = required_param('userid', PARAM_INT);
        $cmid = required_param('cmid', PARAM_INT);
        $annotationid = required_param('annotationid', PARAM_INT);
        $contextid = required_param('contextid', PARAM_INT);
        $log = interactivevideo_util::get_log($userid, $cmid, $annotationid, $contextid);
        echo json_encode($log);
        break;
    case 'get_logs_by_userids':
        $userids = required_param('userids', PARAM_RAW);
        $annotationid = required_param('annotationid', PARAM_INT);
        $contextid = required_param('contextid', PARAM_INT);
        $log = interactivevideo_util::get_logs_by_userids($userids, $annotationid, $contextid);
        echo json_encode($log);
        break;
    case 'format_text':
        $text = required_param('text', PARAM_RAW);
        $contextid = required_param('contextid', PARAM_INT);
        echo interactivevideo_util::format_content($text, 1, $contextid);
        break;
    default:
        throw new moodle_exception('invalid', 'error', '', $action);
}
