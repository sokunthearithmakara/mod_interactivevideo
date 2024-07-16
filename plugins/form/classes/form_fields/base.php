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
 * Configuration form for adding/editing form element
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

 namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class base extends \core_form\dynamic_form {
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
     * Sets data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = new \stdClass();
        $this->set_data($data);
    }

    /**
     * Checks access for dynamic submission
     */
    protected function check_access_for_dynamic_submission(): void {
        require_capability('mod/interactivevideo:addinstance', $this->get_context_for_dynamic_submission());
    }

    /**
     * Sets default data
     */
    public function set_data_default() {
        $data = new \stdClass();
        $data->id = $this->optional_param('id', 0, PARAM_INT);
        $data->contextid = $this->optional_param('contextid', null, PARAM_INT);
        $data->annotationid = $this->optional_param('annotationid', null, PARAM_INT);
        $data->type = $this->optional_param('type', null, PARAM_TEXT);
        $data->label = $this->optional_param('label', null, PARAM_TEXT);
        $data->helptext = $this->optional_param('helptext', null, PARAM_RAW);
        $data->minlength = $this->optional_param('minlength', null, PARAM_INT);
        $data->maxlength = $this->optional_param('maxlength', null, PARAM_INT);
        $data->required = $this->optional_param('required', null, PARAM_INT);
        $data->regex = $this->optional_param('regex', null, PARAM_TEXT);
        $data->fields = $this->optional_param('fields', null, PARAM_TEXT);
        return $data;
    }

    /**
     * Definition
     *
     * @param null $option
     */
    public function definition($option = [
        'helptext' => true,
        'required' => true,
    ]) {
        $mform = $this->_form;
        $attributes = $mform->getAttributes();
        $attributes['data-name'] = 'fieldform-form';
        $attributes['class'] = $attributes['class'] . ' bg-white';
        $mform->setAttributes($attributes);

        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);
        $mform->addElement('hidden', 'id', 0);
        $mform->setType('id', PARAM_INT);
        $mform->addElement('hidden', 'annotationid', 0);
        $mform->setType('annotationid', PARAM_INT);
        $mform->addElement('hidden', 'type', null);
        $mform->setType('type', PARAM_TEXT);

        $mform->addElement('text', 'label', get_string('label', 'ivplugin_form'), ['size' => 100]);
        $mform->setType('label', PARAM_TEXT);
        $mform->addRule('label', get_string('required'), 'required', null, 'client');

        if ($option['required']) {
            $mform->addElement('advcheckbox', 'required', '', get_string('required', 'ivplugin_form'));
        }

        if ($option['helptext']) {
            $mform->addElement(
                'editor',
                'helptext',
                get_string('helptext', 'ivplugin_form'),
                ['rows' => 7],
                $this->editor_options()
            );
            $mform->setType('helptext', PARAM_RAW);
        }

        return $mform;
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
        $fromform->formattedlabel = format_string($fromform->label);
        return $fromform;
    }

    /**
     * Validation
     *
     * @param $data
     * @param $files
     * @return array
     */
    public function validation($data, $files) {
        $errors = [];
        return $errors;
    }

    /**
     * Editor options
     *
     * @return array
     */
    public function editor_options() {
        return [
            'maxfiles' => EDITOR_UNLIMITED_FILES,
            'maxbytes' => 0,
            'trusttext' => false,
            'context' => $this->get_context_for_dynamic_submission(),
        ];
    }

    /**
     * Get page URL for dynamic submission
     *
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/mod/interactivevideo/interactions.php', [
            'id' => $this->optional_param('annotationid', null, PARAM_INT),
        ]);
    }
}
