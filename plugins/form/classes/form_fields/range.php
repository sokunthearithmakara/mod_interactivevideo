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
 * Configuration form for adding/editing form element "range"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

 namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element "range"
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class range extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->default = $this->optional_param('default', null, PARAM_FLOAT);
        $data->minlength = $this->optional_param('minlength', null, PARAM_FLOAT);
        $data->maxlength = $this->optional_param('maxlength', null, PARAM_FLOAT);
        $data->step = $this->optional_param('step', null, PARAM_FLOAT);
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
        // Default.
        $mform->addElement(
            'text',
            'default',
            get_string('default', 'ivplugin_form'),
            ['size' => 100]
        );
        $mform->setType('default', PARAM_FLOAT);
        $mform->addRule('default', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client', true);
        $mform->addRule('default', get_string('required'), 'required', null, 'client', true);
        $mform->setDefault('default', 0);

        // Min.
        $mform->addElement('text', 'minlength', get_string('minlength', 'ivplugin_form'));
        $mform->setType('minlength', PARAM_FLOAT);
        $mform->addRule('minlength', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client', true);
        $mform->addRule('minlength', get_string('required'), 'required', null, 'client', true);
        $mform->setDefault('minlength', 0);
        // Max.
        $mform->addElement('text', 'maxlength', get_string('maxlength', 'ivplugin_form'));
        $mform->setType('maxlength', PARAM_FLOAT);
        $mform->addRule('maxlength', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client', true);
        $mform->addRule('maxlength', get_string('required'), 'required', null, 'client', true);
        $mform->setDefault('maxlength', 5);
        // Step.
        $mform->addElement('text', 'step', get_string('rangestep', 'ivplugin_form'));
        $mform->setType('step', PARAM_FLOAT);
        $mform->addRule('step', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client', true);
        $mform->addRule('step', get_string('required'), 'required', null, 'client', true);
        $mform->setDefault('step', 1);
        $mform->addHelpButton('step', 'rangestep', 'ivplugin_form');

        $this->set_display_vertical();
    }
}
