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
 * Class hotspot
 *
 * @package    ivplugin_inlineannotation
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hotspot extends \core_form\dynamic_form {
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
        $data->title = $this->optional_param('title', null, PARAM_TEXT);
        $data->color = $this->optional_param('color', null, PARAM_TEXT);
        $data->content = $this->optional_param('content', null, PARAM_RAW);
        $data->opacity = $this->optional_param('opacity', null, PARAM_INT);
        $data->url = $this->optional_param('url', null, PARAM_URL);
        $data->openbydefault = $this->optional_param('openbydefault', null, PARAM_INT);
        $data->usemodal = $this->optional_param('usemodal', null, PARAM_INT);
        $this->set_data($data);
    }

    /**
     * Defines form elements
     */
    public function definition() {
        $mform = $this->_form;
        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);
        $mform->addElement('hidden', 'id', 0);
        $mform->setType('id', PARAM_INT);
        $mform->addElement('hidden', 'annotationid', 0);
        $mform->setType('annotationid', PARAM_INT);

        $mform->addElement('text', 'title', get_string('title', 'mod_interactivevideo'), ['size' => 100]);
        $mform->setType('title', PARAM_TEXT);

        $mform->addElement('editor', 'content', get_string('content', 'ivplugin_inlineannotation'), null, [
            'maxfiles' => -1,
            'maxbytes' => 0,
            'trusttext' => true,
            'noclean' => true,
            'context' => $this->get_context_for_dynamic_submission(),
        ]);
        $mform->setType('content', PARAM_RAW);
        $mform->addRule('content', null, 'required', null, 'client');

        $mform->addElement(
            'advcheckbox',
            'usemodal',
            '',
            get_string('usemodal', 'ivplugin_inlineannotation'),
            null,
            [0, 1],
        );

        $mform->addElement(
            'advcheckbox',
            'openbydefault',
            '',
            get_string('openbydefault', 'ivplugin_inlineannotation'),
            null,
            [0, 1],
        );

        $mform->disabledIf('openbydefault', 'usemodal', 'checked');

        $mform->addElement('text', 'url', get_string('url', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('text', PARAM_URL);
        $mform->addRule(
            'url',
            get_string('invalidurlformat', 'ivplugin_inlineannotation'),
            'regex',
            "/\b(?:(?:https?|ftp):\/\/|www\.)[-a-z0-9+&@#\/%?=~_|!:,.;]*\.[a-z]{2,}[-a-z0-9+&@#\/%=~_|]*/i",
            'client'
        );

        $mform->addElement(
            'text',
            'color',
            get_string('color', 'ivplugin_inlineannotation') .
                '<span class="color-picker ml-2" style="background-color: ' .
                $this->optional_param('color', '#fff', PARAM_TEXT) .
                '"><input type="color"></span>',
            ['size' => 100]
        );
        $mform->setType('color', PARAM_TEXT);
        $mform->addRule('color', get_string('required'), 'required', null, 'client');
        $mform->setDefault('color', '#fff');

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

