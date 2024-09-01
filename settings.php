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
 * Settings for the interactivevideo module
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
defined('MOODLE_INTERNAL') || die;

if ($ADMIN->fulltree) {
    // Checkboxes for enabling the content types.
    $subplugins = array_keys(core_component::get_plugin_list('ivplugin'));
    $contenttypes = [];
    foreach ($subplugins as $subplugin) {
        $contenttypes[$subplugin] = get_string('pluginname', 'ivplugin_' . $subplugin);
    }
    $settings->add(new admin_setting_configmulticheckbox(
        'mod_interactivevideo/enablecontenttypes',
        get_string('enablecontenttypes', 'mod_interactivevideo'),
        get_string('enablecontenttypes_desc', 'mod_interactivevideo'),
        $contenttypes,
        $contenttypes,
    ));
    // Textarea for defining available font families.
    $settings->add(new admin_setting_configtextarea(
        'mod_interactivevideo/fontfamilies',
        get_string('fontfamilies', 'mod_interactivevideo'),
        get_string('fontfamilies_desc', 'mod_interactivevideo'),
        '',
    ));
}
