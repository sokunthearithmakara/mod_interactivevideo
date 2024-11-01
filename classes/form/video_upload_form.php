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

namespace mod_interactivevideo\form;
use moodle_url;

/**
 * Class video_upload_form
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class video_upload_form extends \core_form\dynamic_form {
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
        require_capability('mod/interactivevideo:edit', $this->get_context_for_dynamic_submission());
    }

    /**
     * Sets data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = new \stdClass();
        $data->id = $this->optional_param('id', 0, PARAM_INT);
        $data->contextid = $this->optional_param('contextid', null, PARAM_INT);
        $data->usercontextid = $this->optional_param('usercontextid', null, PARAM_INT);
        $this->set_data($data);
    }

    /**
     * Process dynamic submission
     *
     * @return \stdClass
     */
    public function process_dynamic_submission() {

        $fromform = $this->get_data();

        // Save files.
        if (!empty($fromform->video)) {
            $fs = get_file_storage();
            $files = $fs->get_area_files(
                $fromform->usercontextid,
                'user',
                'draft',
                $fromform->video,
                'filesize DESC',
            );
            $fromform->files = $files;
            $file = reset($files);
            if (!$file) {
                $fromform->url = new moodle_url('');
            } else {
                $downloadurl = moodle_url::make_draftfile_url(
                    $file->get_itemid(),
                    $file->get_filepath(),
                    $file->get_filename()
                )->out();
                $fromform->name = $file->get_filename();
                $fromform->url = $downloadurl;
            }
        }
        return $fromform;
    }

    /**
     * Defines form elements
     */
    public function definition() {
        $mform = &$this->_form;

        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);

        $mform->addElement('hidden', 'usercontextid', null);
        $mform->setType('usercontextid', PARAM_INT);

        $mform->addElement('hidden', 'id', null);
        $mform->setType('id', PARAM_INT);

        $mform->addElement('filemanager', 'video', '', '', $this->get_options());
        $mform->addRule('video', null, 'required');

        $this->set_display_vertical();
    }

    /**
     * Get filemanager options
     *
     * @return array
     */
    protected function get_options() {
        global $PAGE;
        $filemanageroptions = [
            'maxbytes'       => $PAGE->course->maxbytes,
            'subdirs'        => 0,
            'maxfiles'       => 1,
            'accepted_types' => ['html_video', 'html_audio'],
        ];
        return $filemanageroptions;
    }

    /**
     * Validation
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
     * Get page url for dynamic submission
     *
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/course/modedit.php', [
            'id' => $this->optional_param('id', null, PARAM_INT),
            "contextid" => $this->optional_param("contextid", null, PARAM_INT),
        ]);
    }
}
