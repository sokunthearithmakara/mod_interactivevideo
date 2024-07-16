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
 * Configuration form for adding/editing form element "text"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

 namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element "text"
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class text extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->default = $this->optional_param('default', null, PARAM_TEXT);
        $data->placeholder = $this->optional_param('placeholder', null, PARAM_TEXT);
        $data->regexerror = $this->optional_param('regexerror', null, PARAM_TEXT);
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
        $mform->addElement('text', 'default', get_string('default', 'ivplugin_form'));
        $mform->setType('default', PARAM_TEXT);

        // Placeholder.
        $mform->addElement('text', 'placeholder', get_string('placeholder', 'ivplugin_form'));
        $mform->setType('placeholder', PARAM_TEXT);

        // Min length.
        $mform->addElement('text', 'minlength', get_string('minlength', 'ivplugin_form'));
        $mform->setType('minlength', PARAM_INT);
        $mform->addRule('minlength', get_string('numeric', 'ivplugin_form'), 'numeric', null, 'client', true);

        // Max length.
        $mform->addElement('text', 'maxlength', get_string('maxlength', 'ivplugin_form'));
        $mform->setType('maxlength', PARAM_INT);
        $mform->addRule('maxlength', get_string('numeric', 'ivplugin_form'), 'numeric', null, 'client', true);

        // Regex.
        $mform->addElement('text', 'regex', get_string('regex', 'ivplugin_form'));
        $mform->setType('regex', PARAM_TEXT);

        // Error message.
        $mform->addElement('text', 'regexerror', get_string('regexerror', 'ivplugin_form'));
        $mform->setType('regexterror', PARAM_TEXT);
        $mform->hideIf('regexerror', 'regex', 'eq', '');

        $this->set_display_vertical();
    }
}
