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
 * Configuration form for adding/editing form element "editor"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element "editor"
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class editor extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->default = $this->optional_param('default', null, PARAM_RAW);
        $data->height = $this->optional_param('height', null, PARAM_INT);
        $data->allowfiles = $this->optional_param('allowfiles', null, PARAM_INT);
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
        $mform->addElement('editor', 'default', get_string('default', 'ivplugin_form'), ['rows' => 4], $this->editor_options());
        $mform->setType('default', PARAM_RAW);

        // Height.
        $mform->addElement('text', 'height', get_string('height', 'ivplugin_form'));
        $mform->setType('height', PARAM_INT);
        $mform->setDefault('height', 10);
        $mform->addRule(
            'height',
            get_string('mustbegreaterthan', 'ivplugin_form', 10),
            'regex',
            '/^[5-9]|[1-9][0-9]+$/i',
            'client',
            true
        );
        $mform->addRule(
            'height',
            get_string('required'),
            'required',
            null,
            'client',
            true
        );

        $mform->addElement('advcheckbox', 'allowfiles', '', get_string('allowfiles', 'ivplugin_form'));
        $mform->setDefault('allowfiles', 1);
        $mform->setType('allowfiles', PARAM_INT);

        // Min length.
        $mform->addElement('text', 'minlength', get_string('minwords', 'ivplugin_form'));
        $mform->setType('minlength', PARAM_INT);
        $mform->addRule('minlength', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client', true);

        // Max length.
        $mform->addElement('text', 'maxlength', get_string('maxwords', 'ivplugin_form'));
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
