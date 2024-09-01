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

namespace ivplugin_annotation\external;
use external_function_parameters;
use external_single_structure;
use external_api;
use external_value;

defined('MOODLE_INTERNAL') || die;

require_once($CFG->libdir . '/externallib.php');
/**
 * Class add
 *
 * @package    ivplugin_annotation
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class add extends external_api {

    /**
     * Describes the parameters for ivplugin_annotation_add
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'annotationdata' => new external_value(PARAM_TEXT, 'The data of the annotation'),
        ]);
    }

    /**
     * Implementation of web service ivplugin_annotation_add
     *
     * @param int $id Annotation id
     * @param int $contextid Course context id
     * @return array
     */
    public static function execute($annotationdata) {
        global $DB;
        // Parameter validation.
        $params = self::validate_parameters(self::execute_parameters(), [
            'annotationdata' => $annotationdata,
        ]);

        require_login();
        $record = json_decode($annotationdata, true);
        $record['timecreated'] = time();
        $record['timemodified'] = time();
        $id = $DB->insert_record('interactivevideo_items', (object)$record);
        $data = $DB->get_record('interactivevideo_items', ['id' => $id]);
        $data->formattedtitle = get_string('pluginname', 'ivplugin_annotation');
        return [
            'data' => json_encode($data),
        ];
    }

    /**
     * Describes the return value for ivplugin_annotation_add
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'data' => new external_value(PARAM_TEXT, 'The data of the annotation'),
        ]);
    }
}
