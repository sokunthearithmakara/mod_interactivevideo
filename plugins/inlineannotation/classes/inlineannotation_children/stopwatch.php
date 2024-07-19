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
 * Dynamic form for adding/editing interactions content
 *
 * @package     ivplugin_inlineannotation
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace ivplugin_inlineannotation\inlineannotation_children;

use context_user;
use moodle_url;

/**
 * Dynamic form for adding/editing stopwatch element
 *
 * @package     ivplugin_inlineannotation
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class stopwatch extends \core_form\dynamic_form {
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

        $data->duration = $this->optional_param('duration', null, PARAM_INT);
        $data->allowpause = $this->optional_param('allowpause', null, PARAM_INT);
        $data->style = $this->optional_param('style', null, PARAM_TEXT);
        $data->rounded = $this->optional_param('rounded', null, PARAM_INT);
        $data->shadow = $this->optional_param('shadow', 0, PARAM_INT);
        $data->playalarmsound = new \stdClass();
        $data->playalarmsound->playsoundatend = $this->optional_param('playsoundatend', null, PARAM_INT);
        $data->playalarmsound->playsoundatinterval = $this->optional_param('playsoundatinterval', null, PARAM_INT);
        $data->playalarmsound->intervaltime = $this->optional_param('intervaltime', null, PARAM_INT);

        $this->set_data($data);
    }

    /**
     * Process dynamic submission
     */
    public function process_dynamic_submission() {
        global $USER;
        $usercontextid = context_user::instance($USER->id)->id;

        $fromform = $this->get_data();
        $fromform->usercontextid = $usercontextid;

        return $fromform;
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

        $mform->addElement('text', 'duration', get_string('durationinminute', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('duration', PARAM_INT);
        $mform->addRule('duration', get_string('required'), 'required', null, 'client');
        $mform->addRule('duration', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client');
        $mform->addRule('duration', get_string('nonzero', 'mod_interactivevideo'), 'nonzero', null, 'client');
        $mform->setDefault('duration', 1);
        $mform->addElement(
            'advcheckbox',
            'allowpause',
            '',
            get_string('allowpause', 'ivplugin_inlineannotation'),
            null,
            [0, 1]
        );
        $mform->addElement('select', 'style', get_string('style', 'ivplugin_inlineannotation'), [
            'btn-danger' => get_string('danger', 'ivplugin_inlineannotation'),
            'btn-warning' => get_string('warning', 'ivplugin_inlineannotation'),
            'btn-success' => get_string('success', 'ivplugin_inlineannotation'),
            'btn-primary' => get_string('primary', 'ivplugin_inlineannotation'),
            'btn-secondary' => get_string('secondary', 'ivplugin_inlineannotation'),
            'btn-info' => get_string('info', 'ivplugin_inlineannotation'),
            'btn-light' => get_string('light', 'ivplugin_inlineannotation'),
            'btn-dark' => get_string('dark', 'ivplugin_inlineannotation'),
            'btn-outline-danger' => get_string('dangeroutline', 'ivplugin_inlineannotation'),
            'btn-outline-warning' => get_string('warningoutline', 'ivplugin_inlineannotation'),
            'btn-outline-success' => get_string('successoutline', 'ivplugin_inlineannotation'),
            'btn-outline-primary' => get_string('primaryoutline', 'ivplugin_inlineannotation'),
            'btn-outline-secondary' => get_string('secondaryoutline', 'ivplugin_inlineannotation'),
            'btn-outline-info' => get_string('infooutline', 'ivplugin_inlineannotation'),
            'btn-outline-light' => get_string('lightoutline', 'ivplugin_inlineannotation'),
            'btn-outline-dark' => get_string('darkoutline', 'ivplugin_inlineannotation'),
            'btn-transparent' => get_string('transparent', 'ivplugin_inlineannotation'),
        ]);

        $elementarray = [];
        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'rounded',
            '',
            get_string('rounded', 'ivplugin_inlineannotation'),
            ['group' => 1],
            [0, 1]
        );

        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'shadow',
            '',
            get_string('shadow', 'ivplugin_inlineannotation'),
            ['group' => 1],
            [0, 1]
        );

        $mform->addGroup($elementarray, '', '');

        $intervalelem = [];
        $intervalelem[] = $mform->createElement(
            'advcheckbox',
            'playsoundatend',
            '',
            get_string('playsoundatend', 'ivplugin_inlineannotation'),
            null,
            [0, 1]
        );
        $mform->setDefault(
            'playalarmsound[playsoundatend]',
            $this->optional_param('playalarmsound[playsoundatend]', 1, PARAM_INT)
        );
        $intervalelem[] = $mform->createElement(
            'advcheckbox',
            'playsoundatinterval',
            '',
            get_string('playsoundatinterval', 'ivplugin_inlineannotation'),
            null,
            [0, 1]
        );
        $mform->setDefault(
            'playalarmsound[playsoundatinterval]',
            $this->optional_param('playalarmsound[playsoundatinterval]', 1, PARAM_INT)
        );
        $intervalelem[] = $mform->createElement(
            'text',
            'intervaltime',
            get_string('numberofminutes', 'ivplugin_inlineannotation'),
            ['size' => 5]
        );
        $mform->setType('intervaltime', PARAM_INT);
        $mform->setDefault('playalarmsound[intervaltime]', $this->optional_param('playalarmsound[intervaltime]', 1, PARAM_INT));

        $mform->addGroup($intervalelem, 'playalarmsound', get_string('playalarmsound', 'ivplugin_inlineannotation'));
        $mform->addGroupRule(
            'playalarmsound',
            ['intervaltime' => [
                [get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client'],
                [get_string('nonzero', 'mod_interactivevideo'), 'nonzero', null, 'client'],
            ]]
        );
        $this->set_display_vertical();
    }

    /**
     * Validates form data
     *
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
     *
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/mod/interactivevideo/interactions.php', [
            'id' => $this->optional_param('annotationid', null, PARAM_INT),
        ]);
    }
}
