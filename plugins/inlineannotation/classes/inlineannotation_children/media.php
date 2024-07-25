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
 * Dynamic form for adding/editing interactions content
 *
 * @package     ivplugin_inlineannotation
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class media extends \core_form\dynamic_form {
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
        global $CFG, $USER;
        $usercontextid = context_user::instance($USER->id)->id;
        $data = new \stdClass();
        $data->id = $this->optional_param('id', 0, PARAM_INT);
        $data->contextid = $this->optional_param('contextid', null, PARAM_INT);
        $data->annotationid = $this->optional_param('annotationid', null, PARAM_INT);
        $data->type = $this->optional_param('type', null, PARAM_TEXT);
        $data->url = $this->optional_param('url', null, PARAM_URL);
        $data->alttext = $this->optional_param('alttext', null, PARAM_TEXT);
        $data->resizable = $this->optional_param('resizable', 0, PARAM_INT);
        require_once($CFG->libdir . '/filelib.php');
        // At least one file exists in draft area already. we need to copy it to new draft area separately from other files of the same draft area.
        if ($data->url != '') {
            $urls = extract_draft_file_urls_from_text($data->url, false, $usercontextid, 'user', 'draft');
            $url = reset($urls);
            $filename = urldecode($url['filename']);
            $newdraftitemid = file_get_unused_draft_itemid();
            file_copy_file_to_file_area($url, $filename, $newdraftitemid);
        }

        $data->media = $newdraftitemid;
        $data->style = $this->optional_param('style', null, PARAM_TEXT);
        $data->rounded = $this->optional_param('rounded', 0, PARAM_INT);
        $data->autoplay = $this->optional_param('autoplay', 0, PARAM_INT);
        $data->shadow = $this->optional_param('shadow', 0, PARAM_INT);
        $data->label = $this->optional_param('label', null, PARAM_TEXT);
        $data->gotourl = $this->optional_param('gotourl', null, PARAM_URL);
        $data->timestamp = $this->optional_param('timestamp', '00:00:00', PARAM_TEXT);
        $this->set_data($data);
    }

    /**
     * Processes dynamic submission
     *
     * @return \stdClass
     */
    public function process_dynamic_submission() {
        global $USER;
        $usercontextid = context_user::instance($USER->id)->id;

        $fromform = $this->get_data();
        $fromform->usercontextid = $usercontextid;
        // Get the draft file.
        if (!empty($fromform->media)) {
            $fs = get_file_storage();
            $files = $fs->get_area_files(
                $fromform->usercontextid,
                'user',
                'draft',
                $fromform->media,
                'filesize DESC',
            );
            $fromform->files = $files;
            $file = reset($files);
            if ($file) {
                $downloadurl = moodle_url::make_draftfile_url(
                    $file->get_itemid(),
                    $file->get_filepath(),
                    $file->get_filename()
                )->out();
                // Replace pluginfile with draftfile.
                $fromform->url = $downloadurl;
            } else {
                $fromform->url = new moodle_url('');
            }
        }
        $fromform->formattedalttext = format_string($fromform->alttext);
        $fromform->formattedlabel = format_string($fromform->label);
        return $fromform;
    }

    /**
     * Defines form elements
     */
    public function definition() {
        global $PAGE;
        $mform = $this->_form;
        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);
        $mform->addElement('hidden', 'id', 0);
        $mform->setType('id', PARAM_INT);
        $mform->addElement('hidden', 'annotationid', 0);
        $mform->setType('annotationid', PARAM_INT);

        $type = $this->optional_param('type', null, PARAM_TEXT);
        // HTML upload.
        $filemanageroptions = [
            'maxbytes'       => $PAGE->course->maxbytes,
            'subdirs'        => 0,
            'maxfiles'       => 1,
        ];

        if ($type == 'audio') {
            $filemanageroptions['accepted_types'] = ['html_audio'];
        } else if ($type == 'video') {
            $filemanageroptions['accepted_types'] = ['html_video'];
        } else if ($type == 'image') {
            $filemanageroptions['accepted_types'] = ['web_image'];
        }

        $mform->addElement('hidden', 'type', $type);

        $mform->addElement('text', 'label', get_string('label', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('label', PARAM_TEXT);
        $mform->hideIf('label', 'type', 'neq', 'file');

        $mform->addElement(
            'filemanager',
            'media',
            '<i class="bi bi-upload mx-2"></i>' . get_string($type . 'file', 'ivplugin_inlineannotation'),
            null,
            $filemanageroptions
        );
        $mform->addRule('media', get_string('required'), 'required', null, 'client');

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
        $mform->setDefault('style', 'btn-primary');
        $mform->hideIf('style', 'type', 'in', ['video', 'image']);

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

        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'resizable',
            '',
            get_string('resizable', 'ivplugin_inlineannotation'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('resizable', 'type', 'eq', 'audio');
        $mform->hideIf('resizable', 'type', 'eq', 'file');

        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'autoplay',
            '',
            get_string('autoplay', 'ivplugin_inlineannotation'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('autoplay', 'type', 'eq', 'image');
        $mform->hideIf('autoplay', 'type', 'eq', 'file');

        $mform->addGroup($elementarray, '', '');

        $mform->addElement('text', 'alttext', get_string('alttext', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('alttext', PARAM_TEXT);
        $mform->hideIf('alttext', 'type', 'neq', 'image');

        $mform->addElement('text', 'gotourl', get_string('gotourl', 'ivplugin_inlineannotation'), ['size' => 100]);
        $mform->setType('gotourl', PARAM_URL);
        $mform->addRule(
            'url',
            get_string('invalidurlformat', 'ivplugin_inlineannotation'),
            'regex',
            "/\b(?:(?:https?|ftp):\/\/|www\.)[-a-z0-9+&@#\/%?=~_|!:,.;]*\.[a-z]{2,}[-a-z0-9+&@#\/%=~_|]*/i",
            'client'
        );
        $mform->hideIf('gotourl', 'type', 'neq', 'image');

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
        $mform->hideIf('timestamp', 'type', 'neq', 'image');
        $this->set_display_vertical();
    }

    /**
     * Validates form data
     *
     * @param array $data Form data
     * @param array $files Files
     * @return array
     */
    public function validation($data, $files) {
        $errors = [];
        if ($data['type'] == 'file' && empty($data['media'])) {
            $errors['media'] = get_string('required');
        }
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
