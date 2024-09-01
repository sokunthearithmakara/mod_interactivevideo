<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Configuration form for adding/editing form element "duration"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

 namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element "duration"
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class duration extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->name = $this->optional_param('name', null, PARAM_TEXT);
        $data->units = $this->optional_param('units', null, PARAM_RAW);
        $this->set_data($data);
    }

    /**
     * Definition
     *
     * @param null $arg
     */
    public function definition($arg = null) {
        $mform = parent::definition([
            'helptext' => true,
            'required' => true,
        ]);

        // Duration units.
        $durationunits = $mform->addElement('select', 'units', get_string('durationunits', 'ivplugin_form'), [
            'years' => get_string('years', 'ivplugin_form'),
            'months' => get_string('months', 'ivplugin_form'),
            'weeks' => get_string('weeks', 'ivplugin_form'),
            'days' => get_string('days', 'ivplugin_form'),
            'hours' => get_string('hours', 'ivplugin_form'),
            'minutes' => get_string('minutes', 'ivplugin_form'),
            'seconds' => get_string('seconds', 'ivplugin_form'),
            'semesters' => get_string('semesters', 'ivplugin_form'),
            'terms' => get_string('terms', 'ivplugin_form'),
            'quarters' => get_string('quarters', 'ivplugin_form'),
            'fortnights' => get_string('fortnights', 'ivplugin_form'),
            'decades' => get_string('decades', 'ivplugin_form'),
            'periods' => get_string('periods', 'ivplugin_form'),
            'sessions' => get_string('sessions', 'ivplugin_form'),
        ]);
        $durationunits->setMultiple(true);

        $this->set_display_vertical();
    }
}
