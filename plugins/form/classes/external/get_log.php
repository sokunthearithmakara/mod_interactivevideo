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

namespace ivplugin_form\external;

use external_function_parameters;
use external_single_structure;
use external_api;
use external_value;

defined('MOODLE_INTERNAL') || die;

require_once("{$CFG->libdir}/externallib.php");
/**
 * Class get_log
 *
 * @package    ivplugin_form
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_log extends external_api {
    /**
     * Describes the parameters for ivplugin_form_get_log
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User id'),
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'contextid' => new external_value(PARAM_INT, 'Module context id'),
            'annotationid' => new external_value(PARAM_INT, 'Annotation id'),
        ]);
    }

    /**
     * Implementation of web service ivplugin_form_get_log
     *
     * @param int $userid User id
     * @param int $cmid Course module id
     * @param int $contextid Module context id
     * @param int $annotationid Annotation id
     * @return array
     */
    public static function execute($userid, $cmid, $contextid, $annotationid): array {
        global $DB, $CFG;
        $params = self::validate_parameters(self::execute_parameters(), [
            'userid' => $userid,
            'cmid' => $cmid,
            'contextid' => $contextid,
            'annotationid' => $annotationid,
        ]);

        require_once($CFG->libdir . '/filelib.php');

        $record = $DB->get_record('interactivevideo_log', ['userid' => $userid, 'cmid' => $cmid, 'annotationid' => $annotationid]);
        if ($record) {
            $record->text1 = file_rewrite_pluginfile_urls(
                str_replace('\\/', '/', $record->text1),
                'pluginfile.php',
                $contextid,
                'mod_interactivevideo',
                'text1',
                $record->id
            );
            $record->text2 = file_rewrite_pluginfile_urls(
                str_replace('\\/', '/', $record->text2),
                'pluginfile.php',
                $contextid,
                'mod_interactivevideo',
                'text2',
                $record->id
            );
            $record->text3 = file_rewrite_pluginfile_urls(
                str_replace('\\/', '/', $record->text3),
                'pluginfile.php',
                $contextid,
                'mod_interactivevideo',
                'text3',
                $record->id
            );
        }

        return [
            'record' => json_encode($record),
        ];
    }

    /**
     * Describes the return value for ivplugin_form_get_log
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'record' => new external_value(PARAM_RAW, 'The log record'),
        ]);
    }
}
