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
 * Configuration form for adding/editing form element "advcheckbox"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element "advcheckbox"
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class advcheckbox extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->name = $this->optional_param('name', null, PARAM_TEXT);
        $data->options = $this->optional_param('options', null, PARAM_TEXT);
        $defaults = $this->optional_param('default', null, PARAM_RAW);
        if (is_array($defaults)) {
            $defaultstrings = implode(',', array_keys($defaults));
        } else {
            $defaultstrings = $defaults;
        }
        $data->default = $defaultstrings;
        $this->set_data($data);
    }

    /**
     * Definition
     *
     * @param null $arg
     */
    public function definition($arg = null) {
        $mform = parent::definition([
            'name' => true,
            'helptext' => true,
            'required' => false,
        ]);

        // Options.
        $mform->addElement(
            'textarea',
            'options',
            get_string('options', 'ivplugin_form'),
            [
                'rows' => 4,
                'oninput' => 'this.style.height = "";this.style.height = this.scrollHeight + 3 + "px"',
                'placeholder' => 'key1=Value 1',
            ]
        );
        $mform->setType('options', PARAM_RAW);
        $mform->addRule('options', get_string('required'), 'required', null, 'client');

        // Default.
        $mform->addElement('text', 'default', get_string('default', 'ivplugin_form'));
        $mform->setType('default', PARAM_TEXT);

        $this->set_display_vertical();
    }

    /**
     * Process dynamic submission
     *
     * @return mixed
     */
    public function process_dynamic_submission() {
        $fromform = $this->get_data();
        if ($fromform->id == 0) {
            $fromform->id = time();
        }
        $default = explode(',', $fromform->default);
        if (!empty($default[0])) {
            $fromform->default = array_combine($default, $default);
        } else {
            $fromform->default = [];
        }
        $fromform->formattedlabel = format_string($fromform->label);
        return $fromform;
    }
}
