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

namespace ivplugin_form;

defined('MOODLE_INTERNAL') || die();

/**
 * Class form
 *
 * @package    ivplugin_form
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class form extends \mod_interactivevideo\form\base_form {

    /**
     * Sets data for dynamic submission
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $this->set_data($data);
    }

    /**
     * Process dynamic submission
     *
     * @return void
     */
    public function process_dynamic_submission() {
        $fromform = parent::process_dynamic_submission();

        return $fromform;
    }

    /**
     * Form definition
     *
     * @return void
     */
    public function definition() {
        $mform = &$this->_form;
        $this->standard_elements();

        $mform->addElement('text', 'title', '<i class="bi bi-quote mr-2"></i>' . get_string('title', 'mod_interactivevideo'));
        $mform->setType('title', PARAM_TEXT);
        $mform->setDefault('title', get_string('defaulttitle', 'mod_interactivevideo'));
        $mform->addRule('title', get_string('required'), 'required', null, 'client');

        // Due date&time.
        $mform->addElement(
            'date_time_selector',
            'text1',
            '<i class="bi bi-calendar-check mr-2"></i>' . get_string('duedate', 'ivplugin_form'),
            ['optional' => true]
        );

        // Set default to next week.
        $mform->setDefault('text1', time() + 7 * 24 * 3600);
        $mform->setType('text1', PARAM_RAW);

        // Include attachments and editable responses.
        $elementarray = [];
        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'char2', // Editable responses.
            '',
            get_string('editableresponseuntilduedate', 'ivplugin_form'),
            ["group" => 1],
            [0, 1]
        );
        $mform->setDefault('char2', $this->optional_param('char2', 0, PARAM_TEXT));
        $mform->addGroup($elementarray, '', '');

        $this->xp_form_field();

        $mform->addElement(
            'select',
            'completiontracking',
            '<i class="bi bi-check2-square mr-2"></i>'
                . get_string('completiontracking', 'mod_interactivevideo'),
            [
                'manual' => get_string('completionmanual', 'mod_interactivevideo'),
                'complete' => get_string('completiononformsubmit', 'ivplugin_form'),
            ]
        );
        $mform->setType('completiontracking', PARAM_TEXT);

        $this->display_options_field();
        $this->advanced_form_fields(true, true, true, true);
        $this->close_form();
    }
};
