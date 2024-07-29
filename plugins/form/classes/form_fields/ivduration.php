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
 * Class ivduration
 *
 * @package    ivplugin_form
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/lib/form/duration.php');

/**
 * Class ivduration
 */
class MoodleQuickForm_ivduration extends MoodleQuickForm_duration {
    /** @var array associative array of time units (days, hours, minutes, seconds) */
    private $_units = null;
    /**
     * Returns time associative array of unit length.
     *
     * @return array unit length in seconds => string unit name.
     */
    public function get_units() {
        if (is_null($this->_units)) {
            $this->_units = [
                'years' => get_string('years', 'ivplugin_form'),
                'months' => get_string('months', 'ivplugin_form'),
                'weeks' => get_string('weeks', 'ivplugin_form'),
                'days' => get_string('days', 'ivplugin_form'),
                'hours' => get_string('hours', 'ivplugin_form'),
                'minutes' => get_string('minutes', 'ivplugin_form'),
                'seconds' => get_string('seconds', 'ivplugin_form'),
            ];
        }
        return $this->_units;
    }
    /**
     * Output a timestamp. Give it the name of the group.
     * Override of standard quickforms method.
     *
     * @param  array $submitvalues
     * @param  bool  $assoc  whether to return the value as associative array
     * @return array field name => value. The value is the time interval in seconds.
     */
    public function exportvalue(&$submitvalues, $assoc = false) {
        // Get the values from all the child elements.
        $valuearray = [];
        foreach ($this->_elements as $element) {
            $thisexport = $element->exportValue($submitvalues[$this->getName()], true);
            if (!is_null($thisexport)) {
                $valuearray += $thisexport;
            }
        }

        // Convert the value to an integer number of seconds.
        if (empty($valuearray)) {
            return null;
        }
        if ($this->_options['optional'] && empty($valuearray['enabled'])) {
            return $this->_prepareValue(0, $assoc);
        }
        return $this->_prepareValue(
            $valuearray['number'] .' '. $valuearray['timeunit'],
            $assoc
        );
    }
}
