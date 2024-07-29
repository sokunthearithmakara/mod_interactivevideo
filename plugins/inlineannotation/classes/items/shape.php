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

namespace ivplugin_inlineannotation\items;

/**
 * Class shape
 *
 * @package    ivplugin_inlineannotation
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class shape extends \core_form\dynamic_form {
    /**
     * Returns form context
     *
     * If context depends on the form data, it is available in $this->_ajaxformdata or
     * by calling $this->optional_param()
     *
     * @return \context
     */
    protected function get_context_for_dynamic_submission(): \context {
        $contextid = $this->optional_param('contextid', null, PARAM_INT);
        return \context::instance_by_id($contextid, MUST_EXIST);
    }

    /**
     * Checks access for dynamic submission
     */
    protected function check_access_for_dynamic_submission(): void {
        require_capability('mod/interactivevideo:addinstance', $this->get_context_for_dynamic_submission());
    }

    /**
     * Sets data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = new \stdClass();
        $data->id = $this->optional_param('id', 0, PARAM_INT);
        $data->contextid = $this->optional_param('contextid', null, PARAM_INT);
        $data->annotationid = $this->optional_param('annotationid', null, PARAM_INT);
        $data->shape = $this->optional_param('shape', null, PARAM_TEXT);
        $data->bgcolor = $this->optional_param('bgcolor', null, PARAM_TEXT);
        $data->bordercolor = $this->optional_param('bordercolor', null, PARAM_TEXT);
        $data->borderwidth = $this->optional_param('borderwidth', null, PARAM_INT);
        $data->opacity = $this->optional_param('opacity', null, PARAM_INT);
        $data->rounded = $this->optional_param('rounded', null, PARAM_INT);
        $data->shadow = $this->optional_param('shadow', 0, PARAM_INT);
        $data->gotourl = $this->optional_param('gotourl', null, PARAM_URL);
        $data->timestamp = $this->optional_param('timestamp', null, PARAM_TEXT);
        $this->set_data($data);
    }

    /**
     * Form definition
     */
    public function definition() {
        $mform = $this->_form;
        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);
        $mform->addElement('hidden', 'id', 0);
        $mform->setType('id', PARAM_INT);
        $mform->addElement('hidden', 'annotationid', 0);
        $mform->setType('annotationid', PARAM_INT);

        $mform->addElement('select', 'shape', get_string('shape', 'ivplugin_inlineannotation'), [
            'rectangle' => get_string('rectangle', 'ivplugin_inlineannotation'),
            'circle' => get_string('circle', 'ivplugin_inlineannotation'),
        ]);
        $mform->setType('shape', PARAM_TEXT);
        $mform->addRule('shape', get_string('required'), 'required', null, 'client');
        $elementarray = [];
        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'rounded',
            '',
            get_string('rounded', 'ivplugin_inlineannotation'),
            ["group" => 1],
            [0, 1]
        );
        $mform->disabledIf('rounded', 'shape', 'neq', 'rectangle');

        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'shadow',
            '',
            get_string('shadow', 'ivplugin_inlineannotation'),
            ["group" => 1],
            [0, 1]
        );

        $mform->addGroup($elementarray, '', '');

        $mform->addElement('text', 'gotourl', get_string('gotourl', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('gotourl', PARAM_URL);
        $mform->addRule(
            'url',
            get_string('invalidurlformat', 'ivplugin_inlineannotation'),
            'regex',
            "/\b(?:(?:https?|ftp):\/\/|www\.)[-a-z0-9+&@#\/%?=~_|!:,.;]*\.[a-z]{2,}[-a-z0-9+&@#\/%=~_|]*/i",
            'client'
        );

        $mform->addElement(
            'text',
            'timestamp',
            get_string('gototimestamp', 'ivplugin_inlineannotation'),
            [
                'size' => 100,
                'placeholder' => '00:00:00',
            ]
        );
        $mform->setType('timestamp', PARAM_TEXT);
        $mform->setDefault('timestamp', '00:00:00');
        $mform->addRule(
            'timestamp',
            get_string('invalidtimestamp', 'mod_interactivevideo'),
            'regex',
            '/^([0-9]{1,2}:)?[0-5]?[0-9]:[0-5][0-9]$/',
            'client'
        );

        $mform->addElement(
            'text',
            'bgcolor',
            get_string('bgcolor', 'ivplugin_inlineannotation') .
                '<span class="color-picker ml-2" style="background-color: ' .
                $this->optional_param('bgcolor', '#000', PARAM_TEXT) .
                '"><input type="color"></span>',
            ['size' => 100]
        );
        $mform->setType('bgcolor', PARAM_TEXT);
        $mform->addRule('bgcolor', get_string('required'), 'required', null, 'client');
        $mform->setDefault('bgcolor', '#000');

        $mform->addElement(
            'text',
            'bordercolor',
            get_string('bordercolor', 'ivplugin_inlineannotation') .
                '<span class="color-picker ml-2" style="background-color: ' .
                $this->optional_param('bordercolor', '#000', PARAM_TEXT) .
                '"><input type="color"></span>',
            ['size' => 100]
        );
        $mform->setType('bordercolor', PARAM_TEXT);
        $mform->addRule('bordercolor', get_string('required'), 'required', null, 'client');
        $mform->setDefault('bordercolor', '#000');

        $mform->addElement('text', 'borderwidth', get_string('borderwidth', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('borderwidth', PARAM_INT);
        $mform->addRule('borderwidth', get_string('required'), 'required', null, 'client');
        $mform->addRule('borderwidth', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client');
        $mform->addRule('borderwidth', get_string('maximum', 'mod_interactivevideo', 5), 'maxlength', 5, 'client');
        $mform->addRule('borderwidth', get_string('minimum', 'mod_interactivevideo', 0), 'minlength', 0, 'client');
        $mform->setDefault('borderwidth', 1);

        $mform->addElement('text', 'opacity', get_string('opacity', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('opacity', PARAM_INT);
        $mform->addRule('opacity', get_string('required'), 'required', null, 'client');
        $mform->addRule('opacity', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client');
        $mform->addRule('opacity', get_string('maximum', 'mod_interactivevideo', 100), 'maxlength', 100, 'client');
        $mform->addRule('opacity', get_string('minimum', 'mod_interactivevideo', 0), 'minlength', 0, 'client');
        $mform->setDefault('opacity', 100);

        $mform->addElement('hidden', 'resizable', 0);

        $this->set_display_vertical();
    }

    /**
     * Processes dynamic submission
     * @return object
     */
    public function process_dynamic_submission() {
        $fromform = $this->get_data();
        return $fromform;
    }

    /**
     * Validates form data
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files) {
        $errors = [];
        return $errors;
    }

    /**
     * Returns page URL for dynamic submission
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/mod/interactivevideo/interactions.php', [
            'id' => $this->optional_param('annotationid', null, PARAM_INT),
        ]);
    }
}

