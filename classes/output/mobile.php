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

namespace mod_interactivevideo\output;

use context_module;
use moodle_url;

/**
 * Class mobile
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class mobile {
    public static function mobile_module_view($args) {
        global $OUTPUT, $DB, $CFG;
        $args = (object)$args;
        $cm = get_coursemodule_from_id('interactivevideo', $args->cmid);

        require_login($args->courseid, false, $cm, true, true);

        $context = context_module::instance($cm->id);

        require_capability('mod/interactivevideo:view', $context);

        $url = new moodle_url('/mod/interactivevideo/view.php', [
            'id' => $cm->id,
            'iframe' => 1,
            'token' => 'abc',
        ]);

        return [
            'templates' => [
                [
                    'id' => 'main',
                    'html' => '<iframe src="' . $url . '" width="100%" height="100%"></iframe>',
                ],
            ],
        ];
    }
}
