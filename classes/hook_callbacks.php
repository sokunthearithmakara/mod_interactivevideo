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

namespace mod_interactivevideo;

/**
 * Class hook_callbacks
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * Add messaging widgets after the main region content.
     *
     * @param \core\hook\output\after_standard_main_region_html_generation $hook
     */
    public static function launch_player_modal(\core\hook\output\after_standard_main_region_html_generation $hook): void {
        global $PAGE;
        if (strpos($PAGE->bodyclasses, 'path-course-view') === false) {
            return;
        }
        $PAGE->requires->js_call_amd('mod_interactivevideo/launch', 'init');
    }
}
