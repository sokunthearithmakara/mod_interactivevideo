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
 * Class implementing WS ivplugin_contentbank_getitem
 *
 * @package    ivplugin_contentbank
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace ivplugin_contentbank\external;

use external_function_parameters;
use external_single_structure;
use external_api;
use external_value;

defined('MOODLE_INTERNAL') || die;

require_once($CFG->libdir . '/externallib.php');

/**
 * Implementation of web service ivplugin_contentbank_getitem
 *
 * @package    ivplugin_contentbank
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class getitem extends external_api {

    /**
     * Describes the parameters for ivplugin_contentbank_getitem
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'id' => new external_value(PARAM_INT, 'Content bank item id'),
            'contextid' => new external_value(PARAM_INT, 'Course context id'),
        ]);
    }

    /**
     * Implementation of web service ivplugin_contentbank_getitem
     *
     * @param mixed $param1
     */
    public static function execute($id, $contextid) {
        // Parameter validation.
        $params = self::validate_parameters(self::execute_parameters(), [
            'id' => $id,
            'contextid' => $contextid,
        ]);

        require_login();
        $item = \ivplugin_contentbank\main::get_contentbank_content($id, $contextid);
        return [
            'item' => $item,
        ];
    }

    /**
     * Describe the return structure for ivplugin_contentbank_getitem
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'item' => new external_value(PARAM_RAW, 'The content of the content bank item'),
        ]);
    }
}
