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
 * Configuration form for adding/editing form element "textarea"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element "textarea"
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class textarea extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->default = $this->optional_param('default', null, PARAM_TEXT);
        $data->placeholder = $this->optional_param('placeholder', null, PARAM_TEXT);
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

        $mform->addElement(
            'textarea',
            'default',
            get_string('default', 'ivplugin_form'),
            ['oninput' => 'this.style.height = "";this.style.height = this.scrollHeight + 3 + "px"']
        );
        $mform->setType('default', PARAM_TEXT);

        $mform->addElement('text', 'placeholder', get_string('placeholder', 'ivplugin_form'));
        $mform->setType('placeholder', PARAM_TEXT);

        $mform->addElement('text', 'minlength', get_string('minchars', 'ivplugin_form'));
        $mform->setType('minlength', PARAM_INT);
        $mform->addRule('minlength', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client', true);

        $mform->addElement('text', 'maxlength', get_string('maxchars', 'ivplugin_form'));
        $mform->setType('maxlength', PARAM_INT);
        $mform->addRule('maxlength', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client', true);

        $this->set_display_vertical();
    }

    /**
     * Validation
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files) {
        $errors = parent::validation($data, $files);

        if ($data['minlength'] > $data['maxlength'] && ($data['maxlength'] > 0 || $data['minlength'] > 0)) {
            $errors['minlength'] = get_string('minvaluemustbelessthanmaxvalue', 'ivplugin_form', $data['maxlength']);
        }

        return $errors;
    }
}
